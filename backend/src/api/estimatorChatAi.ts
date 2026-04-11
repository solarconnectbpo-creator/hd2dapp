/**
 * POST /api/ai/estimator-chat — HD2D Copilot: conversational assistant (Claude or OpenAI) that can suggest
 * FormState / ProposalState patches. Patches are whitelisted server-side; client merges with the same rules.
 */

import { retryWithBackoffWhen } from "../utils/retry";

interface Env {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
}

const ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";
const OPENAI_MODEL = "gpt-4o-mini";

/** Recent turns sent to the model (both providers). */
const CHAT_HISTORY_TURNS = 28;
const SNAP_FORM_MAX = 12_000;
const SNAP_PROPOSAL_MAX = 6000;
const MAX_CONVERSATION_SUMMARY_CHARS = 2000;

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

export type CopilotMode = "general" | "estimate" | "damage" | "followup";

function parseJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = fence ? fence[1]!.trim() : trimmed;
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

function normalizeMode(raw: unknown): CopilotMode {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "estimate" || s === "damage" || s === "followup" || s === "general") return s;
  return "general";
}

function strField(form: Record<string, unknown>, key: string): string {
  const v = form[key];
  return typeof v === "string" ? v.trim() : "";
}

function numField(form: Record<string, unknown>, key: string): number | undefined {
  const v = form[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Compact JSON: only whitelisted form keys (for when full snapshot exceeds budget). */
function buildCompactFormSnapshot(form: Record<string, unknown>): string {
  const compact: Record<string, unknown> = {};
  for (const k of FORM_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(form, k)) compact[k] = form[k];
  }
  return JSON.stringify(compact);
}

function buildFormSnapshotForPrompt(form: unknown): string {
  if (!form || typeof form !== "object" || Array.isArray(form)) return "{}";
  const f = form as Record<string, unknown>;
  const full = JSON.stringify(f);
  if (full.length <= SNAP_FORM_MAX) return full;
  const compact = buildCompactFormSnapshot(f);
  if (compact.length <= SNAP_FORM_MAX) return compact;
  return compact.slice(0, SNAP_FORM_MAX);
}

function buildProposalSnapshotForPrompt(prop: unknown): string {
  if (!prop || typeof prop !== "object" || Array.isArray(prop)) return "{}";
  const p = prop as Record<string, unknown>;
  const full = JSON.stringify(p);
  if (full.length <= SNAP_PROPOSAL_MAX) return full;
  const compact: Record<string, unknown> = {};
  for (const k of PROPOSAL_PATCH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(p, k)) compact[k] = p[k];
  }
  const s = JSON.stringify(compact);
  return s.length <= SNAP_PROPOSAL_MAX ? s : s.slice(0, SNAP_PROPOSAL_MAX);
}

function buildConversationSummary(messages: ChatMessage[], maxMessages = 6): string {
  if (messages.length <= 2) return "";
  const recent = messages.slice(-maxMessages);
  const lines = recent.map((m) => {
    const prefix = m.role === "user" ? "User:" : "Copilot:";
    const text = m.content.slice(0, 280);
    const ell = m.content.length > 280 ? "…" : "";
    return `${prefix} ${text}${ell}`;
  });
  let out = lines.join("\n");
  if (out.length > MAX_CONVERSATION_SUMMARY_CHARS) {
    out = `${out.slice(0, MAX_CONVERSATION_SUMMARY_CHARS)}…`;
  }
  return out;
}

function buildEstimateChecklist(form: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(strField(form, "address") ? "✅ Address" : "❌ Address (not set)");
  lines.push(strField(form, "roofType") ? "✅ Roof type" : "❌ Roof type (not set)");
  lines.push(strField(form, "roofStructure") ? "✅ Roof structure" : "❌ Roof structure (not set)");
  lines.push(strField(form, "roofPitch") ? "✅ Roof pitch" : "❌ Roof pitch (not set)");
  const area = numField(form, "areaSqFt");
  const sq = numField(form, "measuredSquares");
  lines.push(area || sq ? "✅ Area or squares" : "❌ Area or squares (not set)");
  lines.push(
    numField(form, "wastePercent") !== undefined ? "✅ Waste %" : "⚠️ Waste % (helpful but optional)",
  );
  const lineals =
    numField(form, "ridgesFt") ||
    numField(form, "eavesFt") ||
    numField(form, "rakesFt") ||
    numField(form, "valleysFt") ||
    numField(form, "hipsFt");
  lines.push(lineals ? "✅ Some lineal feet set" : "⚠️ Lineal feet (helpful for takeoff)");
  return lines.join("\n");
}

