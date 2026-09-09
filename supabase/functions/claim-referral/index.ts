// Server-side one-shot binding of a new account to its referrer.
// The client may pass a slug from cookie/localStorage as a HINT only;
// the slug is re-validated server-side and the binding is immutable
// after first write.
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
    const slug = String(body.ref_slug ?? "").toLowerCase().trim();
    if (!slug) {
      return new Response(JSON.stringify({ ok: false, reason: "no_slug" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Already attributed? one-shot
    const { data: existing } = await admin
      .from("referral_attributions")
      .select("referred_user_id")
      .eq("referred_user_id", userId)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: false, reason: "already_attributed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the slug server-side
    const { data: code } = await admin
      .from("discount_codes")
      .select("id, owner_user_id, is_referral, is_active")
      .or(`short_code.eq.${slug},code.eq.${slug.toUpperCase()}`)
      .eq("is_referral", true)
      .eq("is_active", true)
      .maybeSingle();

    if (!code) {
      return new Response(JSON.stringify({ ok: false, reason: "invalid_slug" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (code.owner_user_id === userId) {
      return new Response(JSON.stringify({ ok: false, reason: "self_referral" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: insErr } = await admin
      .from("referral_attributions")
      .insert({ referred_user_id: userId, referral_code_id: code.id });
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, code_id: code.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("claim-referral error:", err);
    return new Response(JSON.stringify({ ok: false, reason: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
