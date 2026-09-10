import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_SEND = 3;
const RATE_LIMIT_MAX_VERIFY = 10;

function isRateLimited(identifier: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > max;
}

function normalizePhone(phone: string): string {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "880" + p.substring(1);
  else if (!p.startsWith("880")) p = "880" + p;
  return p;
}

// Project tag — used in all logs and SMS metadata so we can distinguish
// Shaharia Math traffic from other apps sharing the same MIM SMS account.
const PROJECT_TAG = "[ShahariaMath]";

function serializeError(error: unknown) {
  return {
    success: false,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
  };
}

async function sendSmsMimSms(phone: string, message: string): Promise<boolean> {
  const apiKey = Deno.env.get("MIM_SMS_API_KEY");
  const username = Deno.env.get("MIM_SMS_USERNAME");
  const senderName = Deno.env.get("MIM_SMS_SENDER_NAME") || "8809643901370";

  console.log(`${PROJECT_TAG} MIM env checks:`, JSON.stringify({
    MIM_SMS_API_KEY: Boolean(apiKey),
    MIM_SMS_USERNAME: Boolean(username),
    MIM_SMS_SENDER_NAME: Boolean(Deno.env.get("MIM_SMS_SENDER_NAME")),
  }));

  if (!apiKey || !username) {
    console.error(`${PROJECT_TAG} MIM SMS credentials not configured (need API key, username)`);
    return false;
  }

  try {
    console.log(`${PROJECT_TAG} Sending OTP SMS via MIM (sender=${senderName}) to ${phone}`);
    const mimRequestBody = {
      UserName: username,
      Apikey: apiKey,
      MobileNumber: phone,
      Message: message,
      TransactionType: "T",
      SenderName: senderName,
    };
    const safeMimRequestBody = {
      UserName: username,
      MobileNumber: phone,
      Message: message,
      TransactionType: "T",
      SenderName: senderName,
    };
    console.log(`${PROJECT_TAG} MIM request body (secrets excluded):`, JSON.stringify(safeMimRequestBody));

    const res = await fetch("https://api.mimsms.com/api/SmsSending/SMS", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mimRequestBody),
    });

    console.log(`${PROJECT_TAG} MIM HTTP status for ${phone}:`, res.status);
    const rawBody = await res.text();
    console.log(`${PROJECT_TAG} MIM raw response body for ${phone}:`, rawBody);

    let data: Record<string, unknown> | null = null;
    try {
      data = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error(`${PROJECT_TAG} MIM response JSON parse error for ${phone}:`, parseErr);
    }
    console.log(`${PROJECT_TAG} MIM SMS parsed response for ${phone}:`, JSON.stringify(data));

    const normalizedData = Object.fromEntries(
      Object.entries(data ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
    );
    const statusCode = String(normalizedData.statuscode ?? "");
    const status = String(normalizedData.status ?? "").toLowerCase();
    const responseResult = String(normalizedData.responseresult ?? "").toLowerCase();

    return statusCode === "200" || status === "success" || responseResult.includes("sms send");
  } catch (err) {
    console.error(`${PROJECT_TAG} MIM SMS send error for ${phone}:`, err);
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

  try {
    const body = await req.json();
    const { phone, action, code } = body;

    if (!phone || !action) {
      return json({ error: "phone and action required" }, 400);
    }

    const normalizedPhone = normalizePhone(phone);
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    console.log(`${PROJECT_TAG} Supabase env checks:`, JSON.stringify({
      SUPABASE_URL: Boolean(supabaseUrl),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceRoleKey),
      OTP_DEMO_MODE: Deno.env.get("OTP_DEMO_MODE") ?? null,
    }));
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // ─── SEND OTP ───
    if (action === "send") {
      const deviceFp = body.device_fingerprint;
      if (deviceFp) {
        const { data: devCheck, error: devCheckErr } = await supabaseAdmin.rpc("check_student_device", {
          p_phone: normalizedPhone,
          p_device_fp: deviceFp,
        });
        if (!devCheckErr && devCheck && devCheck.device_status === "blocked") {
          console.warn(`${PROJECT_TAG} Pre-OTP device check BLOCKED for ${normalizedPhone} on device ${deviceFp}`);
          return json({
            error: devCheck.message || "This device is not authorized for this account.",
            device_blocked: true,
            active_device: devCheck.active_device,
          }, 403);
        }
      }
      if (isRateLimited(`send:${normalizedPhone}`, RATE_LIMIT_MAX_SEND) || isRateLimited(`send:ip:${clientIP}`, RATE_LIMIT_MAX_SEND)) {
        return json({ error: "Too many OTP requests. Please wait a minute." }, 429);
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Invalidate previous OTPs for this phone
      const invalidateResult = await supabaseAdmin
        .from("otp_codes")
        .update({ verified: true })
        .eq("phone", normalizedPhone)
        .eq("verified", false);
      console.log(`${PROJECT_TAG} DB invalidate previous OTPs result:`, JSON.stringify(invalidateResult));

      // Store new OTP
      const insertResult = await supabaseAdmin
        .from("otp_codes")
        .insert({ phone: normalizedPhone, code: otp });
      console.log(`${PROJECT_TAG} DB insert OTP result:`, JSON.stringify(insertResult));
      const { error: insertError } = insertResult;

      if (insertError) {
        console.error("OTP insert error:", insertError);
        return json({
          success: false,
          error: insertError.message,
          stack: null,
          details: insertError,
        }, 500);
      }

      // Demo mode removed to use real SMS directly.

      // Send OTP via MIM SMS — Web OTP API format for auto-fill
      const smsMessage = `Your Shaharia Math OTP is: ${otp}. Valid for 5 minutes.\n\n@shahariamath.com #${otp}`;
      const sent = await sendSmsMimSms(normalizedPhone, smsMessage);

      if (!sent) {
        console.error(`${PROJECT_TAG} Failed to send OTP SMS to ${normalizedPhone}`);
        return json({ error: "Failed to send OTP. Please try again later." }, 500);
      }

      return json({ success: true, message: "OTP sent successfully" });
    }

    // ─── VERIFY OTP ───
    if (action === "verify") {
      if (!code) return json({ error: "OTP code required" }, 400);

      if (isRateLimited(`verify:${normalizedPhone}`, RATE_LIMIT_MAX_VERIFY)) {
        return json({ error: "Too many attempts. Please request a new OTP." }, 429);
      }

      // Find the latest unverified OTP for this phone
      const otpFetchResult = await supabaseAdmin
        .from("otp_codes")
        .select("*")
        .eq("phone", normalizedPhone)
        .eq("verified", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      console.log(`${PROJECT_TAG} DB fetch latest OTP result:`, JSON.stringify(otpFetchResult));
      const { data: otpRecord, error: fetchErr } = otpFetchResult;

      if (fetchErr) {
        return json({ error: `Fetch error: ${fetchErr.message}` }, 500);
      }
      if (!otpRecord) {
        return json({ error: "No OTP found. Please request a new one." }, 400);
      }

      // Check expiry
      if (new Date(otpRecord.expires_at) < new Date()) {
        return json({ error: "OTP expired. Please request a new one." }, 400);
      }

      // Check max attempts (5)
      if (otpRecord.attempts >= 5) {
        const maxAttemptsUpdateResult = await supabaseAdmin.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);
        console.log(`${PROJECT_TAG} DB max-attempts mark verified result:`, JSON.stringify(maxAttemptsUpdateResult));
        return json({ error: "Too many failed attempts. Please request a new OTP." }, 400);
      }

      // Increment attempts
      const incrementAttemptsResult = await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: otpRecord.attempts + 1 })
        .eq("id", otpRecord.id);
      console.log(`${PROJECT_TAG} DB increment OTP attempts result:`, JSON.stringify(incrementAttemptsResult));

      if (String(otpRecord.code).trim() !== String(code).trim()) {
        return json({ error: "Invalid OTP" }, 400);
      }

      // Mark as verified
      const markVerifiedResult = await supabaseAdmin.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);
      console.log(`${PROJECT_TAG} DB mark OTP verified result:`, JSON.stringify(markVerifiedResult));

      // Check if student user exists with this phone (supports multiple formats)
      const rawDigits = phone.replace(/\D/g, "");
      const localPhone = rawDigits.startsWith("880")
        ? "0" + rawDigits.substring(3)
        : rawDigits.startsWith("0")
          ? rawDigits
          : "0" + rawDigits;
      const intlPhone = "+880" + localPhone.substring(1);
      const bareIntl = "880" + localPhone.substring(1);

      const candidatePhones = [...new Set([phone, localPhone, intlPhone, bareIntl, rawDigits])];
      const profileMatchesResult = await supabaseAdmin
        .from("profiles")
        .select("user_id, email, phone, updated_at")
        .in("phone", candidatePhones)
        .limit(25);
      console.log(`${PROJECT_TAG} DB profile matches result:`, JSON.stringify(profileMatchesResult));
      const { data: profileMatches, error: profileMatchesError } = profileMatchesResult;

      if (profileMatchesError) {
        console.error("Profile lookup error:", profileMatchesError);
        return json({ error: `Failed to lookup account: ${profileMatchesError.message}` }, 500);
      }

      let matchedProfile: { user_id: string; email: string } | null = null;

      if (profileMatches && profileMatches.length > 0) {
        const candidateUserIds = [...new Set(profileMatches.map((p) => p.user_id))];
        const studentRoleLookupResult = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("user_id", candidateUserIds)
          .eq("role", "student");
        console.log(`${PROJECT_TAG} DB student role lookup result:`, JSON.stringify(studentRoleLookupResult));
        const { data: studentRoles, error: studentRoleLookupError } = studentRoleLookupResult;

        if (studentRoleLookupError) {
          console.error("Student role lookup error:", studentRoleLookupError);
          return json({ error: "Failed to validate account role" }, 500);
        }

        const studentUserIds = new Set((studentRoles ?? []).map((r) => r.user_id));

        matchedProfile = (profileMatches ?? [])
          .filter((p) => studentUserIds.has(p.user_id))
          .sort((a, b) => {
            const score = (value: string) => {
              if (value === localPhone) return 3;
              if (value === intlPhone) return 2;
              if (value === bareIntl) return 1;
              return 0;
            };

            const scoreDiff = score(b.phone) - score(a.phone);
            if (scoreDiff !== 0) return scoreDiff;

            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          })[0] ?? null;
      }

      // Fallback: find user by deterministic mock email (digits@smc.student)
      if (!matchedProfile) {
        // Try both possible email formats
        const mockEmails = [...new Set([`s${rawDigits}@shahariamath.com`, `s${localPhone}@shahariamath.com`])];
        
        for (const mockEmail of mockEmails) {
          try {
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: "magiclink",
              email: mockEmail,
            });
            console.log(`${PROJECT_TAG} Auth fallback magiclink result for ${mockEmail}:`, JSON.stringify({
              hasUser: Boolean(linkData?.user),
              error: linkError,
            }));
            if (!linkError && linkData?.user) {
              matchedProfile = { user_id: linkData.user.id, email: mockEmail };
              break;
            }
          } catch (_) {
            // User doesn't exist with this email, continue
          }
        }
      }

      if (!matchedProfile) {
        return json({ verified: true, user_exists: false });
      }

      // Only treat as existing signup account when user has student role
      const roleLookupResult = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", matchedProfile.user_id);
      console.log(`${PROJECT_TAG} DB role lookup result:`, JSON.stringify(roleLookupResult));
      const { data: roles, error: roleError } = roleLookupResult;

      if (roleError) {
        console.error("Role lookup error:", roleError);
        return json({ error: "Failed to validate account role" }, 500);
      }

      const hasStudentRole = (roles ?? []).some((r) => r.role === "student");
      if (!hasStudentRole) {
        return json({ verified: true, user_exists: false });
      }

      // Resolve email: prefer mock email pattern, then profile email, then auth user email
      let userEmail = matchedProfile.email && matchedProfile.email.includes("@") ? matchedProfile.email : "";
      if (!userEmail) {
        const authUserResult = await supabaseAdmin.auth.admin.getUserById(matchedProfile.user_id);
        console.log(`${PROJECT_TAG} Auth get user by id result:`, JSON.stringify({
          hasUser: Boolean(authUserResult.data?.user),
          error: authUserResult.error,
        }));
        const { data: authUser } = authUserResult;
        userEmail = authUser?.user?.email || "";
      }
      // Last resort: construct mock email from phone
      if (!userEmail) {
        userEmail = `s${rawDigits}@shahariamath.com`;
      }

      if (!userEmail) {
        console.error("No email found for user:", matchedProfile.user_id);
        return json({ error: "No email associated with this account." }, 400);
      }

      // Generate a sign-in link for the user
      const signInLinkResult = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });
      console.log(`${PROJECT_TAG} Auth sign-in magiclink result:`, JSON.stringify({
        hasData: Boolean(signInLinkResult.data),
        error: signInLinkResult.error,
      }));
      const { data: signInData, error: signInError } = signInLinkResult;

      if (signInError || !signInData) {
        console.error("Sign-in link error:", signInError);
        return json({ error: "Authentication failed" }, 500);
      }

      const actionLink = signInData.properties?.action_link;
      const linkUrl = actionLink ? new URL(actionLink) : null;
      const tokenHash = signInData.properties?.hashed_token || linkUrl?.searchParams.get("token_hash");
      const type = linkUrl?.searchParams.get("type") || "magiclink";

      if (!tokenHash) {
        console.error("Missing token hash in generated link payload", signInData.properties);
        return json({ error: "Authentication token generation failed" }, 500);
      }

      return json({
        verified: true,
        user_exists: true,
        token_hash: tokenHash,
        type,
        email: matchedProfile.email,
      });
    }

    return json({ error: "Invalid action. Use 'send' or 'verify'." }, 400);
  } catch (err) {
    console.error("OTP error:", err);
    return json(serializeError(err), 500);
  }
});