function wantsEstimateChecklist(mode: CopilotMode, lastUserContent: string): boolean {
  if (mode !== "estimate") return false;
  return /\b(checklist|help\s+me\s+start|walk\s+me\s+through|get\s+started|what\s+do\s+i\s+need|where\s+do\s+i\s+start)\b/i.test(
    lastUserContent,
  );
}

function generateProposalTitle(
  formSnap: Record<string, unknown>,
  formPatch: Record<string, unknown>,
  proposalPatch: Record<string, unknown>,
): string {
  const merged: Record<string, unknown> = { ...formSnap, ...formPatch, ...proposalPatch };
  const addr = strField(merged, "address").slice(0, 44);
  const roofType = strField(merged, "roofType");
  const dt = merged.damageTypes;
  const tags = Array.isArray(dt) ? dt.map((x) => String(x).trim()).filter(Boolean) : [];

  let job = "Roof inspection & estimate";
  if (tags.length > 0) job = "Storm damage inspection & estimate";
  else if (/replace/i.test(roofType)) job = "Roof replacement estimate";
  else if (/repair/i.test(roofType)) job = "Roof repair estimate";

  const tail = addr ? ` — ${addr}` : "";
  let title = `${job}${tail}`.trim();
  if (title.length > 500) title = `${title.slice(0, 497)}…`;
  return title;
}

function modeHint(mode: CopilotMode): string {
  switch (mode) {
    case "estimate":
      return `Focus: **Estimate & takeoff** — Help reps build complete estimates. Walk through: address/location, roof type/structure, pitch, plan area or squares, waste %, measured squares, lineal feet (ridges, eaves, rakes, valleys, hips, flashing), severity/damage tags if relevant, carrier scope narrative, and add-on fields when they mention gutters, dry-in, engineering, etc. Guide use of the in-app map (footprint, lines, auto-trace). When the user gives concrete numbers or facts, include them in **formPatch**. When they ask for a checklist or how to start, include a clear **Checklist** section in assistantMessage (you may use the precomputed lines from the system message).`;
    case "damage":
      return `Focus: **Storm damage & inspection reports** — Draft professional, neutral field documentation. When they want a report, structure **assistantMessage** with clear sections, e.g.: (1) Property / date / weather context (2) Summary (3) Observations by elevation/area (4) Interior signs if any (5) Photo/documentation checklist (6) Limitations / access (7) Suggested next steps. Use **propertyRecordNotes** or **carrierScopeText** in formPatch for long narrative when appropriate. Set **severity** (1–5) and **damageTypes** when the user describes damage. Never guarantee insurance outcomes or claim value.`;
    case "followup":
      return `Focus: **Follow-up & pipeline** — Draft SMS/email snippets, call scripts, and next-step checklists. You cannot send messages yourself; remind them to use **Send to GHL** and SMS automation in the app. Suggest **proposalPatch** (clientName, clientEmail, clientPhone, etc.) when they share contact info.

**SMS / outreach templates:** When the user asks for a template, example text, or SMS wording, offer **two** short variants. Use placeholders like {{name}} or {{address}} **only** for fields that already appear in the form or proposal snapshot; otherwise use neutral wording ("the homeowner", "your company") without fake merge fields. Cover stages when relevant: first contact, post-estimate follow-up, objection (price/warranty/timeline), post-proposal nudge.`;
    default:
      return `Focus: **General HD2D Copilot** — You are a primary feature of the app: answer roofing, estimating, storm restoration, canvassing, and sales follow-up questions thoroughly. For off-topic questions, answer briefly if harmless, then steer back to how you can help on the roof or the job. Prefer actionable, field-ready advice.`;
  }
}

