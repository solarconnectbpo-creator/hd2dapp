import {
  bumpSmsContactActivity,
  cancelPendingRunsForContact,
  findContactByOrgPhone,
  getSmsOrgFromTelnyxToNumber,
  insertSmsMessage,
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
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
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

/** Telnyx v2 single-event shape: `data` object with `payload` or `record`. */
function extractInboundPayload(body: unknown): {
  from: string;
  to: string;
  text: string;
  externalId: string | null;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const data = b.data as Record<string, unknown> | undefined;
  if (!data || Array.isArray(data)) return null;
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

/** Tutorial / alternate shape: `meta.event_type` + `data` as array of message-like objects. */
function extractInboundFromArrayEvent(ev: Record<string, unknown>): {
  from: string;
  to: string;
  text: string;
  externalId: string | null;
} | null {
  const text = typeof ev.text === "string" ? ev.text : "";
  const id = typeof ev.id === "string" ? ev.id : null;
  let from = "";
  const fromObj = ev.from as Record<string, unknown> | undefined;
  if (fromObj && typeof fromObj.phone_number === "string") from = fromObj.phone_number;
  else if (typeof ev.from === "string") from = ev.from;
  let to = "";
  const toArr = ev.to as unknown;
  if (Array.isArray(toArr) && toArr[0] && typeof toArr[0] === "object") {
    const t0 = toArr[0] as Record<string, unknown>;
    if (typeof t0.phone_number === "string") to = t0.phone_number;
  }
  if (!to && typeof ev.to === "string") to = ev.to;
  const fromN = normalizeE164(from);
  const toN = normalizeE164(to);
  if (!fromN || !toN) return null;
  return { from: fromN, to: toN, text, externalId: id };
}

function readTelnyxEventType(parsed: Record<string, unknown>): string {
  const meta = parsed.meta;
  if (meta && typeof meta === "object") {
    const et = (meta as Record<string, unknown>).event_type;
    if (typeof et === "string" && et) return et;
  }
  const data = parsed.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const et = (data as Record<string, unknown>).event_type;
    if (typeof et === "string" && et) return et;
  }
  return "";
}

function collectInboundPieces(parsed: Record<string, unknown>, eventType: string): Array<{
  from: string;
  to: string;
  text: string;
  externalId: string | null;
}> {
  const out: Array<{ from: string; to: string; text: string; externalId: string | null }> = [];
  const data = parsed.data;

  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const ev = item as Record<string, unknown>;
      const dir = typeof ev.direction === "string" ? ev.direction.toLowerCase() : "";
      if (dir && dir !== "inbound") continue;
      const piece = extractInboundFromArrayEvent(ev);
      if (piece?.from && piece.to) out.push(piece);
    }
  }

  if (out.length === 0 && (eventType === "message.received" || !eventType)) {
    const single = extractInboundPayload(parsed);
    if (single?.from && single.to) out.push(single);
  }
  return out;
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
 * Supports Telnyx `data.payload` webhooks and alternate `meta.event_type` + `data[]` shapes.
 */
export async function handleTelnyxWebhook(
  request: Request,
  env: TelnyxWebhookEnv,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path !== "/api/webhooks/telnyx") {
    return json({ success: false, error: "Not found" }, 404, corsHeaders);
  }

  const secret = (env.TELNYX_WEBHOOK_QUERY_SECRET || "").trim();
  if (secret) {
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

  let parsed: Record<string, unknown>;
  try {
    parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return json({ success: true, received: true, skipped: "invalid_json" }, 200, corsHeaders);
  }

  const eventType = readTelnyxEventType(parsed);
  const legacyType =
    (parsed.data as Record<string, unknown> | undefined)?.event_type &&
    typeof (parsed.data as Record<string, unknown>).event_type === "string"
      ? String((parsed.data as Record<string, unknown>).event_type)
      : "";
  const effectiveType = eventType || legacyType;

  if (effectiveType === "message.dlr" || effectiveType === "message.finalized") {
    const data = parsed.data as Record<string, unknown> | undefined;
    const payload = data?.payload as Record<string, unknown> | undefined;
    const id = typeof payload?.id === "string" ? payload.id : (typeof data?.id === "string" ? data.id : "");
    const dlr = payload?.type ?? data?.record;
    console.log(`[telnyx-webhook] ${effectiveType} id=${id}`, typeof dlr === "object" ? JSON.stringify(dlr).slice(0, 200) : dlr);
    return json({ success: true, received: true, skipped: effectiveType }, 200, corsHeaders);
  }

  if (effectiveType && effectiveType !== "message.received") {
    return json({ received: true, skipped: effectiveType }, 200, corsHeaders);
  }

  const inbounds = collectInboundPieces(parsed, effectiveType);
  if (inbounds.length === 0) {
    return json({ received: true, skipped: "no_payload" }, 200, corsHeaders);
  }

  const t = Math.floor(Date.now() / 1000);
  const flags: string[] = [];

  for (const inbound of inbounds) {
    const orgId = await getSmsOrgFromTelnyxToNumber(env.DB, inbound.to);
    if (!orgId) {
      console.warn("[telnyx-webhook] no sms_org_numbers row for", inbound.to);
      continue;
    }

    await upsertSmsContact(env.DB, {
      id: crypto.randomUUID(),
      orgId,
      phoneE164: inbound.from,
      name: "",
      t,
    });

    const c = await findContactByOrgPhone(env.DB, orgId, inbound.from);
    if (!c) {
      console.warn("[telnyx-webhook] contact missing after upsert", inbound.from);
      continue;
    }

    await insertSmsMessage(env.DB, {
      id: crypto.randomUUID(),
      contactId: c.id,
      direction: "inbound",
      body: inbound.text,
      externalId: inbound.externalId,
      t,
    });
    await bumpSmsContactActivity(env.DB, c.id, t);

    if (isStopKeyword(inbound.text)) {
      await setContactUnsubscribed(env.DB, c.id, true, t);
      await cancelPendingRunsForContact(env.DB, c.id, t);
      flags.push("stop");
      continue;
    }

    if (isStartKeyword(inbound.text)) {
      await setContactUnsubscribed(env.DB, c.id, false, t);
      flags.push("start");
      continue;
    }

    await setContactAutomationsPaused(env.DB, c.id, true, t);
    await cancelPendingRunsForContact(env.DB, c.id, t);
    flags.push("paused");
  }

  return json({ success: true, received: true, processed: inbounds.length, flags }, 200, corsHeaders);
}
