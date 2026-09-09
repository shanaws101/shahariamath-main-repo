import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

async function sendSmsMimSms(phone: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("MIM_SMS_API_KEY");
  const username = Deno.env.get("MIM_SMS_USERNAME");
  const senderName = Deno.env.get("MIM_SMS_SENDER_NAME") || "8809643901370";
  if (!apiKey || !username) return false;

  try {
    const res = await fetch("https://api.mimsms.com/api/SmsSending/SMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        UserName: username,
        Apikey: apiKey,
        MobileNumber: phone,
        Message: message,
        TransactionType: "T",
        SenderName: senderName,
      }),
    });

    const data = await res.json();
    console.log(`MIM SMS response for ${phone}:`, JSON.stringify(data));

    const statusCode = String(data?.statusCode ?? "");
    const status = String(data?.status ?? "").toLowerCase();

    return statusCode === "200" || status === "success";
  } catch (err) {
    console.error(`MIM SMS error for ${phone}:`, err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIP)) {
    return json({ error: "Too many requests. Please try again later." }, 429);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate caller — require admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return json({ error: "Admin access required" }, 403);
    }

    // Find campaigns that are scheduled and due
    const { data: dueCampaigns, error } = await supabase
      .from("sms_campaigns")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", new Date().toISOString());

    if (error) throw error;
    if (!dueCampaigns || dueCampaigns.length === 0) {
      return json({ message: "No campaigns due", processed: 0 });
    }

    const mimApiKey = Deno.env.get("MIM_SMS_API_KEY");
    const mimUsername = Deno.env.get("MIM_SMS_USERNAME");
    if (!mimApiKey || !mimUsername) {
      return json({ error: "SMS service not configured" }, 500);
    }

    let totalProcessed = 0;

    for (const campaign of dueCampaigns) {
      // Mark as sending
      await supabase
        .from("sms_campaigns")
        .update({ status: "sending" })
        .eq("id", campaign.id);

      // Resolve phone list
      let phones: string[] = [];
      const filter = campaign.recipient_filter as any;

      if (filter.custom && filter.phones) {
        phones = filter.phones;
      } else {
        // Re-fetch recipients based on stored filter
        let query = supabase.from("profiles").select("phone");

        if (filter.type === "department" && filter.department) {
          query = query.eq("department", filter.department);
        } else if (filter.type === "year" && filter.year) {
          query = query.eq("year", parseInt(filter.year));
        } else if (filter.type === "subject" && filter.subject) {
          const { data: enrollments } = await supabase
            .from("enrollments")
            .select("user_id")
            .eq("subject_id", filter.subject)
            .eq("payment_status", "completed");

          if (enrollments && enrollments.length > 0) {
            const userIds = enrollments.map((e: any) => e.user_id);
            query = query.in("user_id", userIds);
          }
        }

        const { data: profiles } = await query;
        if (profiles) {
          const unique = new Set<string>();
          profiles.forEach((p: any) => {
            if (p.phone) unique.add(p.phone);
          });
          phones = Array.from(unique);
        }
      }

      // Send SMS in batches
      let sentCount = 0;
      let failedCount = 0;
      const batchSize = 10;

      for (let i = 0; i < phones.length; i += batchSize) {
        const batch = phones.slice(i, i + batchSize);
        const promises = batch.map(async (phone: string) => {
          try {
            let p = phone.replace(/\D/g, "");
            if (p.startsWith("0")) p = "880" + p.substring(1);
            else if (!p.startsWith("880")) p = "880" + p;

            const sent = await sendSmsMimSms(p, campaign.message);
            if (sent) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch {
            failedCount++;
          }
        });
        await Promise.all(promises);
      }

      // Update campaign
      const finalStatus = sentCount > 0 ? "completed" : "failed";
      await supabase
        .from("sms_campaigns")
        .update({
          status: finalStatus,
          sent_count: sentCount,
          failed_count: failedCount,
          total_recipients: phones.length,
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);

      totalProcessed++;
    }

    return json({ message: "Done", processed: totalProcessed });
  } catch (err) {
    console.error("Scheduled SMS error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
