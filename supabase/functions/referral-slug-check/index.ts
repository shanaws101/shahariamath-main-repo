import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLUG_RE = /^[a-z0-9-]{4,20}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { slug } = await req.json();
    const normalized = String(slug ?? "").toLowerCase().trim();
    if (!SLUG_RE.test(normalized)) {
      return new Response(
        JSON.stringify({ available: false, reason: "invalid_format" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase.rpc("is_slug_available", { _slug: normalized });
    if (error) throw error;

    return new Response(
      JSON.stringify({ available: !!data, reason: data ? null : "taken" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ available: false, reason: "error", error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
