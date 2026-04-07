import {
  cancelPendingRunsForContact,
  findContactByOrgPhone,
  insertSmsMessage,
  resolveOrgIdByInboundTo,
  setContactAutomationsPaused,
  setContactUnsubscribed,
  upsertSmsContact,
} from "../sms/smsDb";

export type TelnyxWebhookEnv = {
  DB: any;
  /** Optional: append ?token= to webhook URL and set same value here. */
  TELNYX_WEBHOOK_QUERY_SECRET?: string;
};

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizeE164(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (s.startsWith("+")) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return s.startsWith("+") ? s : `+${digits}`;
}

function extractInboundPayload(body: unknown): {
  from: string;
  to: string;
  text: string;
  externalId: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const data = b.data as Record<string, unknown> | undefined;
  if (!data) return null;
  let payload = data.payload as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== "object") payload = data.record as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== "object") return null;

  const text = typeof payload.text === "string" ? payload.text : "";
  const id = typeof payload.id === "string" ? payload.id : null;

  let from = "";
  const fromObj = payload.from as Record<string, unknown> | undefined;
  if (fromObj && typeof fromObj.phone_number === "string") from = fromObj.phone_number;
  else if (typeof payload.from === "string") from = payload.from;

  let to = "";
  const toArr = payload.to as unknown;
  if (Array.isArray(toArr) && toArr[0] && typeof toArr[0] === "object") {
    const t0 = toArr[0] as Record<string, unknown>;
    if (typeof t0.phone_number === "string") to = t0.phone_number;
  }
  if (!to && typeof payload.to === "string") to = payload.to;

  return {
    from: normalizeE164(from),
    to: normalizeE164(to),
    text,
    externalId: id,
  };
}

function isStopKeyword(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "stop" || t === "stopall" || t === "unsubscribe" || t === "cancel" || t === "end" || t === "quit";
}

function isStartKeyword(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "start" || t === "unstop" || t === "yes";
}

/**
 * POST /api/webhooks/telnyx — inbound SMS (and delivery receipts if configured).
 */
export async function handleTelnyxWebhook(
  request: Request,
  env: TelnyxWebhookEnv,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const secret = (env.TELNYX_WEBHOOK_QUERY_SECRET || "").trim();
  if (secret) {
    const url = new URL(request.url);
    if (url.searchParams.get("token") !== secret) {
      return json({ success: false, error: "Unauthorized" }, 401, corsHeaders);
    }
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return json({ success: false, error: "Bad body" }, 400, corsHeaders);
  }

  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400, corsHeaders);
  }

  const data = (parsed as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const eventType = (data?.event_type as string) || (data?.record as Record<string, unknown> | undefined)?.event_type;

  if (eventType && eventType !== "message.received") {
    return json({ received: true, skipped: eventType }, 200, corsHeaders);
  }

  const inbound = extractInboundPayload(parsed);
  if (!inbound?.from || !inbound.to) {
    return json({ received: true, skipped: "no_payload" }, 200, corsHeaders);
  }

  const orgId = await resolveOrgIdByInboundTo(env.DB, inbound.to);
  if (!orgId) {
    console.warn("[telnyx-webhook] no sms_org_numbers row for", inbound.to);
    return json({ received: true, skipped: "unknown_to_number" }, 200, corsHeaders);
  }

  const t = Math.floor(Date.now() / 1000);
  await upsertSmsContact(env.DB, {
    id: crypto.randomUUID(),
    orgId,
    phoneE164: inbound.from,
    name: "",
    t,
  });

  const c = await findContactByOrgPhone(env.DB, orgId, inbound.from);
  if (!c) return json({ received: true, skipped: "contact" }, 200, corsHeaders);

  await insertSmsMessage(env.DB, {
    id: crypto.randomUUID(),
    contactId: c.id,
    direction: "inbound",
    body: inbound.text,
    externalId: inbound.externalId,
    t,
  });

  if (isStopKeyword(inbound.text)) {
    await setContactUnsubscribed(env.DB, c.id, true, t);
    await cancelPendingRunsForContact(env.DB, c.id, t);
    return json({ received: true, stop: true }, 200, corsHeaders);
  }

  if (isStartKeyword(inbound.text)) {
    await setContactUnsubscribed(env.DB, c.id, false, t);
    return json({ received: true, start: true }, 200, corsHeaders);
  }

  await setContactAutomationsPaused(env.DB, c.id, true, t);
  await cancelPendingRunsForContact(env.DB, c.id, t);

  return json({ received: true, paused: true }, 200, corsHeaders);
}
