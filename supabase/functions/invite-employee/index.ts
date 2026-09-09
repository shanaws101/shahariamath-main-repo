import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

const SITE_URL = Deno.env.get("SITE_URL") || "https://shahariamath.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { email, sub_role, permissions } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const employeeSubRole = sub_role || "content_writer";

    // Check if employee already exists
    const { data: existing } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("invited_email", email)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Employee already invited" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const foundUser = existingUsers?.users?.find((u: any) => u.email === email);
    const userId: string | null = foundUser?.id || null;

    // Create employee record with sub_role
    const { data: employee, error: empError } = await supabaseAdmin
      .from("employees")
      .insert({
        invited_email: email,
        user_id: userId,
        status: userId ? "active" : "invited",
        sub_role: employeeSubRole,
      })
      .select()
      .single();

    if (empError) {
      return new Response(JSON.stringify({ error: empError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create permissions with provided values or defaults
    const permissionData: Record<string, any> = { employee_id: employee.id };
    if (permissions) {
      Object.assign(permissionData, permissions);
    }
    await supabaseAdmin
      .from("employee_permissions")
      .insert(permissionData);

    // Assign employee role if user exists
    if (userId) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "employee" }, { onConflict: "user_id,role" });
    }

    // Send branded invite email via Resend — redirect to admin signup with locked email
    const signupUrl = `${SITE_URL}/admin/signup?email=${encodeURIComponent(email)}`;

    const roleLabel = employeeSubRole === 'super_admin' ? 'Super Admin' : employeeSubRole === 'editor' ? 'Editor' : 'Content Writer';

    const logoUrl = `${SITE_URL}/logo.png`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #065f46 100%);padding:32px 40px;text-align:center;">
              <img src="${logoUrl}" alt="Shaharia Math" width="72" height="72" style="display:block;margin:0 auto 12px;border-radius:16px;background:#ffffff;padding:4px;" />
              <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;">Shaharia Math</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="color:#1a1a2e;font-size:20px;font-weight:600;margin:0 0 12px;">You're Invited! 🎉</h2>
              <p style="color:#4a4a68;font-size:15px;line-height:1.6;margin:0 0 20px;">
                You've been invited to join <strong>Shaharia Math</strong> as a <strong>${roleLabel}</strong>. Click the button below to create your account and get started.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 24px;">
                    <a href="${signupUrl}" style="display:inline-block;background:linear-gradient(135deg,#059669 0%,#065f46 100%);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background-color:#f8f9fb;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
                <p style="color:#6b6b80;font-size:13px;margin:0 0 4px;">Your email</p>
                <p style="color:#1a1a2e;font-size:14px;font-weight:500;margin:0;font-family:monospace;">${email}</p>
              </div>
              <div style="background-color:#f0f9ff;border-radius:8px;padding:16px 20px;margin-bottom:20px;border:1px solid #bae6fd;">
                <p style="color:#0369a1;font-size:13px;margin:0 0 4px;">Your Role</p>
                <p style="color:#0c4a6e;font-size:14px;font-weight:600;margin:0;">${roleLabel}</p>
              </div>
              <p style="color:#9898ad;font-size:13px;line-height:1.5;margin:0;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #eeeef0;text-align:center;">
              <p style="color:#b0b0c0;font-size:12px;margin:0;">
                © ${new Date().getFullYear()} Shaharia Math. All rights reserved.
              </p>
              <p style="color:#b0b0c0;font-size:12px;margin:4px 0 0;">
                <a href="${SITE_URL}" style="color:#059669;text-decoration:none;">Shaharia Math</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Shaharia Math <noreply@shahariamath.com>",
        to: [email],
        subject: "You're invited to join Shaharia Math!",
        html: emailHtml,
      }),
    });

    if (!resendRes.ok) {
      const resendError = await resendRes.text();
      console.error("Resend error:", resendError);
    }

    return new Response(JSON.stringify({ employee }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
