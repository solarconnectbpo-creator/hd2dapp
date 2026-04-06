const DEFAULT_MAX_ITEMS = 50;

export const SOCIAL_DRAFTS_STORAGE_KEY = "hd2d-social-drafts-v1";
export const AD_CREATIVE_DRAFTS_STORAGE_KEY = "hd2d-ad-creative-drafts-v1";
/** Last Meta campaign id from “Create PAUSED draft campaign” — for ad-bundle flow. */
export const META_LAST_CAMPAIGN_ID_KEY = "hd2d-meta-last-campaign-id-v1";

/** Saved from Ad Maker — headline/body/CTA plus optional AI image (data URL) for scheduling & ads. */
export type AdCreativeDraftStored = {
  id: string;
  headline: string;
  cta: string;
  body: string;
  savedAt: string;
  imageDataUrl?: string;
  imagePrompt?: string;
  /** Landing page for link ads / scheduled posts */
  linkUrl?: string;
};

export function loadMetaLastCampaignId(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(META_LAST_CAMPAIGN_ID_KEY) || "";
  } catch {
    return "";
  }
}

export function saveMetaLastCampaignId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const t = id.trim();
    if (t) window.localStorage.setItem(META_LAST_CAMPAIGN_ID_KEY, t);
    else window.localStorage.removeItem(META_LAST_CAMPAIGN_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function loadJsonArray<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw?.trim()) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed as T[];
  } catch {
    return fallback;
  }
}

export function saveJsonArray<T>(key: string, items: T[], maxItems = DEFAULT_MAX_ITEMS): { ok: true } | { ok: false; error: string } {
  if (typeof window === "undefined") return { ok: false, error: "Storage not available." };
  const capped = items.slice(0, maxItems);
  try {
    window.localStorage.setItem(key, JSON.stringify(capped));
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save.";
    return { ok: false, error: msg.includes("Quota") ? "Storage full — delete some drafts." : msg };
  }
}

export function newDraftId(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
