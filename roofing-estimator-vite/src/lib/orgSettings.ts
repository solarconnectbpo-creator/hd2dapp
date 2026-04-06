import type { ContactRecord } from "./contactsCsv";
import { optHttpsUrl } from "./fieldProjectTypes";
import { getScopedStorageKey } from "./userScopedStorage";

export const CONTACTS_STORAGE_KEY = "roofing-estimator-vite-contacts-v1";
export const ORG_SETTINGS_STORAGE_KEY = "roofing-estimator-vite-org-v1";

export type OrgTemplateProfile = "residential" | "commercial";
export type OwnerFallbackProvider = "none" | "dealmachine-relaxed";

export interface OrgSettings {
  companyName: string;
  companyAddress: string;
  companyWebsite: string;
  preparedBy: string;
  contactEmail: string;
  contactPhone: string;
  /** data:image/...;base64,... or empty */
  logoDataUrl: string;
  defaultTemplateProfile: OrgTemplateProfile;
  /** Owner/contact fallback when parcel layers omit PII (DealMachine via Worker). */
  ownerFallbackProvider: OwnerFallbackProvider;
  /** When true, `none` was chosen in settings — do not auto-upgrade to DealMachine relaxed. */
  ownerFallbackLockedOff?: boolean;
  /** Reserved for future optional override keys (DealMachine uses Worker secret or app key). */
  ownerFallbackApiKey: string;
  /** Default GoHighLevel app URL when a field job has no per-project link (https). */
  ghlBaseUrl: string;
}

export function defaultOrgSettings(): OrgSettings {
  return {
    companyName: "Repair King",
    companyAddress: "",
    companyWebsite: "",
    preparedBy: "Estimator",
    contactEmail: "estimating@repairking.com",
    contactPhone: "(000) 000-0000",
    logoDataUrl: "",
    defaultTemplateProfile: "residential",
    ownerFallbackProvider: "dealmachine-relaxed",
    ownerFallbackApiKey: "",
    ghlBaseUrl: "",
  };
}

export function loadOrgSettings(): OrgSettings {
  try {
    const key = getScopedStorageKey(ORG_SETTINGS_STORAGE_KEY);
    if (!key) return defaultOrgSettings();
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultOrgSettings();
    const rawObj = JSON.parse(raw) as Record<string, unknown>;
    delete rawObj.arcgisFeatureLayerUrl;
    delete rawObj.esriBuildingFootprintLayerUrl;
    delete rawObj.arcgisApiKey;
    const p = rawObj as Partial<OrgSettings> & { ownerFallbackProvider?: string };
    const rawFallback = rawObj.ownerFallbackProvider;
    if (rawFallback === "batchdata-relaxed") {
      p.ownerFallbackProvider = "dealmachine-relaxed";
    }
    const merged = { ...defaultOrgSettings(), ...p };
    const lockedOff = Boolean((rawObj as { ownerFallbackLockedOff?: boolean }).ownerFallbackLockedOff);
    if (merged.ownerFallbackProvider === "none" && !lockedOff) {
      merged.ownerFallbackProvider = "dealmachine-relaxed";
    }
    merged.ghlBaseUrl = optHttpsUrl(merged.ghlBaseUrl ?? "") ?? "";
    return merged;
  } catch {
    return defaultOrgSettings();
  }
}

export function saveOrgSettings(org: OrgSettings): void {
  const r = saveOrgSettingsSafe(org);
  if (!r.ok) throw new Error(r.message);
}

/** Returns an error message when quota exceeded or payload too large. */
export function saveOrgSettingsSafe(org: OrgSettings): { ok: true } | { ok: false; message: string } {
  try {
    const json = JSON.stringify(org);
    // Stay under typical 5MB localStorage limits (UTF-16 expansion varies by browser).
    if (json.length > 4_200_000) {
      return {
        ok: false,
        message:
          "Company profile JSON is too large for browser storage. Use a smaller logo file (try under 300KB) or remove the logo.",
      };
    }
    const key = getScopedStorageKey(ORG_SETTINGS_STORAGE_KEY);
    if (!key) return { ok: false, message: "Sign in to save company settings." };
    window.localStorage.setItem(key, json);
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
      return {
        ok: false,
        message:
          "Browser storage is full (quota exceeded). Clear old site data or use a much smaller logo image.",
      };
    }
    return { ok: false, message: e instanceof Error ? e.message : "Could not save company settings." };
  }
}

export function loadContactsFromStorage(): ContactRecord[] {
  try {
    const key = getScopedStorageKey(CONTACTS_STORAGE_KEY);
    if (!key) return [];
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ContactRecord[];
  } catch {
    return [];
  }
}

export function saveContactsToStorage(contacts: ContactRecord[]): void {
  const r = saveContactsToStorageSafe(contacts);
  if (!r.ok) throw new Error(r.message);
}

export function saveContactsToStorageSafe(
  contacts: ContactRecord[],
): { ok: true } | { ok: false; message: string } {
  try {
    const json = JSON.stringify(contacts);
    if (json.length > 4_200_000) {
      return { ok: false, message: "Contact list is too large for browser storage. Export a subset or clear old leads." };
    }
    const key = getScopedStorageKey(CONTACTS_STORAGE_KEY);
    if (!key) return { ok: false, message: "Sign in to save contacts." };
    window.localStorage.setItem(key, json);
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
      return { ok: false, message: "Browser storage full. Remove contacts or clear site data." };
    }
    return { ok: false, message: e instanceof Error ? e.message : "Could not save contacts." };
  }
}
