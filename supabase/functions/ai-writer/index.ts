const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }

  try {
    const { prompt, context, type } = await req.json();

    // Input validation
    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (prompt.length > 2000) {
      return new Response(JSON.stringify({ error: "Prompt too long (max 2000 characters)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (context && typeof context === 'string' && context.length > 5000) {
      return new Response(JSON.stringify({ error: "Context too long (max 5000 characters)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("AI service not configured");

    const validTypes = ['course_description', 'course_detail', 'faq_answer', 'faq_generate', 'cms_text', 'sms_message', 'syllabus', 'feature_list', 'general'];
    const safeType = validTypes.includes(type) ? type : 'general';

    const systemPrompts: Record<string, string> = {
      course_description: `You are a professional course content writer for an educational platform called "Shaharia Math & Commerce" in Bangladesh. Write compelling, clear course descriptions. Keep it concise (2-3 sentences). Write in the requested language. Focus on what students will gain.`,
      course_detail: `You are a professional course content writer. Write detailed course information sections like "Who is this for" or "How will it prepare you". Keep it 2-4 sentences. Write in the requested language.`,
      faq_answer: `You are a helpful FAQ writer for an educational platform. Write clear, concise answers to course-related questions. Keep answers to 1-3 sentences. Write in the requested language.`,
      faq_generate: `You are an FAQ generator for a Bangladeshi educational platform called "Shaharia Math & Commerce". Generate FAQs about university courses. For each FAQ output exactly this format:\nQ_EN: (question in English)\nQ_BN: (question in Bangla)\nA_EN: (answer in English)\nA_BN: (answer in Bangla)\n---\nSeparate each FAQ with ---. Make questions practical and relevant to students considering enrolling.`,
      cms_text: `You are a marketing copywriter for an educational platform called "Shaharia Math & Commerce". Write engaging website section headings and subheadings. Keep it concise and compelling. Write in the requested language.`,
      sms_message: `You are an SMS marketing writer. Write short, engaging promotional SMS messages for a Bangladeshi educational platform. Keep under 160 characters if possible. Use urgency and clear CTAs. Write in the requested language (Bangla or English).`,
      syllabus: `You are an academic syllabus writer for university-level BBA/MBA courses in Bangladesh. Generate structured syllabus points or learning outcomes. Write in the requested language.`,
      feature_list: `You are a course content writer. Generate concise feature points or learning outcomes for course listings. Each point should be 5-10 words. Write in the requested language.`,
      general: `You are a helpful AI writing assistant for an educational platform. Write clear, professional content as requested.`,
    };

    const systemPrompt = systemPrompts[safeType];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: context ? `Context: ${context}\n\n${prompt}` : prompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-writer error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