function buildSystemPrompt(
  mode: CopilotMode,
  snapForm: string,
  snapProposal: string,
  conversationSummary: string,
): string {
  const hint = modeHint(mode);
  const contextBlock = conversationSummary
    ? `\n\n**Recent conversation context (truncated; do not repeat questions already answered here):**\n${conversationSummary}`
    : "";

  return `You are **HD2D Copilot**, the flagship AI assistant inside **Door to Door Closers** — expert at roofing field work, estimating, storm documentation, and sales follow-up. Be thorough, practical, and safety-conscious.

${hint}

**What you excel at (use the full thread context):**
- **Estimates:** Build and review takeoffs — squares, pitch, waste, lineals, add-ons, carrier scope language.
- **Storm damage reports:** Neutral, inspection-style narratives; photo checklists; severity and damage tags; notes suitable for **propertyRecordNotes** or **carrierScopeText** when long text is needed.
- **General Q&A:** Materials, methods, ladder safety reminders, how to explain findings to homeowners, objection handling (without guaranteeing outcomes).
- **Follow-up:** CRM-ready snippets; GHL handoff is via the app (**Send to GHL**).

**Hard rules:**
- Default to **useful detail** when the user asks for a report, estimate help, or "walk me through" — you may use bullet lists and sections inside assistantMessage.
- Ask one or two focused questions when critical info is missing; do not stall on optional details.
- **Never** guarantee insurance coverage, claim approval, or legal outcomes. No medical advice. Do not claim to be a licensed engineer, adjuster, or attorney.
- **Never** invent exact measurements, dates, or storm events — only put values in **formPatch** when the user or snapshot provides them (or clearly stated numbers in chat).
- **Be consistent:** If the user or summary already gave a measurement or field value, do not ask again — use it.
- damageTypes must be only: Hail, Wind, Missing Shingles, Leaks, Flashing, Structural.
- severity is 1–5 (integer).
- roofStructure: auto | gable | hip | flat | mansard | complex.

**Proposals & CRM (when relevant):**
- **proposalTitle** should read like a client-facing document title (specific address or job name, scope hint, e.g. "Full roof replacement — 123 Oak St — inspection & estimate").
- In **followup** mode, when contact info appears, fill **proposalPatch** with polished names/emails/phones the rep can send as-is.
- Use **carrierScopeText** for insurer-style scope summaries when the user asks for "scope language" or Xactimate-style narrative; keep **propertyRecordNotes** for field observations.

**Output format (required):** Respond with **only** a single JSON object (no markdown outside JSON), with keys:
- "assistantMessage" (string; markdown **inside the string** is allowed; prefer up to ~6000 chars for long storm reports or estimate breakdowns when needed)
- "formPatch" (object, optional — only whitelisted measurement form keys)
- "proposalPatch" (object, optional — clientName, clientCompany, clientEmail, clientPhone, companyName, proposalTitle)

Current form JSON (partial, may be truncated or compact): ${snapForm}
Current proposal / client JSON (partial): ${snapProposal}${contextBlock}`;
}

function httpStatusFromError(e: unknown): number | undefined {
  if (e && typeof e === "object" && "status" in e && typeof (e as { status?: unknown }).status === "number") {
    return (e as { status: number }).status;
  }
  return undefined;
}

function isTransientLlmError(e: unknown): boolean {
  const st = httpStatusFromError(e);
  if (st === undefined) return true;
  if (st === 429) return true;
  return st >= 500 && st <= 599;
}

function errWithStatus(message: string, status: number): Error {
  const err = new Error(message);
  (err as Error & { status?: number }).status = status;
  return err;
}

function validateCopilotOutput(parsed: Record<string, unknown>): { ok: true } | { ok: false; reason: string } {
  const am = parsed.assistantMessage;
  if (typeof am !== "string" || !am.trim()) {
    return { ok: false, reason: "Model response missing non-empty assistantMessage" };
  }
  if (parsed.formPatch !== undefined && (typeof parsed.formPatch !== "object" || parsed.formPatch === null || Array.isArray(parsed.formPatch))) {
    return { ok: false, reason: "formPatch must be an object when present" };
  }
  if (
    parsed.proposalPatch !== undefined &&
    (typeof parsed.proposalPatch !== "object" || parsed.proposalPatch === null || Array.isArray(parsed.proposalPatch))
  ) {
    return { ok: false, reason: "proposalPatch must be an object when present" };
  }
  return { ok: true };
}

async function completeWithOpenAI(
  env: Env,
  system: string,
  messages: ChatMessage[],
): Promise<{ text: string; model: string }> {
  const openaiMessages = [
    { role: "system" as const, content: system },
    ...messages.slice(-CHAT_HISTORY_TURNS).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: openaiMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw errWithStatus(`OpenAI ${res.status}: ${errText.slice(0, 400)}`, res.status);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text, model: OPENAI_MODEL };
}

