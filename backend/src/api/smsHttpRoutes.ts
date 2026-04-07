import { getBearerPayload } from "./authRoutes";
import type { AuthEnv } from "./authRoutes";
import { sendSms } from "../services/sms";
import { resolveSmsOutbound } from "../services/sms/smsProviderResolve";
import { recordSmsUsageEvent } from "./stripeSmsUsage";
import {
  deleteSmsWorkflow,
  ensureSmsContactForOrg,
  getOrgOwnerUserId,
  getOutboundFromForOrg,
  getSmsWorkflow,
  listSmsWorkflows,
  upsertSmsWorkflow,
} from "../sms/smsDb";
import { SMS_CANONICAL_TRIGGERS } from "../sms/smsTriggers";
import {
  emitSmsEvent,
  parseWorkflowJson,
  resolveOrgForCompanyUser,
  seedDefaultSmsWorkflowsIfEmpty,
  startWorkflowRunForContact,
} from "../sms/smsWorkflowEngine";
import type { SmsWorkflowEnv } from "../sms/smsWorkflowEngine";

export type SmsHttpEnv = AuthEnv &
  SmsWorkflowEnv & {
    OPENAI_API_KEY?: string;
    STRIPE_SECRET_KEY?: string;
    TELNYX_API_KEY?: string;
    TELNYX_FROM_NUMBER?: string;
    TWILIO_ACCOUNT_SID?: string;
    TWILIO_AUTH_TOKEN?: string;
    TWILIO_FROM_NUMBER?: string;
  };

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizePhoneE164(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

function workflowEnv(env: SmsHttpEnv): SmsWorkflowEnv {
  return {
    DB: env.DB,
    TELNYX_API_KEY: env.TELNYX_API_KEY,
    TELNYX_FROM_NUMBER: env.TELNYX_FROM_NUMBER,
    TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: env.TWILIO_FROM_NUMBER,
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
  } satisfies SmsWorkflowEnv;
}

export async function handleSmsHttpRoutes(
  request: Request,
  env: SmsHttpEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const base = path.replace(/\/+$/, "") || "/";
  if (!base.startsWith("/api/sms")) return null;

  const j = { ...corsHeaders, "Content-Type": "application/json" };

  if (base === "/api/sms/suggest-reply" && request.method === "POST") {
    return handleSuggestReply(request, env, j);
  }

  if (base === "/api/sms/triggers" && request.method === "GET") {
    return json({ success: true, triggers: [...SMS_CANONICAL_TRIGGERS] }, 200, j);
  }

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return json({ success: false, error: "Sign in required." }, 401, j);
  }

  const orgId = await resolveOrgForCompanyUser(env.DB, payload.sub, payload.user_type);
  if (!orgId && payload.user_type !== "admin") {
    return json({ success: false, error: "No organization for this account." }, 403, j);
  }

  if (payload.user_type !== "admin" && !orgId) {
    return json({ success: false, error: "No organization." }, 403, j);
  }

  const oid = orgId as string;

  if (base === "/api/sms/workflows" && request.method === "GET") {
    await seedDefaultSmsWorkflowsIfEmpty(env.DB, oid);
    const rows = await listSmsWorkflows(env.DB, oid);
    return json({ success: true, workflows: rows }, 200, j);
  }

  if (base === "/api/sms/events" && request.method === "POST") {
    let body: { event?: string; contact_id?: string; phone_e164?: string; phone?: string; name?: string; address?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    const eventType = (body.event || "").trim();
    if (!eventType) {
      return json({ success: false, error: "event required." }, 400, j);
    }
    let contactId = (body.contact_id || "").trim();
    if (!contactId) {
      const rawPhone = (body.phone_e164 || body.phone || "").trim();
      const phone = normalizePhoneE164(rawPhone);
      if (!phone) {
        return json({ success: false, error: "contact_id or phone (phone_e164) required." }, 400, j);
      }
      const t = Math.floor(Date.now() / 1000);
      contactId = await ensureSmsContactForOrg(env.DB, {
        orgId: oid,
        phoneE164: phone,
        name: body.name,
        address: body.address,
        t,
      });
    }
    const out = await emitSmsEvent(workflowEnv(env), oid, eventType, contactId);
    return json({ success: true, started: out.started, errors: out.errors, contact_id: contactId }, 200, j);
  }

  if (base === "/api/sms/workflows" && request.method === "POST") {
    let body: { name?: string; trigger?: string; steps_json?: string; enabled?: boolean };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    const rawSteps = (body.steps_json || '{"steps":[]}').trim();
    const parsed = parseWorkflowJson(rawSteps);
    if (!parsed) {
      return json({ success: false, error: "Invalid steps_json: need at least one sms step." }, 400, j);
    }
    const id = crypto.randomUUID();
    const t = Math.floor(Date.now() / 1000);
    await upsertSmsWorkflow(env.DB, {
      id,
      orgId: oid,
      name: (body.name || "Workflow").trim(),
      trigger: (body.trigger || "manual").trim(),
      stepsJson: JSON.stringify(parsed),
      enabled: body.enabled !== false,
      t,
    });
    const row = await getSmsWorkflow(env.DB, id, oid);
    return json({ success: true, workflow: row }, 201, j);
  }

  const putMatch = base.match(/^\/api\/sms\/workflows\/([^/]+)$/);
  if (putMatch && request.method === "PUT") {
    const id = decodeURIComponent(putMatch[1]);
    let body: { name?: string; trigger?: string; steps_json?: string; enabled?: boolean };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    const existing = await getSmsWorkflow(env.DB, id, oid);
    if (!existing) return json({ success: false, error: "Not found." }, 404, j);
    const t = Math.floor(Date.now() / 1000);
    const rawSteps = (body.steps_json ?? existing.steps_json).trim();
    const parsed = parseWorkflowJson(rawSteps);
    if (!parsed) {
      return json({ success: false, error: "Invalid steps_json: need at least one sms step." }, 400, j);
    }
    await upsertSmsWorkflow(env.DB, {
      id,
      orgId: oid,
      name: (body.name ?? existing.name).trim(),
      trigger: (body.trigger ?? existing.trigger).trim(),
      stepsJson: JSON.stringify(parsed),
      enabled: body.enabled ?? existing.enabled === 1,
      t,
    });
    const row = await getSmsWorkflow(env.DB, id, oid);
    return json({ success: true, workflow: row }, 200, j);
  }

  if (putMatch && request.method === "DELETE") {
    const id = decodeURIComponent(putMatch[1]);
    const ok = await deleteSmsWorkflow(env.DB, id, oid);
    if (!ok) return json({ success: false, error: "Not found." }, 404, j);
    return json({ success: true }, 200, j);
  }

  const startMatch = base.match(/^\/api\/sms\/workflows\/([^/]+)\/start$/);
  if (startMatch && request.method === "POST") {
    const workflowId = decodeURIComponent(startMatch[1]);
    let body: { contact_id?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    const contactId = (body.contact_id || "").trim();
    if (!contactId) return json({ success: false, error: "contact_id required." }, 400, j);
    const res = await startWorkflowRunForContact(workflowEnv(env), oid, workflowId, contactId);
    if (!res.ok) return json({ success: false, error: res.error || "Start failed." }, 400, j);
    return json({ success: true }, 200, j);
  }

  if (base === "/api/sms/send" && request.method === "POST") {
    let body: { to?: string; text?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    const orgFrom = await getOutboundFromForOrg(env.DB, oid);
    const resolved = resolveSmsOutbound(env, orgFrom);
    const to = (body.to || "").trim();
    const text = (body.text || "").trim();
    if (!resolved || !to || !text) {
      return json({ success: false, error: "Configure Telnyx or Twilio and provide to + text." }, 400, j);
    }
    const result =
      resolved.provider === "telnyx"
        ? await sendSms({
            provider: "telnyx",
            apiKey: resolved.apiKey,
            from: resolved.from,
            to,
            text,
            appendCompliance: true,
          })
        : await sendSms({
            provider: "twilio",
            accountSid: resolved.accountSid,
            authToken: resolved.authToken,
            from: resolved.from,
            to,
            text,
            appendCompliance: true,
          });
    const ownerId = await getOrgOwnerUserId(env.DB, oid);
    if (ownerId) {
      await recordSmsUsageEvent({ STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY, DB: env.DB }, ownerId);
    }
    return json({ success: true, externalId: result.externalId }, 200, j);
  }

  return json({ success: false, error: "Not found." }, 404, j);
}

async function handleSuggestReply(request: Request, env: SmsHttpEnv, j: Record<string, string>): Promise<Response> {
  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return json({ success: false, error: "Sign in required." }, 401, j);
  }
  let body: { inboundText?: string; contactContext?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ success: false, error: "Invalid JSON." }, 400, j);
  }
  const inbound = (body.inboundText || "").trim();
  if (!inbound) return json({ success: false, error: "inboundText required." }, 400, j);
  const key = (env.OPENAI_API_KEY || "").trim();
  if (!key) return json({ success: false, error: "OpenAI not configured." }, 503, j);

  const sys =
    "You are a concise roofing sales SMS assistant. Suggest one short SMS reply (max 300 chars), professional and helpful. Output only the message text, no quotes.";
  const user = `Inbound SMS: ${inbound}\nContext: ${(body.contactContext || "").trim() || "none"}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
      max_tokens: 200,
      temperature: 0.6,
    }),
  });
  const raw = await res.text();
  if (!res.ok) {
    return json({ success: false, error: raw.slice(0, 200) }, 502, j);
  }
  let data: { choices?: Array<{ message?: { content?: string } }> };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return json({ success: false, error: "Bad OpenAI response." }, 502, j);
  }
  const suggestion = data.choices?.[0]?.message?.content?.trim() || "";
  return json({ success: true, suggestion }, 200, j);
}
