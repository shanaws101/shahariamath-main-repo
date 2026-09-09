import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const REQUEST_TIMEOUT_MS = 30_000;

const BKASH_BASE_URL = Deno.env.get("BKASH_BASE_URL") || "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout";
const BKASH_USERNAME = Deno.env.get("BKASH_USERNAME") || "01949888858";
const BKASH_PASSWORD = Deno.env.get("BKASH_PASSWORD") || "N:vqXlB79_{";
const BKASH_APP_KEY = Deno.env.get("BKASH_APP_KEY") || "GIPfhA3cFEzLWL0Ko3kAuLjxtc";
const BKASH_APP_SECRET = Deno.env.get("BKASH_APP_SECRET") || "hjfjAzQvVHAyUuw8mEtN8BCFWh90iggGIbGkM9R3J3oX1SG3flk5";
const SITE_URL = Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "https://www.olisir.academy";



function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: location },
  });
}

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

function getBkashConfig() {
  if (!BKASH_USERNAME || !BKASH_PASSWORD || !BKASH_APP_KEY || !BKASH_APP_SECRET) {
    throw new Error("Payment service not configured. Please set bKash Supabase secrets.");
  }

  return {
    baseUrl: BKASH_BASE_URL,
    username: BKASH_USERNAME,
    password: BKASH_PASSWORD,
    appKey: BKASH_APP_KEY,
    appSecret: BKASH_APP_SECRET,
  };
}

function getBkashUrl(path: "token/grant" | "create" | "execute") {
  const baseUrl = BKASH_BASE_URL.replace(/\/+$/, "");
  if (baseUrl.endsWith("/tokenized/checkout")) return `${baseUrl}/${path}`;
  return `${baseUrl}/tokenized/checkout/${path}`;
}

function getAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service role configuration is missing.");
  return createClient(supabaseUrl, serviceRoleKey);
}

function sanitizeBkashText(value: unknown, fallback = "") {
  return String(value || fallback).replace(/[<>&]/g, "").slice(0, 255);
}

function logCaughtException(context: string, error: unknown) {
  console.error(`[bkash-payment] ${context}:`, error instanceof Error ? error.stack || error.message : error);
}

function redactBkashResponseBody(text: string) {
  if (!text) return text;

  try {
    const data = JSON.parse(text);
    const redact = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(redact);
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
            if (["id_token", "refresh_token", "token", "authorization"].includes(key.toLowerCase())) {
              return [key, "[REDACTED]"];
            }
            return [key, redact(nestedValue)];
          }),
        );
      }
      return value;
    };
    return JSON.stringify(redact(data));
  } catch {
    return text;
  }
}