async function completeWithAnthropic(
  env: Env,
  system: string,
  messages: ChatMessage[],
): Promise<{ text: string; model: string }> {
  const anthropicMessages = messages.slice(-CHAT_HISTORY_TURNS).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 8192,
      temperature: 0.3,
      system,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw errWithStatus(`Anthropic ${res.status}: ${errText.slice(0, 400)}`, res.status);
  }

  const json = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = json.content?.map((b) => (b.type === "text" ? b.text ?? "" : "")).join("") ?? "";
  return { text, model: ANTHROPIC_MODEL };
}

const RETRY_OPTS = { maxRetries: 2, baseDelayMs: 600, maxDelayMs: 8000, backoffMultiplier: 2 };

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

  const hasOpenAi = Boolean(env.OPENAI_API_KEY?.trim());
  const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY?.trim());
  if (!hasOpenAi && !hasAnthropic) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Configure OPENAI_API_KEY or ANTHROPIC_API_KEY on the server (Wrangler secrets)",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: {
    messages?: ChatMessage[];
    formSnapshot?: unknown;
    proposalSnapshot?: unknown;
    mode?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const mode = normalizeMode(body.mode);

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

  const formSnapObj =
    body.formSnapshot && typeof body.formSnapshot === "object" && !Array.isArray(body.formSnapshot)
      ? (body.formSnapshot as Record<string, unknown>)
      : {};
  const snapForm = buildFormSnapshotForPrompt(body.formSnapshot);
  const snapProposal = buildProposalSnapshotForPrompt(body.proposalSnapshot);

  const conversationSummary = buildConversationSummary(messages);
  let system = buildSystemPrompt(mode, snapForm, snapProposal, conversationSummary);

  const lastUser = messages[messages.length - 1]?.content ?? "";
  if (wantsEstimateChecklist(mode, lastUser)) {
    const checklist = buildEstimateChecklist(formSnapObj);
    system += `\n\n**Precomputed estimate checklist — include a "Checklist" section in assistantMessage using these lines (you may rephrase slightly):**\n${checklist}`;
  }

  let text = "";
  let modelUsed = "";
  let providerUsed: "anthropic" | "openai" = "openai";

  try {
    if (hasAnthropic) {
      try {
        const r = await retryWithBackoffWhen(
          () => completeWithAnthropic(env, system, messages),
          isTransientLlmError,
          RETRY_OPTS,
        );
        text = r.text;
        modelUsed = r.model;
        providerUsed = "anthropic";
      } catch (e1) {
        if (hasOpenAi) {
          console.warn("[estimator-chat] anthropic failed, falling back to openai:", e1);
          const r = await retryWithBackoffWhen(
            () => completeWithOpenAI(env, system, messages),
            isTransientLlmError,
            RETRY_OPTS,
          );
          text = r.text;
          modelUsed = r.model;
          providerUsed = "openai";
        } else {
          throw e1;
        }
      }
    } else {
      const r = await retryWithBackoffWhen(
        () => completeWithOpenAI(env, system, messages),
        isTransientLlmError,
        RETRY_OPTS,
      );
      text = r.text;
      modelUsed = r.model;
      providerUsed = "openai";
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Model request failed";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = parseJson(text);
  const validated = validateCopilotOutput(parsed);
  if (!validated.ok) {
    return new Response(JSON.stringify({ success: false, error: validated.reason }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const assistantMessage =
    typeof parsed.assistantMessage === "string" ? parsed.assistantMessage.trim().slice(0, 12_000) : "";

  const formPatch = sanitizeFormPatch(parsed.formPatch);
  let proposalPatch = sanitizeProposalPatch(parsed.proposalPatch);

  const proposalTitleFromModel =
    typeof proposalPatch.proposalTitle === "string" && proposalPatch.proposalTitle.trim().length > 0;
  const patchKeysNoTitle = Object.keys(proposalPatch).filter((k) => k !== "proposalTitle");
  const hasMeaningfulPatch = Object.keys(formPatch).length > 0 || patchKeysNoTitle.length > 0;
  if (!proposalTitleFromModel && hasMeaningfulPatch) {
    const auto = generateProposalTitle(formSnapObj, formPatch, proposalPatch);
    if (auto) proposalPatch = { ...proposalPatch, proposalTitle: auto };
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        assistantMessage,
        formPatch,
        proposalPatch,
        model: modelUsed,
        mode,
        provider: providerUsed,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
