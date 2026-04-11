import { getBearerPayload } from "./authRoutes";
import type { AuthEnv } from "./authRoutes";
import { sendSms } from "../services/sms";
import { resolveSmsOutbound } from "../services/sms/smsProviderResolve";
import { recordSmsUsageEvent } from "./stripeSmsUsage";
import {
  bumpSmsContactActivity,
  deleteSmsWorkflow,
  ensureSmsContactForOrg,
  getOrgOwnerUserId,
  getOutboundFromForOrg,
  getSmsContactByIdForOrg,
  getSmsWorkflow,
  insertSmsMessage,
  listSmsContactsForOrg,
  listSmsMessagesForContact,
  listRecentWorkflowRunFailuresForOrg,
  listSmsOrgNumbersForOrg,
  listSmsWorkflows,
  updateSmsContactFields,
  upsertSmsWorkflow,
} from "../sms/smsDb";
import { SMS_CANONICAL_TRIGGERS } from "../sms/smsTriggers";
import { ValidationError, validateString } from "../utils/validation";
import {
  assertOrgOwnerMaySendSms,
  emitSmsEvent,
  resolveOrgForCompanyUser,
  seedDefaultSmsWorkflowsIfEmpty,
  startWorkflowRunForContact,
  validateWorkflowJsonForPersist,
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
    AUTH_SKIP_ACCESS_GATE: env.AUTH_SKIP_ACCESS_GATE,
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

  if (base === "/api/sms/setup-status" && request.method === "GET") {
    const inbound_numbers = await listSmsOrgNumbersForOrg(env.DB, oid);
    const recent_failures = await listRecentWorkflowRunFailuresForOrg(env.DB, oid, 12);
    const telnyxKey = (env.TELNYX_API_KEY || "").trim();
    const telnyxFrom = (env.TELNYX_FROM_NUMBER || "").trim();
    const twSid = (env.TWILIO_ACCOUNT_SID || "").trim();
    const twTok = (env.TWILIO_AUTH_TOKEN || "").trim();
    const twFrom = (env.TWILIO_FROM_NUMBER || "").trim();
    const ownerGate = await assertOrgOwnerMaySendSms(env.DB, env, oid);
    return json(
      {
        success: true,
        org_id: oid,
        inbound_numbers,
        recent_failures,
        outbound_sms_allowed: ownerGate.ok,
        outbound_sms_block_reason: ownerGate.ok ? undefined : ownerGate.reason,
        worker: {
          telnyx_configured: Boolean(telnyxKey),
          telnyx_default_from_set: Boolean(telnyxFrom),
          twilio_configured: Boolean(twSid && twTok && twFrom),
        },
      },
      200,
      j,
    );
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
    const validated = validateWorkflowJsonForPersist(rawSteps);
    if (!validated.ok) {
      return json({ success: false, error: validated.error }, 400, j);
    }
    const id = crypto.randomUUID();
    const t = Math.floor(Date.now() / 1000);
    await upsertSmsWorkflow(env.DB, {
      id,
      orgId: oid,
      name: (body.name || "Workflow").trim(),
      trigger: (body.trigger || "manual").trim(),
      stepsJson: validated.stepsJson,
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
    const validated = validateWorkflowJsonForPersist(rawSteps);
    if (!validated.ok) {
      return json({ success: false, error: validated.error }, 400, j);
    }
    await upsertSmsWorkflow(env.DB, {
      id,
      orgId: oid,
      name: (body.name ?? existing.name).trim(),
      trigger: (body.trigger ?? existing.trigger).trim(),
      stepsJson: validated.stepsJson,
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

  const contactMessagesMatch = base.match(/^\/api\/sms\/contacts\/([^/]+)\/messages$/);
  if (contactMessagesMatch && request.method === "GET") {
    const contactId = decodeURIComponent(contactMessagesMatch[1]);
    const url = new URL(request.url);
    const limitRaw = parseInt(url.searchParams.get("limit") || "500", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(1000, Math.max(1, limitRaw)) : 500;
    const messages = await listSmsMessagesForContact(env.DB, oid, contactId, limit);
    return json({ success: true, messages }, 200, j);
  }

  const contactOneMatch = base.match(/^\/api\/sms\/contacts\/([^/]+)$/);
  if (contactOneMatch && request.method === "PATCH") {
    const contactId = decodeURIComponent(contactOneMatch[1]);
    let body: { name?: string; automations_paused?: boolean; unsubscribed?: boolean };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    const t = Math.floor(Date.now() / 1000);
    const ok = await updateSmsContactFields(env.DB, contactId, oid, body, t);
    if (!ok) return json({ success: false, error: "Contact not found." }, 404, j);
    const row = await getSmsContactByIdForOrg(env.DB, contactId, oid);
    return json({ success: true, contact: row }, 200, j);
  }

  if (base === "/api/sms/contacts" && request.method === "GET") {
    const url = new URL(request.url);
    const limitRaw = parseInt(url.searchParams.get("limit") || "200", 10);
    const offsetRaw = parseInt(url.searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, limitRaw)) : 200;
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
    const contacts = await listSmsContactsForOrg(env.DB, oid, limit, offset);
    return json({ success: true, contacts }, 200, j);
  }

  if (base === "/api/sms/contacts" && request.method === "POST") {
    let body: { phone_e164?: string; phone?: string; name?: string; address?: string };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    const raw = (body.phone_e164 || body.phone || "").trim();
    const phoneE164 = normalizePhoneE164(raw);
    if (!phoneE164) {
      return json({ success: false, error: "phone_e164 or phone (10+ digits) required." }, 400, j);
    }
    const t = Math.floor(Date.now() / 1000);
    const id = await ensureSmsContactForOrg(env.DB, {
      orgId: oid,
      phoneE164,
      name: body.name,
      address: body.address,
      t,
    });
    const contact = await getSmsContactByIdForOrg(env.DB, id, oid);
    return json({ success: true, contact }, 201, j);
  }

  if (base === "/api/sms/send" && request.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ success: false, error: "Invalid JSON." }, 400, j);
    }
    let text: string;
    try {
      text = validateString(body.text, "text", { minLength: 1, maxLength: 1600 });
    } catch (e) {
      if (e instanceof ValidationError) {
        return json({ success: false, error: `Validation: ${e.field} — ${e.message}` }, 400, j);
      }
      throw e;
    }
    const orgFrom = await getOutboundFromForOrg(env.DB, oid);
    const resolved = resolveSmsOutbound(env, orgFrom);
    let toE164 = "";
    let contactIdForMsg = "";
    const contactIdRaw =
      typeof body.contact_id === "string" ? body.contact_id.trim() : typeof body.contactId === "string"
        ? body.contactId.trim()
        : "";
    if (contactIdRaw) {
      let cid: string;
      try {
        cid = validateString(contactIdRaw, "contact_id", { minLength: 1, maxLength: 128 });
      } catch (e) {
        if (e instanceof ValidationError) {
          return json({ success: false, error: `Validation: ${e.field} — ${e.message}` }, 400, j);
        }
        throw e;
      }
      const c = await getSmsContactByIdForOrg(env.DB, cid, oid);
      if (!c) return json({ success: false, error: "contact_id not found for this org." }, 404, j);
      if (c.unsubscribed === 1) {
        return json({ success: false, error: "Contact unsubscribed (STOP)." }, 400, j);
      }
      toE164 = c.phone_e164;
      contactIdForMsg = c.id;
    } else {
      const toRaw = typeof body.to === "string" ? body.to.trim() : "";
      if (toRaw.length > 64) {
        return json({ success: false, error: "Validation: to — value too long." }, 400, j);
      }
      toE164 = normalizePhoneE164(toRaw);
    }
    const gate = await assertOrgOwnerMaySendSms(env.DB, env, oid);
    if (!gate.ok) {
      return json({ success: false, error: gate.reason }, 403, j);
    }
    if (!resolved || !toE164 || !text) {
      return json(
        {
          success: false,
          error:
            "Configure Telnyx (API key + from number / org mapped number) and provide text plus to (E.164) or contact_id.",
        },
        400,
        j,
      );
    }
    const result =
      resolved.provider === "telnyx"
        ? await sendSms({
            provider: "telnyx",
            apiKey: resolved.apiKey,
            from: resolved.from,
            to: toE164,
            text,
            appendCompliance: true,
          })
        : await sendSms({
            provider: "twilio",
            accountSid: resolved.accountSid,
            authToken: resolved.authToken,
            from: resolved.from,
            to: toE164,
            text,
            appendCompliance: true,
          });
    const t = Math.floor(Date.now() / 1000);
    if (!contactIdForMsg) {
      contactIdForMsg = await ensureSmsContactForOrg(env.DB, { orgId: oid, phoneE164: toE164, t });
    }
    await insertSmsMessage(env.DB, {
      id: crypto.randomUUID(),
      contactId: contactIdForMsg,
      direction: "outbound",
      body: text,
      externalId: result.externalId,
      t,
    });
    await bumpSmsContactActivity(env.DB, contactIdForMsg, t);
    const ownerId = await getOrgOwnerUserId(env.DB, oid);
    if (ownerId) {
      await recordSmsUsageEvent({ STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY, DB: env.DB }, ownerId);
    }
    return json({ success: true, externalId: result.externalId, contact_id: contactIdForMsg }, 200, j);
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
