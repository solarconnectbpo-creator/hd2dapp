import {
  cancelPendingRunsForContact,
  findContactByOrgPhone,
  insertSmsMessage,
  resolveOrgIdByInboundTo,
  setContactAutomationsPaused,
  setContactUnsubscribed,
  upsertSmsContact,
} from "../sms/smsDb";

export type TwilioWebhookEnv = {
  DB: any;
  /** Optional: require ?token= on POST /api/webhooks/twilio */
  TWILIO_WEBHOOK_QUERY_SECRET?: string;
};

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

function isStopKeyword(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "stop" || t === "stopall" || t === "unsubscribe" || t === "cancel" || t === "end" || t === "quit";
}

function isStartKeyword(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t === "start" || t === "unstop" || t === "yes";
}

/**
 * POST /api/webhooks/twilio — inbound SMS (application/x-www-form-urlencoded).
 */
export async function handleTwilioWebhook(
  request: Request,
  env: TwilioWebhookEnv,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const secret = (env.TWILIO_WEBHOOK_QUERY_SECRET || "").trim();
  if (secret) {
    const url = new URL(request.url);
    if (url.searchParams.get("token") !== secret) {
      return json({ success: false, error: "Unauthorized" }, 401, corsHeaders);
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ success: false, error: "Bad body" }, 400, corsHeaders);
  }

  const from = normalizeE164(String(form.get("From") || ""));
  const to = normalizeE164(String(form.get("To") || ""));
  const body = String(form.get("Body") || "");
  const sid = String(form.get("MessageSid") || "") || null;

  if (!from || !to) {
    return json({ received: true, skipped: "no_payload" }, 200, corsHeaders);
  }

  const orgId = await resolveOrgIdByInboundTo(env.DB, to);
  if (!orgId) {
    console.warn("[twilio-webhook] no sms_org_numbers row for", to);
    return json({ received: true, skipped: "unknown_to_number" }, 200, corsHeaders);
  }

  const t = Math.floor(Date.now() / 1000);
  await upsertSmsContact(env.DB, {
    id: crypto.randomUUID(),
    orgId,
    phoneE164: from,
    name: "",
    t,
  });

  const c = await findContactByOrgPhone(env.DB, orgId, from);
  if (!c) return json({ received: true, skipped: "contact" }, 200, corsHeaders);

  await insertSmsMessage(env.DB, {
    id: crypto.randomUUID(),
    contactId: c.id,
    direction: "inbound",
    body,
    externalId: sid || null,
    t,
  });

  if (isStopKeyword(body)) {
    await setContactUnsubscribed(env.DB, c.id, true, t);
    await cancelPendingRunsForContact(env.DB, c.id, t);
    return json({ received: true, stop: true }, 200, corsHeaders);
  }

  if (isStartKeyword(body)) {
    await setContactUnsubscribed(env.DB, c.id, false, t);
    return json({ received: true, start: true }, 200, corsHeaders);
  }

  await setContactAutomationsPaused(env.DB, c.id, true, t);
  await cancelPendingRunsForContact(env.DB, c.id, t);

  return json({ received: true, paused: true }, 200, corsHeaders);
}
