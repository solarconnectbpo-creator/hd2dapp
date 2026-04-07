import { appendSmsCompliance } from "./compliance";

export type TelnyxSendArgs = {
  apiKey: string;
  from: string;
  to: string;
  text: string;
  /** When true (default), append TCPA opt-out line. */
  appendCompliance?: boolean;
};

const TELNYX_BASE = "https://api.telnyx.com/v2";

/**
 * Send SMS via Telnyx Messages API (fetch — Workers-compatible).
 * @see https://developers.telnyx.com/api/messaging/create-message
 */
export async function telnyxSendSms(args: TelnyxSendArgs): Promise<{ data: unknown; raw: string }> {
  const text = args.appendCompliance !== false ? appendSmsCompliance(args.text) : args.text;
  const res = await fetch(`${TELNYX_BASE}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: args.to,
      text,
    }),
  });
  const raw = await res.text();
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }
  if (!res.ok) {
    const err = new Error(`Telnyx send failed: ${res.status} ${raw.slice(0, 500)}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return { data, raw };
}

/** Extract Telnyx message id from create-message response. */
export function telnyxMessageIdFromResponse(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { data?: { id?: string } };
  const id = d.data?.id;
  return typeof id === "string" ? id : null;
}