async function readJsonResponse(res: Response, apiName: string) {
  const text = await res.text();
  console.log(`[bkash-payment] ${apiName} response status:`, res.status);
  console.log(`[bkash-payment] ${apiName} response body:`, redactBkashResponseBody(text));

  let data: Record<string, any> = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${apiName} returned a non-JSON response. Status: ${res.status}. Body: ${text.substring(0, 200)}`);
    }
  }

  if (!res.ok) {
    throw new Error(data.statusMessage || data.errorMessage || `${apiName} failed with HTTP ${res.status}`);
  }

  if (data.errorCode || data.errorMessage) {
    throw new Error(data.errorMessage || `${apiName} failed with error ${data.errorCode}`);
  }

  if (data.statusCode && data.statusCode !== "0000") {
    throw new Error(data.statusMessage || `${apiName} failed with status ${data.statusCode}`);
  }

  return data;
}

async function grantToken() {
  const config = getBkashConfig();
  const isSandbox = config.baseUrl.includes("sandbox");

  const admin = getAdminClient();

  if (!isSandbox) {
    try {
      const { data: tokenRecord, error: fetchError } = await admin
        .from("bkash_tokens")
        .select("*")
        .eq("id", "default")
        .single();

      if (!fetchError && tokenRecord) {
        const createdAt = new Date(tokenRecord.created_at).getTime();
        const expiresAt = createdAt + (tokenRecord.expires_in * 1000);
        
        if (Date.now() < expiresAt - 300_000) {
          console.log("[bkash-payment] Using cached bKash token.");
          return tokenRecord.id_token;
        }
      }
    } catch (error) {
      console.error("[bkash-payment] Error fetching cached token:", error);
    }
  }

  console.log("[bkash-payment] Grant Token request started.");
  const res = await fetch(getBkashUrl("token/grant"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: config.username,
      password: config.password,
    },
    body: JSON.stringify({
      app_key: config.appKey,
      app_secret: config.appSecret,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await readJsonResponse(res, "bKash Grant Token API");
  if (!data.id_token) throw new Error("bKash Grant Token API did not return id_token");

  try {
    const { error: upsertError } = await admin
      .from("bkash_tokens")
      .upsert({
        id: "default",
        id_token: String(data.id_token),
        refresh_token: String(data.refresh_token),
        expires_in: data.expires_in || 3600,
        created_at: new Date().toISOString(),
      });
    
    if (upsertError) {
      console.error("[bkash-payment] Failed to save bKash token to database:", upsertError);
    }
  } catch (error) {
    console.error("[bkash-payment] Error saving bKash token:", error);
  }

  return String(data.id_token);
}

async function createPayment(params: {
  amount: unknown;
  orderID: unknown;
  payerReference: unknown;
  fallbackPayerReference: string;
}) {
  const config = getBkashConfig();
  const token = await grantToken();
  const callbackURL = "https://hvxyiungdyaaladikecd.supabase.co/functions/v1/bkash-payment";

  console.log("[bkash-payment] Create Payment request started.");
  const res = await fetch(getBkashUrl("create"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": config.appKey,
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: sanitizeBkashText(params.payerReference, params.fallbackPayerReference),
      callbackURL,
      amount: String(params.amount),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: sanitizeBkashText(params.orderID),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const data = await readJsonResponse(res, "bKash Create Payment API");
  if (!data.paymentID || !data.bkashURL) throw new Error("bKash Create Payment API did not return paymentID and bkashURL");
  return data;
}

async function executePayment(paymentID: string) {
  const config = getBkashConfig();
  const token = await grantToken();

  console.log("[bkash-payment] Execute Payment request started.");
  const res = await fetch(getBkashUrl("execute"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": config.appKey,
    },
    body: JSON.stringify({ paymentID }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  return readJsonResponse(res, "bKash Execute Payment API");
}

async function completeLocalPayment(paymentID: string, executeData: Record<string, any>) {
  const admin = getAdminClient();
  const { data: payments, error: findError } = await admin
    .from("payments")
    .select("id, user_id, gateway_response")
    .filter("gateway_response->>bkash_payment_id", "eq", paymentID)
    .limit(1);

  if (findError) throw findError;
  const payment = payments?.[0];
  if (!payment) throw new Error("No local payment found for bKash paymentID");

  const isCompleted = executeData.statusCode === "0000" && executeData.transactionStatus === "Completed";
  const nextStatus = isCompleted ? "completed" : "failed";

  const { error: paymentError } = await admin
    .from("payments")
    .update({
      status: nextStatus,
      gateway_response: { ...(payment.gateway_response || {}), bkash_execute: executeData, trxID: executeData.trxID },
    })
    .eq("id", payment.id);
  if (paymentError) throw paymentError;

    if (isCompleted && payment.gateway_response?.subject_ids) {
    const subjectIds = payment.gateway_response.subject_ids as string[];
    if (subjectIds.length > 0) {
      const enrollments = subjectIds.map(sid => ({
        user_id: payment.user_id,
        subject_id: sid,
        payment_id: payment.id,
        payment_status: "completed",
      }));
      const { error: upsertError } = await admin.from("enrollments").upsert(enrollments, { onConflict: "user_id,subject_id" });
      if (upsertError) throw upsertError;
    }
  } else if (!isCompleted) {
    const { error: enrollmentError } = await admin.from("enrollments").update({ payment_status: nextStatus }).eq("payment_id", payment.id);
    if (enrollmentError) throw enrollmentError;
  }

  // Fulfill PDF Suggestion Purchases
  if (isCompleted && payment.gateway_response?.pdf_suggestion_ids) {
    const pdfIds = payment.gateway_response.pdf_suggestion_ids as string[];
    if (pdfIds.length > 0) {
      const pdfEnrollments = pdfIds.map(pid => ({
        user_id: payment.user_id,
        pdf_suggestion_id: pid,
        access_type: "paid",
        payment_id: payment.id,
        payment_status: "completed",
      }));
      try {
        await admin.from("pdf_suggestion_enrollments").upsert(pdfEnrollments, { onConflict: "user_id,pdf_suggestion_id,access_type" });
      } catch (err) {
        console.error("[bkash-payment] Error enrolling pdf suggestions:", err);
      }
    }
  } else if (!isCompleted) {
    try {
      await admin.from("pdf_suggestion_enrollments").update({ payment_status: nextStatus }).eq("payment_id", payment.id);
    } catch {}
  }

  return { paymentId: payment.id, isCompleted };
}

async function markLocalPaymentFailed(paymentID: string, statusReason: string) {
  const admin = getAdminClient();
  const { data: payments, error: findError } = await admin
    .from("payments")
    .select("id, gateway_response")
    .filter("gateway_response->>bkash_payment_id", "eq", paymentID)
    .limit(1);

  if (findError) throw findError;
  const payment = payments?.[0];
  if (!payment) return;

  const { error: paymentError } = await admin
    .from("payments")
    .update({
      status: "failed",
      gateway_response: { ...(payment.gateway_response || {}), bkash_callback_status: statusReason },
    })
    .eq("id", payment.id);
  if (paymentError) throw paymentError;

  const { error: enrollmentError } = await admin.from("enrollments").update({ payment_status: "failed" }).eq("payment_id", payment.id);
  try { await admin.from("pdf_suggestion_enrollments").update({ payment_status: "failed" }).eq("payment_id", payment.id); } catch {}
  if (enrollmentError) throw enrollmentError;
}

async function handleCallback(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const paymentID = url.searchParams.get("paymentID");

  if (!paymentID) return redirect(`${SITE_URL}/checkout?payment=failed`);

  if (status !== "success") {
    try {
      await markLocalPaymentFailed(paymentID, status || "failed");
    } catch (error) {
      logCaughtException("bKash callback failure update error", error);
    }
    return redirect(`${SITE_URL}/checkout?payment=failed`);
  }

  try {
    const executeData = await executePayment(paymentID);
    const { paymentId, isCompleted } = await completeLocalPayment(paymentID, executeData);
    if (isCompleted) return redirect(`${SITE_URL}/dashboard?payment=success&payment_id=${paymentId}`);
    return redirect(`${SITE_URL}/checkout?payment=failed&reason=incomplete_status`);
  } catch (error) {
    logCaughtException("bKash callback error", error);
    return redirect(`${SITE_URL}/checkout?payment=failed&reason=${encodeURIComponent(error instanceof Error ? error.message : "unknown_error")}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method === "GET") return handleCallback(req);

  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIP)) return jsonResponse({ success: false, error: "Too many requests. Please try again later." }, 429);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) throw new Error("Supabase auth configuration is missing.");

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const { action, ...params } = await req.json();

    if (action === "create") {
      const data = await createPayment({
        amount: params.amount,
        orderID: params.orderID,
        payerReference: params.payerReference,
        fallbackPayerReference: user.email || user.id,
      });

      if (params.paymentRecordId && data.paymentID) {
        const admin = getAdminClient();
        const { data: payment, error: selectError } = await admin
          .from("payments")
          .select("gateway_response")
          .eq("id", params.paymentRecordId)
          .eq("user_id", user.id)
          .single();
        if (selectError) throw selectError;

        const { error: updateError } = await admin
          .from("payments")
          .update({
            gateway_response: { ...(payment?.gateway_response || {}), bkash_payment_id: data.paymentID, bkash_create: data },
          })
          .eq("id", params.paymentRecordId)
          .eq("user_id", user.id);
        if (updateError) throw updateError;
      }

      return jsonResponse(data);
    }

    if (action === "execute") {
      if (!params.paymentID) return jsonResponse({ success: false, error: "paymentID is required" }, 400);
      return jsonResponse(await executePayment(String(params.paymentID)));
    }

    return jsonResponse({ success: false, error: "Invalid action" }, 400);
  } catch (error) {
    logCaughtException("bKash payment error", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : "Payment processing failed",
      stack: error instanceof Error ? error.stack : undefined,
    }, 200);
  }
});
