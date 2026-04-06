/**
 * HD2D Worker — Meta (Facebook) marketing API (OAuth, scheduled Page posts, campaign drafts).
 */

import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

async function authFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  const base = apiBase();
  if (!base) throw new Error("Backend API base is not configured.");
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export type MetaPage = { id: string; name: string };

export type MetaScheduledRow = {
  id: string;
  page_id: string;
  page_name: string | null;
  message: string;
  link_url: string | null;
  scheduled_unix: number;
  status: string;
  meta_post_id: string | null;
  last_error: string | null;
  created_at: number;
};

export async function fetchMetaConfig(token: string): Promise<{
  configured: boolean;
  appId: string | null;
  hasAdAccount: boolean;
  oauthRedirectUri: string | null;
}> {
  const res = await authFetch("/api/meta/config", token);
  const data = await readJsonResponseBody<{
    success?: boolean;
    data?: {
      configured?: boolean;
      appId?: string | null;
      hasAdAccount?: boolean;
      oauthRedirectUri?: string | null;
    };
  }>(res);
  if (!res.ok || data.success !== true || !data.data) {
    return { configured: false, appId: null, hasAdAccount: false, oauthRedirectUri: null };
  }
  return {
    configured: Boolean(data.data.configured),
    appId: data.data.appId ?? null,
    hasAdAccount: Boolean(data.data.hasAdAccount),
    oauthRedirectUri: data.data.oauthRedirectUri ?? null,
  };
}

export async function fetchMetaStatus(token: string): Promise<boolean> {
  const res = await authFetch("/api/meta/status", token);
  const data = await readJsonResponseBody<{ success?: boolean; data?: { connected?: boolean } }>(res);
  return res.ok && data.success === true && Boolean(data.data?.connected);
}

export async function startMetaOAuth(token: string): Promise<string> {
  const res = await authFetch("/api/meta/oauth/start", token, { method: "POST" });
  const data = await readJsonResponseBody<{ success?: boolean; url?: string; error?: string }>(res);
  if (!res.ok || data.success !== true || !data.url) {
    throw new Error(data.error || `Could not start Meta login (${res.status}).`);
  }
  return data.url;
}

export async function disconnectMeta(token: string): Promise<void> {
  const res = await authFetch("/api/meta/disconnect", token, { method: "POST" });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(data.error || "Disconnect failed.");
  }
}

export async function fetchMetaPages(token: string): Promise<MetaPage[]> {
  const res = await authFetch("/api/meta/pages", token);
  const data = await readJsonResponseBody<{ success?: boolean; data?: MetaPage[]; error?: string }>(res);
  if (!res.ok || data.success !== true || !Array.isArray(data.data)) {
    throw new Error(data.error || "Could not load Facebook Pages.");
  }
  return data.data;
}

export async function scheduleMetaPagePost(
  token: string,
  body: { pageId: string; message: string; linkUrl?: string; scheduledAt: string },
): Promise<{ id: string; metaPostId: string | null }> {
  const res = await authFetch("/api/meta/schedule-post", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    data?: { id?: string; metaPostId?: string | null };
    error?: string;
  }>(res);
  if (!res.ok || data.success !== true || !data.data?.id) {
    throw new Error(data.error || "Schedule failed.");
  }
  return { id: data.data.id, metaPostId: data.data.metaPostId ?? null };
}

export async function listMetaScheduled(token: string): Promise<MetaScheduledRow[]> {
  const res = await authFetch("/api/meta/scheduled", token);
  const data = await readJsonResponseBody<{ success?: boolean; data?: MetaScheduledRow[]; error?: string }>(res);
  if (!res.ok || data.success !== true || !Array.isArray(data.data)) {
    throw new Error(data.error || "Could not load scheduled posts.");
  }
  return data.data;
}

export async function deleteMetaScheduled(token: string, id: string): Promise<void> {
  const res = await authFetch(`/api/meta/scheduled/${encodeURIComponent(id)}`, token, { method: "DELETE" });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(data.error || "Delete failed.");
  }
}

export async function createMetaCampaignDraft(
  token: string,
  name: string,
  objective = "OUTCOME_TRAFFIC",
): Promise<{ campaignId: string | null; adsManagerUrl: string }> {
  const res = await authFetch("/api/meta/campaign-draft", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, objective }),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    data?: { campaignId?: string | null; adsManagerUrl?: string };
    error?: string;
  }>(res);
  if (!res.ok || data.success !== true || !data.data?.adsManagerUrl) {
    throw new Error(data.error || "Campaign draft failed.");
  }
  return {
    campaignId: data.data.campaignId ?? null,
    adsManagerUrl: data.data.adsManagerUrl,
  };
}

/** Upload a Base64 image (or data URL) to Meta ad library; returns hash for creatives. */
export async function uploadMetaAdImage(token: string, imageBase64: string): Promise<string | null> {
  const res = await authFetch("/api/meta/ad-image", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    data?: { hash?: string | null };
    error?: string;
  }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(data.error || "Ad image upload failed.");
  }
  return data.data?.hash ?? null;
}

/** Create PAUSED ad set + creative + ad under an existing campaign (minimal US targeting). */
export async function createMetaAdBundleDraft(
  token: string,
  body: {
    campaignId: string;
    pageId: string;
    linkUrl: string;
    message: string;
    headline?: string;
    imageHash?: string;
    dailyBudgetCents?: number;
  },
): Promise<{ adsetId: string; creativeId: string; adId: string | null; adsManagerUrl: string }> {
  const res = await authFetch("/api/meta/ad-bundle-draft", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    data?: { adsetId?: string; creativeId?: string; adId?: string | null; adsManagerUrl?: string };
    error?: string;
  }>(res);
  if (!res.ok || data.success !== true || !data.data?.adsetId || !data.data?.creativeId) {
    throw new Error(data.error || "Ad bundle draft failed.");
  }
  return {
    adsetId: data.data.adsetId,
    creativeId: data.data.creativeId,
    adId: data.data.adId ?? null,
    adsManagerUrl: data.data.adsManagerUrl || "",
  };
}
