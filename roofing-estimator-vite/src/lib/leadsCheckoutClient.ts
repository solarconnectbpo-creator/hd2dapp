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
    return await fetch(`${base}${path}`, {
      ...init,
      mode: "cors",
      credentials: "omit",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(networkFetchFailureHint(base, msg));
  }
}

/** Company or admin only; Worker returns 403 for sales_rep. */
export async function createLeadsCheckoutSession(token: string, priceId: string): Promise<string> {
  const res = await workerFetch("/api/leads/checkout-session", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ priceId }),
  });
  const data = await readJsonResponseBody<{ success?: boolean; url?: string; error?: string }>(res);
  if (!res.ok || data.success !== true || !data.url) {
    throw new Error(safeUserFacingApiMessage(data.error || "", res.status));
  }
  return data.url;
}
