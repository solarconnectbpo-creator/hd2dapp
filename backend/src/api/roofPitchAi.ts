/**
 * POST /api/ai/roof-pitch — vision estimate of roof pitch (rise/run) from an image URL or base64 body.
 */

interface Env {
  OPENAI_API_KEY?: string;
}

type RoofPitchAiBody = {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  context?: string;
};

function parseJsonFromModelContent(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function optFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normalizeAiConfidence(raw: unknown): "low" | "medium" | "high" | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).toLowerCase();
  if (s === "high" || s === "medium" || s === "low") return s;
  return null;
}

function normalizePitch(input: string): string {
  const s = input.trim();
  const m = s.match(/(\d{1,2}(?:\.\d+)?)\s*[:/]\s*(\d{1,2}(?:\.\d+)?)/);
  if (m) return `${Number(m[1])}/${Number(m[2])}`;
  return s;
}

export async function handleRoofPitchAi(
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

  let body: RoofPitchAiBody;
  try {
    body = (await request.json()) as RoofPitchAiBody;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const imageUrl =
    typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const b64 =
    typeof body.imageBase64 === "string"
      ? body.imageBase64.replace(/\s/g, "").trim()
      : "";
  const mimeType =
    typeof body.mimeType === "string" && body.mimeType.trim()
      ? body.mimeType.trim()
      : "image/jpeg";

  if (!imageUrl && !b64) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Provide imageUrl or imageBase64",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (b64.length > 6_000_000) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "imageBase64 too large (max ~4.5MB encoded)",
      }),
      {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const context =
    typeof body.context === "string" && body.context.trim()
      ? body.context.trim().slice(0, 2000)
      : "";

  const userParts: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" } }
  > = [
    {
      type: "text",
      text: `You are assisting with property / roofing documentation. From this image (roof, aerial, or inspection photo), analyze what you can see.

Return ONLY valid JSON (no markdown) with exactly these keys:
- estimatePitch: string — US roof slope as rise per 12" horizontal run, e.g. "6/12" or "4/12".
- confidence: "low" | "medium" | "high" — for the pitch estimate.
- rationale: string — one short sentence about the pitch.
- estimateRoofAreaSqFt: number | null — total roof area in square feet ONLY if the image shows a reliable scale (dimension labels, measurement report overlay, visible tape measure with numbers, EagleView-style summary, etc.). Otherwise null. Do NOT invent sq ft from a plain photo with no scale.
- estimateRoofPerimeterFt: number | null — total roof edge length in feet under the same rules; otherwise null.
- measurementConfidence: "low" | "medium" | "high" | null — confidence for area/perimeter when both numbers are non-null; otherwise null.
- measurementRationale: string — brief note: why measurements were given or why null (e.g. "no scale visible").

Rules:
- If no roof is visible in the image, set estimatePitch to "unknown" and confidence "low".
- If any roof is visible, estimate pitch from roof lines, shadows, or context (e.g. typical residential 4/12–9/12); use confidence "low" when uncertain but still output a numeric slope like "6/12".
- Never claim legal/engineering certification; approximate visual estimates only.
- Prefer null measurements over guessing area from a single unscaled photo or satellite without dimensions.
${context ? `\nContext from user: ${context}` : ""}`,
    },
  ];

  if (imageUrl) {
    userParts.push({
      type: "image_url",
      image_url: { url: imageUrl, detail: "low" },
    });
  } else {
    const dataUrl = `data:${mimeType};base64,${b64}`;
    userParts.push({
      type: "image_url",
      image_url: { url: dataUrl, detail: "low" },
    });
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
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
              "You estimate roof pitch and optional scaled measurements from images for internal contractor workflows. Reply with JSON only; use null for measurements when scale is not visible. When any roof surface is visible, always output a best-effort estimatePitch as rise/12 (e.g. 6/12); reserve unknown only when no roof appears in the image.",
          },
          { role: "user", content: userParts },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI request failed";
    return new Response(
      JSON.stringify({
        success: false,
        error: "OpenAI request timed out or failed",
        detail: msg.slice(0, 300),
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!res.ok) {
    const errText = await res.text();
    return new Response(
      JSON.stringify({
        success: false,
        error: `OpenAI error ${res.status}`,
        detail: errText.slice(0, 500),
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonFromModelContent(content);
  const epVal = parsed.estimatePitch;
  let estimatePitchRaw = "";
  if (typeof epVal === "number" && Number.isFinite(epVal)) {
    estimatePitchRaw =
      epVal >= 0 && epVal <= 24 ? `${epVal}/12` : String(epVal).trim();
  } else {
    estimatePitchRaw = String(epVal ?? "").trim();
  }
  if (!estimatePitchRaw || estimatePitchRaw.toLowerCase() === "unknown") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Could not estimate pitch from this image",
        rationale:
          typeof parsed.rationale === "string" ? parsed.rationale : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const estimatePitch = normalizePitch(estimatePitchRaw);
  const confidenceRaw = String(parsed.confidence || "low").toLowerCase();
  const confidence =
    confidenceRaw === "high" ||
    confidenceRaw === "medium" ||
    confidenceRaw === "low"
      ? confidenceRaw
      : "low";

  const areaRaw = optFiniteNumber(parsed.estimateRoofAreaSqFt);
  const perimRaw = optFiniteNumber(parsed.estimateRoofPerimeterFt);
  const estimateRoofAreaSqFt =
    areaRaw !== null && areaRaw > 0 && areaRaw < 1_000_000
      ? Math.round(areaRaw)
      : null;
  const estimateRoofPerimeterFt =
    perimRaw !== null && perimRaw > 0 && perimRaw < 1_000_000
      ? Math.round(perimRaw)
      : null;

  let measurementConfidence = normalizeAiConfidence(
    parsed.measurementConfidence,
  );
  if (estimateRoofAreaSqFt === null && estimateRoofPerimeterFt === null) {
    measurementConfidence = null;
  } else if (measurementConfidence === null) {
    measurementConfidence = "low";
  }

  const measurementRationale =
    typeof parsed.measurementRationale === "string"
      ? parsed.measurementRationale.trim().slice(0, 500)
      : "";

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        estimatePitch,
        confidence,
        rationale:
          (typeof parsed.rationale === "string"
            ? parsed.rationale
            : ""
          ).trim() || "Visual estimate from image.",
        model: "gpt-4o-mini",
        estimateRoofAreaSqFt,
        estimateRoofPerimeterFt,
        measurementConfidence,
        measurementRationale: measurementRationale || undefined,
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
