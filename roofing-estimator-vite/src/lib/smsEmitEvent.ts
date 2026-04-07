import { getStoredSession } from "./authClient";
import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";

/**
 * Fire org-scoped SMS automation triggers (see Worker `POST /api/sms/events`).
 * Requires a signed-in company user with an org; fails quietly if not authenticated.
 */
export async function postSmsEvent(args: {
  event: string;
  contactId?: string;
  phone?: string;
  name?: string;
  address?: string;
}): Promise<{ ok: boolean; started?: number; error?: string }> {
  const token = getStoredSession()?.token;
  if (!token) {
    return { ok: false, error: "not_signed_in" };
  }
  const base = getHd2dApiBase().replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/sms/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: args.event,
        contact_id: args.contactId,
        phone: args.phone,
        name: args.name,
        address: args.address,
      }),
    });
    const data = await readJsonResponseBody<{
      success?: boolean;
      started?: number;
      errors?: string[];
      error?: string;
    }>(res);
    if (!res.ok || !data.success) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, started: data.started };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "request_failed" };
  }
}
