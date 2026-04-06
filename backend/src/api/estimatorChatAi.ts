/**
 * POST /api/ai/estimator-chat — conversational assistant that can suggest FormState / ProposalState patches.
 * Patches are whitelisted server-side; client should merge with the same rules.
 */

interface Env {
  OPENAI_API_KEY?: string;
}

const FORM_PATCH_KEYS = new Set<string>([
  "address",
  "stateCode",
  "latitude",
  "longitude",
  "roofType",
  "roofStructure",
  "stories",
  "exteriorWallHeightFt",
  "areaSqFt",
  "perimeterFt",
  "roofPitch",
  "wastePercent",
  "measuredSquares",
  "ridgesFt",
  "eavesFt",
  "rakesFt",
  "valleysFt",
  "hipsFt",
  "wallFlashingFt",
  "stepFlashingFt",
  "othersFt",
  "severity",
  "damageTypes",
  "carrierScopeText",
  "carrierBenchmarkProfileId",
  "carrierBenchmarkRegionFactor",
  "carrierBenchmarkComplexityFactor",
  "deductibleUsd",
  "nonRecDepUsd",
  "propertyRecordNotes",
  "estimateAddonModBitDetailed",
  "estimateAddonDryInSq",
  "estimateAddonGutterLf",
  "estimateAddonGcAllowanceUsd",
  "estimateAddonCopperLf",
  "estimateAddonFreightEa",
  "estimateAddonEngineeringEa",
  "estimateAddonSidingSf",
  "estimateAddonWindowEa",
  "estimateAddonTrimLf",
  "estimateAddonTileLoadSq",
  "estimateAddonTileInstallSq",
]);

const PROPOSAL_PATCH_KEYS = new Set<string>([
  "clientName",
  "clientCompany",
  "clientEmail",
  "clientPhone",
  "companyName",
  "proposalTitle",
]);

const DAMAGE_ALLOWED = new Set([
  "Hail",
  "Wind",
  "Missing Shingles",
  "Leaks",
  "Flashing",
  "Structural",
]);

type ChatMessage = { role: "user" | "assistant"; content: string };

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

function sanitizeFormPatch(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!FORM_PATCH_KEYS.has(k)) continue;
    if (k === "severity") {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n) && n >= 1 && n <= 5) out[k] = Math.round(n);
      continue;
    }
    if (k === "damageTypes") {
      if (!Array.isArray(v)) continue;
      const tags = v
        .map((x) => String(x).trim())
        .filter((x) => DAMAGE_ALLOWED.has(x));
      if (tags.length) out[k] = tags;
      continue;
    }
    if (k === "roofStructure") {
      const s = typeof v === "string" ? v.trim() : "";
      if (
        s === "auto" ||
        s === "gable" ||
        s === "hip" ||
        s === "flat" ||
        s === "mansard" ||
        s === "complex"
      )
        out[k] = s;
      continue;
    }
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 8000) out[k] = t.slice(0, 8000);
      else if (t) out[k] = t;
    }
  }
  return out;
}

function sanitizeProposalPatch(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!PROPOSAL_PATCH_KEYS.has(k)) continue;
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 500) out[k] = t.slice(0, 500);
      else if (t) out[k] = t;
    }
  }
  return out;
}

export async function handleEstimatorChatAi(
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
      JSON.stringify({ success: false, error: "OPENAI_API_KEY is not configured on the server" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: { messages?: ChatMessage[]; formSnapshot?: unknown; proposalSnapshot?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawMsgs = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMsgs
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 12_000),
    }))
    .filter((m) => m.content);

  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    return new Response(
      JSON.stringify({ success: false, error: "Provide messages ending with a user turn" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const snapForm =
    body.formSnapshot && typeof body.formSnapshot === "object"
      ? JSON.stringify(body.formSnapshot).slice(0, 8000)
      : "{}";
  const snapProposal =
    body.proposalSnapshot && typeof body.proposalSnapshot === "object"
      ? JSON.stringify(body.proposalSnapshot).slice(0, 4000)
      : "{}";

  const system = `You are a helpful roofing estimator intake assistant for a web app.
Rules:
- Be concise. Ask one or two questions at a time when gathering missing info.
- Never guarantee insurance outcomes or legal results. No medical advice.
- You may suggest updates to the job form as JSON patches when the user provides facts (address, contact, measurements, damage, pitch, etc.).
- Only include formPatch / proposalPatch when you have concrete values from the conversation — not guesses.
- damageTypes must be only: Hail, Wind, Missing Shingles, Leaks, Flashing, Structural.
- severity is 1-5 (integer).
- roofStructure: auto | gable | hip | flat | mansard | complex.

Output MUST be a single JSON object with keys:
- "assistantMessage" (string, markdown allowed, max ~1200 chars)
- "formPatch" (object, optional — only whitelisted measurement form keys)
- "proposalPatch" (object, optional — clientName, clientCompany, clientEmail, clientPhone, companyName, proposalTitle)

Current form JSON (partial): ${snapForm}
Current proposal / client JSON (partial): ${snapProposal}`;

  const openaiMessages = [
    { role: "system" as const, content: system },
    ...messages.slice(-16).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: openaiMessages,
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

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = parseJson(content);
  const assistantMessage =
    typeof parsed.assistantMessage === "string" ? parsed.assistantMessage.trim().slice(0, 2000) : "";

  if (!assistantMessage) {
    return new Response(JSON.stringify({ success: false, error: "Model returned empty assistantMessage" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const formPatch = sanitizeFormPatch(parsed.formPatch);
  const proposalPatch = sanitizeProposalPatch(parsed.proposalPatch);

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        assistantMessage,
        formPatch,
        proposalPatch,
        model: "gpt-4o-mini",
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
