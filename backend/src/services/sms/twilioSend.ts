import { appendSmsCompliance } from "./compliance";

export type TwilioSendArgs = {
  accountSid: string;
  authToken: string;
  from: string;
  to: string;
  text: string;
  appendCompliance?: boolean;
};

/**
 * Send SMS via Twilio REST API (fetch — Workers-compatible).
 * @see https://www.twilio.com/docs/sms/api/message-resource
 */
export async function twilioSendSms(args: TwilioSendArgs): Promise<{ data: unknown; raw: string }> {
  const text = args.appendCompliance !== false ? appendSmsCompliance(args.text) : args.text;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(args.accountSid)}/Messages.json`;
  const body = new URLSearchParams({
    To: args.to,
    From: args.from,
    Body: text,
  });
  const basic = btoa(`${args.accountSid}:${args.authToken}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }
  if (!res.ok) {
    const err = new Error(`Twilio send failed: ${res.status} ${raw.slice(0, 500)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return { data, raw };
}

export function twilioMessageSidFromResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const sid = (data as { sid?: string }).sid;
  return typeof sid === "string" ? sid : null;
}
