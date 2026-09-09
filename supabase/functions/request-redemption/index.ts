// Apply a points redemption to a pending payment.
// SECURITY: the client-supplied requested_points is treated as a HINT only.
// The RPC re-reads the user's actual balance and caps the deduction
// at min(requested, balance, payment.amount). Min 50 enforced server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "no_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "invalid_jwt" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const paymentId = String(body.payment_id ?? "");
    const requestedPoints = Math.floor(Number(body.requested_points ?? 0));

    if (!paymentId || !Number.isFinite(requestedPoints) || requestedPoints < 1) {
      return new Response(JSON.stringify({ applied_points: 0, applied_bdt: 0, error: "bad_input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin.rpc("apply_redemption", {
      _user: userId,
      _payment: paymentId,
      _requested_points: requestedPoints,
    });
    if (error) throw error;

    return new Response(JSON.stringify(data ?? { applied_points: 0, applied_bdt: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("request-redemption error:", err);
    return new Response(JSON.stringify({ applied_points: 0, applied_bdt: 0, error: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
