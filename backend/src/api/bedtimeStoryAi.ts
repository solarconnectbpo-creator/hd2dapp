/**
 * POST /api/ai/bedtime-story
 * Simple OpenAI Responses API demo endpoint.
 */

interface Env {
  OPENAI_API_KEY?: string;
}

type Body = {
  prompt?: string;
  model?: string;
};

function firstOutputText(r: any): string {
  const direct = typeof r?.output_text === "string" ? r.output_text : "";
  if (direct.trim()) return direct.trim();
  const out = Array.isArray(r?.output) ? r.output : [];
  for (const item of out) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string" && c.text.trim()) return c.text.trim();
      if (typeof c?.output_text === "string" && c.output_text.trim())
        return c.output_text.trim();
    }
  }
  return "";
}

export async function handleBedtimeStoryAi(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (!env.OPENAI_API_KEY?.trim()) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "OPENAI_API_KEY is not configured on the server",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    // allow empty body
  }

  const prompt =
    typeof body.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim().slice(0, 1000)
      : "Write a short bedtime story about a unicorn.";
  const model =
    typeof body.model === "string" && body.model.trim()
      ? body.model.trim().slice(0, 80)
      : "gpt-5.4";

  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: prompt,
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return new Response(
      JSON.stringify({
        success: false,
        error: `OpenAI error ${upstream.status}`,
        detail: err.slice(0, 500),
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const json = (await upstream.json()) as any;
  const outputText = firstOutputText(json);
  return new Response(
    JSON.stringify({
      success: true,
      data: { outputText, model, prompt },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

