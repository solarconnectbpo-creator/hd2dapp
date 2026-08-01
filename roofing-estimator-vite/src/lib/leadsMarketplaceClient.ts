import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";
import { networkFetchFailureHint, safeUserFacingApiMessage } from "./safeApiError";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

async function workerFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = apiBase();
  if (!base) throw new Error("Backend API base is not configured.");
  try {
    return await fetch(`${base}${path}`, { ...init, mode: "cors", credentials: "omit" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(networkFetchFailureHint(base, msg));
  }
}

export type MarketplaceAppointment = {
  id: string;
  status: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  scheduledAt: number | null;
  priceUsd: number | null;
  reservedUntil: number | null;
  owned: boolean;
  homeownerName?: string | null;
  address?: string | null;
  notes?: string | null;
  phone?: string | null;
  email?: string | null;
};

function auth(token: string, json = false): HeadersInit {
  const h: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${token}` };
  if (json) h["Content-Type"] = "application/json";
  return h;
}

export async function listMarketplaceAppointments(
  token: string,
  opts?: { state?: string; limit?: number },
): Promise<MarketplaceAppointment[]> {
  const q = new URLSearchParams();
  if (opts?.state) q.set("state", opts.state);
  if (opts?.limit) q.set("limit", String(opts.limit));
  const res = await workerFetch(`/api/leads/marketplace?${q}`, { headers: auth(token) });
  const data = await readJsonResponseBody<{
    success?: boolean;
    appointments?: MarketplaceAppointment[];
    error?: string;
  }>(res);
  if (!res.ok || !data.success) throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  return data.appointments || [];
}

export async function listPurchasedAppointments(token: string): Promise<MarketplaceAppointment[]> {
  const res = await workerFetch("/api/leads/marketplace/purchased", { headers: auth(token) });
  const data = await readJsonResponseBody<{
    success?: boolean;
    appointments?: MarketplaceAppointment[];
    error?: string;
  }>(res);
  if (!res.ok || !data.success) throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  return data.appointments || [];
}

export async function createLeadsCheckoutSession(
  token: string,
  priceId: string,
  appointmentIds?: string[],
): Promise<string> {
  const res = await workerFetch("/api/leads/checkout-session", {
    method: "POST",
    headers: auth(token, true),
    body: JSON.stringify({ priceId, appointmentIds }),
  });
  const data = await readJsonResponseBody<{ success?: boolean; url?: string; error?: string }>(res);
  if (!res.ok || data.success !== true || !data.url) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
  return data.url;
}

export async function pushPurchasedLeadsToCrm(token: string, appointmentIds: string[]) {
  const res = await workerFetch("/api/leads/marketplace/push-crm", {
    method: "POST",
    headers: auth(token, true),
    body: JSON.stringify({ appointmentIds }),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    pushed?: number;
    results?: Array<{ id: string; ok: boolean; error?: string }>;
    error?: string;
  }>(res);
  if (!res.ok) throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  return data;
}

export async function sendPurchasedLeadToSms(
  token: string,
  appointmentId: string,
  startWorkflow = true,
): Promise<{ contactId: string; started: number }> {
  const res = await workerFetch("/api/leads/marketplace/to-sms", {
    method: "POST",
    headers: auth(token, true),
    body: JSON.stringify({ appointmentId, startWorkflow }),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    contact_id?: string;
    started?: number;
    error?: string;
  }>(res);
  if (!res.ok || !data.success || !data.contact_id) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
  return { contactId: data.contact_id, started: data.started || 0 };
}

export async function getOrgCrmDelivery(token: string): Promise<{
  crmWebhookUrl: string;
  ghlLocationId: string;
  ghlTokenSet: boolean;
  role: string;
}> {
  const res = await workerFetch("/api/org/crm-delivery", { headers: auth(token) });
  const data = await readJsonResponseBody<{
    success?: boolean;
    crmWebhookUrl?: string;
    ghlLocationId?: string;
    ghlTokenSet?: boolean;
    role?: string;
    error?: string;
  }>(res);
  if (!res.ok || !data.success) throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  return {
    crmWebhookUrl: data.crmWebhookUrl || "",
    ghlLocationId: data.ghlLocationId || "",
    ghlTokenSet: Boolean(data.ghlTokenSet),
    role: data.role || "",
  };
}

export async function saveOrgCrmDelivery(
  token: string,
  body: {
    crmWebhookUrl?: string;
    ghlApiToken?: string;
    ghlLocationId?: string;
    clearGhlToken?: boolean;
  },
): Promise<void> {
  const res = await workerFetch("/api/org/crm-delivery", {
    method: "PUT",
    headers: auth(token, true),
    body: JSON.stringify(body),
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || !data.success) throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
}
