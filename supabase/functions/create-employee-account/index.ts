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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findAuthUserByEmail(
  supabaseAdmin: ReturnType<typeof createClient>,
  email: string,
) {
  const perPage = 200;

  for (let page = 1; page < 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) throw error;

    const matchedUser = data.users.find((user) => user.email?.toLowerCase() === email);
    if (matchedUser) return matchedUser;
    if (data.users.length < perPage) break;
  }

  return null;
}

async function purgeStaleStaffAccount(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  email: string,
) {
  const [rolesRes, employeeByUserRes, employeeByEmailRes] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("employees").select("id").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("employees").select("id").eq("invited_email", email).maybeSingle(),
  ]);

  if (rolesRes.error) throw rolesRes.error;
  if (employeeByUserRes.error) throw employeeByUserRes.error;
  if (employeeByEmailRes.error) throw employeeByEmailRes.error;

  const roles = rolesRes.data?.map(({ role }) => role) ?? [];
  const isClearlyStaleStaffAccount =
    roles.length === 0 ||
    roles.includes("employee") ||
    roles.includes("admin") ||
    !!employeeByUserRes.data ||
    !!employeeByEmailRes.data;

  if (roles.includes("student") && !roles.includes("employee") && !roles.includes("admin")) {
    return {
      purged: false,
      reason: "This email belongs to an existing student account.",
    };
  }

  if (!isClearlyStaleStaffAccount) {
    return {
      purged: false,
      reason: "This email address is already registered.",
    };
  }

  const cleanupResults = await Promise.all([
    supabaseAdmin.from("employee_permissions").delete().in(
      "employee_id",
      [employeeByUserRes.data?.id, employeeByEmailRes.data?.id].filter(Boolean) as string[]
    ),
    supabaseAdmin.from("employees").delete().eq("user_id", userId),
    supabaseAdmin.from("employees").delete().eq("invited_email", email),
    supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
    supabaseAdmin.from("profiles").delete().eq("user_id", userId),
    supabaseAdmin.from("user_sessions").delete().eq("user_id", userId),
    supabaseAdmin.from("trusted_devices").delete().eq("user_id", userId),
  ]);

  for (const result of cleanupResults) {
    if (result.error) throw result.error;
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authDeleteError) throw authDeleteError;

  return { purged: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
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
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) return json({ error: "Admin only" }, 403);

    const { email, password, name, phone, sub_role, permissions } = await req.json();
    const normalizedEmail = normalizeEmail(email ?? "");

    if (!normalizedEmail || !password) return json({ error: "Email and password are required" }, 400);
    if (password.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
    if (normalizedEmail.length > 255) return json({ error: "Email too long" }, 400);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) return json({ error: "Invalid email format" }, 400);

    const validSubRoles = ['content_writer', 'editor', 'super_admin'];
    const employeeSubRole = validSubRoles.includes(sub_role) ? sub_role : "content_writer";

    // Check if employee already exists
    const { data: existing } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("invited_email", normalizedEmail)
      .maybeSingle();

    if (existing) return json({ error: "Employee with this email already exists" }, 409);

    const createAuthUser = () =>
      supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: name || normalizedEmail, phone: phone || "", role: "employee" },
      });

    let { data: newUser, error: createError } = await createAuthUser();

    if (createError?.message?.toLowerCase().includes("already been registered")) {
      const existingAuthUser = await findAuthUserByEmail(supabaseAdmin, normalizedEmail);

      if (!existingAuthUser) {
        return json({ error: createError.message }, 409);
      }

      const purgeResult = await purgeStaleStaffAccount(supabaseAdmin, existingAuthUser.id, normalizedEmail);
      if (!purgeResult.purged) {
        return json({ error: purgeResult.reason }, 409);
      }

      const retryResult = await createAuthUser();
      newUser = retryResult.data;
      createError = retryResult.error;
    }

    if (createError || !newUser?.user) {
      return json({ error: createError?.message || "Failed to create employee account" }, 500);
    }

    const userId = newUser.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      user_id: userId,
      full_name: name || normalizedEmail,
      phone: phone || "",
      email: normalizedEmail,
    }, { onConflict: "user_id" });

    // Create employee record
    const { data: employee, error: empError } = await supabaseAdmin
      .from("employees")
      .insert({
        invited_email: normalizedEmail,
        user_id: userId,
        status: "active",
        sub_role: employeeSubRole,
      })
      .select()
      .single();

    if (empError) return json({ error: empError.message }, 500);

    // Create permissions - only allow known permission keys
    const allowedPermKeys = [
      'can_view_revenue', 'can_view_clicks', 'can_view_signups', 'can_view_enrollments',
      'can_manage_cms', 'can_manage_carousel', 'can_manage_students', 'can_manage_subjects',
      'can_manage_enrollments', 'can_manage_calendar', 'can_manage_discount_codes',
      'can_manage_referral_codes', 'can_manage_videos', 'can_manage_pdfs',
      'can_manage_analytics', 'can_manage_gallery', 'can_manage_subject_cms'
    ];
    const permissionData: Record<string, unknown> = { employee_id: employee.id };
    if (permissions && typeof permissions === 'object') {
      for (const key of allowedPermKeys) {
        if (key in permissions && typeof permissions[key] === 'boolean') {
          permissionData[key] = permissions[key];
        }
      }
    }
    await supabaseAdmin.from("employee_permissions").insert(permissionData);

    // Assign staff roles
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "employee" }, { onConflict: "user_id,role" });

    if (employeeSubRole === "super_admin") {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    }

    return json({ employee, message: "Account created successfully" });
  } catch (err) {
    return json({ error: "Internal server error" }, 500);
  }
});
