import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin or super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    // Check super_admin employee
    const { data: superAdminData } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("user_id", caller.id)
      .eq("sub_role", "super_admin")
      .eq("status", "active")
      .maybeSingle();

    if (!roleData && !superAdminData) return json({ error: "Admin or Super Admin only" }, 403);

    const { employee_id } = await req.json();
    if (!employee_id) return json({ error: "employee_id required" }, 400);

    // Fetch employee record
    const { data: employee, error: fetchErr } = await supabaseAdmin
      .from("employees")
      .select("id, user_id, invited_email")
      .eq("id", employee_id)
      .single();

    if (fetchErr || !employee) return json({ error: "Employee not found" }, 404);

    // Prevent self-deletion
    if (employee.user_id === caller.id) {
      return json({ error: "Cannot delete yourself" }, 400);
    }

    const userId = employee.user_id;

    // Delete auth account first so we never leave a hidden duplicate behind.
    if (userId) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authErr) {
        console.error("Failed to delete auth user:", authErr.message);
        return json({ error: `Failed to delete auth account: ${authErr.message}` }, 500);
      }

      const cleanupResults = await Promise.all([
        supabaseAdmin.from("user_roles").delete().eq("user_id", userId),
        supabaseAdmin.from("profiles").delete().eq("user_id", userId),
        supabaseAdmin.from("user_sessions").delete().eq("user_id", userId),
        supabaseAdmin.from("trusted_devices").delete().eq("user_id", userId),
      ]);

      for (const result of cleanupResults) {
        if (result.error) {
          throw result.error;
        }
      }
    }

    const [permissionsDelete, employeeDelete] = await Promise.all([
      supabaseAdmin.from("employee_permissions").delete().eq("employee_id", employee_id),
      supabaseAdmin.from("employees").delete().eq("id", employee_id),
    ]);

    if (permissionsDelete.error) {
      throw permissionsDelete.error;
    }

    if (employeeDelete.error) {
      throw employeeDelete.error;
    }

    return json({ success: true, message: "Employee fully deleted" });
  } catch (err) {
    console.error("delete-employee error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
