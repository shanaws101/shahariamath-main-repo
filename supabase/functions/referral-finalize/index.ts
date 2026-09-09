// Finalizes referral side-effects after a payment completes.
// SECURITY: the client only supplies payment_id. The referrer is looked up
// from the server-truth referral_attributions table — any referral_code_id
// in the request body is ignored. Idempotent on (payment_id).
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
    if (!paymentId) {
      return new Response(JSON.stringify({ ok: false, error: "no_payment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify payment ownership + completion
    const { data: payment } = await admin
      .from("payments")
      .select("id, user_id, status")
      .eq("id", paymentId)
      .maybeSingle();

    if (!payment || payment.user_id !== userId) {
      return new Response(JSON.stringify({ ok: false, error: "not_owner" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (payment.status !== "completed") {
      return new Response(JSON.stringify({ ok: false, error: "not_completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-truth referrer lookup
    const { data: attr } = await admin
      .from("referral_attributions")
      .select("referral_code_id")
      .eq("referred_user_id", userId)
      .maybeSingle();

    if (!attr) {
      return new Response(JSON.stringify({ ok: true, awarded: false, reason: "no_attribution" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: code } = await admin
      .from("discount_codes")
      .select("owner_user_id")
      .eq("id", attr.referral_code_id)
      .maybeSingle();

    if (!code?.owner_user_id || code.owner_user_id === userId) {
      return new Response(JSON.stringify({ ok: true, awarded: false, reason: "invalid_owner" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find an enrollment from this payment for ledger linkage
    const { data: enrollment } = await admin
      .from("enrollments")
      .select("id")
      .eq("payment_id", paymentId)
      .limit(1)
      .maybeSingle();

    const { error: awardErr } = await admin.rpc("award_referral_points", {
      _referrer: code.owner_user_id,
      _referred: userId,
      _enrollment: enrollment?.id ?? null,
      _payment: paymentId,
      _code_id: attr.referral_code_id,
    });
    if (awardErr) throw awardErr;

    return new Response(JSON.stringify({ ok: true, awarded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("referral-finalize error:", err);
    return new Response(JSON.stringify({ ok: false, error: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
