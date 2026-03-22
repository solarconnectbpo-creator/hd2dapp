/**
 * POST /api/ai/roof-damage — vision-assisted draft of damage types, severity, and action from roof photos.
 */

interface Env {
  OPENAI_API_KEY?: string;
}

type RoofDamageAiBody = {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
  /** Free text: address, stated roof type, user hints */
  context?: string;
};

const DAMAGE_TYPES = [
  "Hail",
  "Wind",
  "Missing Shingles",
  "Leaks",
  "Flashing",
  "Structural",
] as const;

type DamageType = (typeof DAMAGE_TYPES)[number];

const RECOMMENDED_ACTIONS = [
  "Repair",
  "Replace",
  "Insurance Claim Help",
  "Further Inspection",
] as const;

type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

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

function normalizeDamageTypes(raw: unknown): DamageType[] {
  if (!Array.isArray(raw)) return ["Hail"];
  const out: DamageType[] = [];
  for (const x of raw) {
    const s = String(x).trim();
    if ((DAMAGE_TYPES as readonly string[]).includes(s)) {
      out.push(s as DamageType);
    }
  }
  const deduped = [...new Set(out)];
  return deduped.length ? deduped : ["Hail"];
}

function clampSeverity(raw: unknown): 1 | 2 | 3 | 4 | 5 {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw.replace(/\D/g, "").slice(0, 1), 10)
        : NaN;
  if (!Number.isFinite(n)) return 3;
  const c = Math.max(1, Math.min(5, Math.round(n)));
  return c as 1 | 2 | 3 | 4 | 5;
}

function normalizeRecommendedAction(raw: unknown): RecommendedAction {
  const s = typeof raw === "string" ? raw.trim() : "";
  if ((RECOMMENDED_ACTIONS as readonly string[]).includes(s)) {
    return s as RecommendedAction;
  }
  const lower = s.toLowerCase();
  if (lower.includes("insurance") || lower.includes("claim")) {
    return "Insurance Claim Help";
  }
  if (lower.includes("replace")) return "Replace";
  if (lower.includes("repair")) return "Repair";
  if (
    lower.includes("further") ||
    lower.includes("inspect") ||
    lower.includes("unknown")
  ) {
    return "Further Inspection";
  }
  return "Further Inspection";
}

function optString(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max);
}

export async function handleRoofDamageAi(
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

  let body: RoofDamageAiBody;
  try {
    body = (await request.json()) as RoofDamageAiBody;
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
    typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
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
      ? body.context.trim().slice(0, 2500)
      : "";

  const allowedList = DAMAGE_TYPES.join(", ");
  const actionList = RECOMMENDED_ACTIONS.join(", ");

  const userParts: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" } }
  > = [
    {
      type: "text",
      text: `You assist roofing contractors with preliminary documentation from photos.

Analyze this roof / exterior image for visible storm or wear damage relevant to insurance-style roof reports.

Return ONLY valid JSON (no markdown) with exactly these keys:
- damageTypes: string[] — choose zero or more from this EXACT list only: [${allowedList}]. Use [] only if the roof is not visible or damage cannot be assessed.
- severity: integer 1–5 — 1 cosmetic/light, 5 severe / structural concern or widespread loss.
- recommendedAction: string — exactly one of: [${actionList}]
- notes: string — 2–4 sentences: what you observe, caveats (distance, angle, lighting), and that a physical inspection is required. Empty string if roof not visible.
- summary: string — one sentence headline for the report.

Rules:
- Be conservative: if unsure, lower severity and prefer "Further Inspection" or "Insurance Claim Help" as appropriate.
- Do not claim engineering or legal conclusions; this is a visual assist only.
- Satellite-only views: acknowledge limited certainty.
${context ? `\nContext: ${context}` : ""}`,
    },
  ];

  if (imageUrl) {
    userParts.push({
      type: "image_url",
      image_url: { url: imageUrl, detail: "high" },
    });
  } else {
    const dataUrl = `data:${mimeType};base64,${b64}`;
    userParts.push({
      type: "image_url",
      image_url: { url: dataUrl, detail: "high" },
    });
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You classify visible roof damage for contractor workflows. Reply with JSON only; use only allowed enum strings for damageTypes and recommendedAction.",
        },
        { role: "user", content: userParts },
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

  const damageTypes = normalizeDamageTypes(parsed.damageTypes);
  const severity = clampSeverity(parsed.severity);
  const recommendedAction = normalizeRecommendedAction(
    parsed.recommendedAction,
  );
  const notes = optString(parsed.notes, 1200);
  const summary = optString(parsed.summary, 400);

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        damageTypes,
        severity,
        recommendedAction,
        notes,
        summary: summary || "AI draft — verify on site.",
        model: "gpt-4o-mini",
      },
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
