import { getHd2dApiBase } from "./hd2dApiBase";
import { getStoredSession } from "./authClient";
import { readJsonResponseBody } from "./readJsonResponse";
import { safeUserFacingApiMessage } from "./safeApiError";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

function authHeaders(json = false): HeadersInit {
  const token = getStoredSession()?.token;
  const h: Record<string, string> = { Accept: "application/json" };
  if (json) h["Content-Type"] = "application/json";
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function smsFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = apiBase();
  if (!base) throw new Error("Backend API base is not configured.");
  return fetch(`${base}${path}`, { ...init, mode: "cors", credentials: "omit" });
}

export type SmsContact = {
  id: string;
  phone_e164: string;
  name: string;
  address?: string;
  unsubscribed?: number;
  automations_paused?: number;
  pipeline_stage?: string;
  last_message_at?: number | null;
  last_message_preview?: string | null;
  last_inbound_at?: number | null;
};

export type SmsMessage = {
  id: string;
  direction: string;
  body: string;
  created_at: number;
  status?: string | null;
};

export async function listSmsContacts(limit = 100): Promise<SmsContact[]> {
  const res = await smsFetch(`/api/sms/contacts?limit=${limit}`, { headers: authHeaders() });
  const data = await readJsonResponseBody<{ success?: boolean; contacts?: SmsContact[]; error?: string }>(res);
  if (!res.ok || !data.success) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
  return data.contacts || [];
}

export async function createSmsContact(args: {
  phone: string;
  name?: string;
  address?: string;
}): Promise<SmsContact> {
  const res = await smsFetch("/api/sms/contacts", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ phone: args.phone, name: args.name, address: args.address }),
  });
  const data = await readJsonResponseBody<{ success?: boolean; contact?: SmsContact; error?: string }>(res);
  if (!res.ok || !data.success || !data.contact) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
  return data.contact;
}

export async function listSmsMessages(contactId: string, limit = 200): Promise<SmsMessage[]> {
  const res = await smsFetch(`/api/sms/contacts/${encodeURIComponent(contactId)}/messages?limit=${limit}`, {
    headers: authHeaders(),
  });
  const data = await readJsonResponseBody<{ success?: boolean; messages?: SmsMessage[]; error?: string }>(res);
  if (!res.ok || !data.success) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
  return data.messages || [];
}

export async function sendSmsMessage(args: {
  text: string;
  contactId?: string;
  to?: string;
}): Promise<{ contactId: string; externalId?: string }> {
  const res = await smsFetch("/api/sms/send", {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({
      text: args.text,
      contact_id: args.contactId,
      to: args.to,
    }),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    contact_id?: string;
    externalId?: string;
    error?: string;
  }>(res);
  if (!res.ok || !data.success || !data.contact_id) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
  return { contactId: data.contact_id, externalId: data.externalId };
}

export async function startSmsWorkflow(workflowId: string, contactId: string): Promise<void> {
  const res = await smsFetch(`/api/sms/workflows/${encodeURIComponent(workflowId)}/start`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({ contact_id: contactId }),
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || !data.success) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
}

export async function patchSmsContact(
  contactId: string,
  patch: { name?: string; automations_paused?: boolean; unsubscribed?: boolean },
): Promise<void> {
  const res = await smsFetch(`/api/sms/contacts/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    headers: authHeaders(true),
    body: JSON.stringify(patch),
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || !data.success) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
}

export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}
