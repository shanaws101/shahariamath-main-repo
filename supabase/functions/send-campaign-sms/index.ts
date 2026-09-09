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
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userId = user.id;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json();
    const { campaign_id, message, phones, title } = body;

    if (!message || !phones || !Array.isArray(phones) || phones.length === 0) {
      return json({ error: "message and phones[] required" }, 400);
    }

    // Validate message length
    if (message.length > 500) {
      return json({ error: "Message too long (max 500 characters)" }, 400);
    }

    // Validate phone count
    if (phones.length > 5000) {
      return json({ error: "Too many recipients (max 5000)" }, 400);
    }

    const mimApiKey = Deno.env.get("MIM_SMS_API_KEY");
    const mimUsername = Deno.env.get("MIM_SMS_USERNAME");
    if (!mimApiKey || !mimUsername) {
      return json({ error: "SMS service not configured" }, 500);
    }

    // Update campaign status to sending
    if (campaign_id) {
      await supabaseAdmin
        .from("sms_campaigns")
        .update({ status: "sending", total_recipients: phones.length, sent_by: userId })
        .eq("id", campaign_id);
    }

    let sentCount = 0;
    let failedCount = 0;
    const batchSize = 10;

    // Send SMS in batches
    for (let i = 0; i < phones.length; i += batchSize) {
      const batch = phones.slice(i, i + batchSize);
      const promises = batch.map(async (phone: string) => {
        try {
          let p = phone.replace(/\D/g, "");
          if (p.startsWith("0")) p = "880" + p.substring(1);
          else if (!p.startsWith("880")) p = "880" + p;

          const sent = await sendSmsMimSms(p, message);
          if (sent) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(`SMS error for ${phone}:`, err);
          failedCount++;
        }
      });
      await Promise.all(promises);
    }

    // Update campaign with results
    if (campaign_id) {
      const finalStatus = sentCount > 0 ? "completed" : "failed";
      await supabaseAdmin
        .from("sms_campaigns")
        .update({
          status: finalStatus,
          sent_count: sentCount,
          failed_count: failedCount,
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);
    }

    return json({
      success: true,
      sent_count: sentCount,
      failed_count: failedCount,
      total: phones.length,
    });
  } catch (err) {
    console.error("Campaign SMS error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
