/**
 * POST /api/ai/roof-report-language — short homeowner-facing line for scheduling inspection.
 * MUST NOT invent dollar amounts; only restates facts provided in context.
 */

interface Env {
  OPENAI_API_KEY?: string;
}

type Body = {
  context?: string;
  /** Exact range text provided by app, e.g. "$10,000 - $15,000" */
  estimateRangeExact?: string;
  companyName?: string;
  propertyAddress?: string;
};

function parseJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function handleRoofReportLanguageAi(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!env.OPENAI_API_KEY?.trim()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "OPENAI_API_KEY is not configured on the server",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const context = typeof body.context === "string" ? body.context.trim().slice(0, 4000) : "";
  const estimateRangeExact =
    typeof body.estimateRangeExact === "string" ? body.estimateRangeExact.trim().slice(0, 200) : "";
  const companyName =
    typeof body.companyName === "string" ? body.companyName.trim().slice(0, 120) : "our team";
  const propertyAddress =
    typeof body.propertyAddress === "string" ? body.propertyAddress.trim().slice(0, 300) : "";

  if (!context && !estimateRangeExact) {
    return new Response(
      JSON.stringify({ success: false, error: "Provide context or estimateRangeExact" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userText = `Write ONE short paragraph (2-3 sentences max) inviting the homeowner to schedule an on-site roof inspection.

Rules:
- Return ONLY valid JSON with key "clientMessage" (string).
- Do NOT invent dollar amounts, square footage, or measurements. If a dollar range is provided below, you may repeat it EXACTLY once as given — never change numbers.
- Do not promise insurance approval or legal outcomes.
- Professional, friendly, local-contractor tone.

Company: ${companyName}
Property: ${propertyAddress || "see report"}

${estimateRangeExact ? `Exact preliminary range (copy verbatim if mentioned): ${estimateRangeExact}` : "No dollar range provided — do not mention price."}

Additional context:
${context || "(none)"}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write scheduling CTAs for roofing companies. Output JSON only with key clientMessage. Never invent numbers.",
        },
        { role: "user", content: userText },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(
      JSON.stringify({
        success: false,
        error: `OpenAI error ${res.status}`,
        detail: errText.slice(0, 500),
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(content);
  const clientMessage =
    typeof parsed.clientMessage === "string" ? parsed.clientMessage.trim().slice(0, 800) : "";

  if (!clientMessage) {
    return new Response(
      JSON.stringify({ success: false, error: "Model returned empty clientMessage" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { clientMessage, model: "gpt-4o-mini" },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
