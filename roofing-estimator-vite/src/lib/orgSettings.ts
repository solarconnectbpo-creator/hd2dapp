import type { ContactRecord } from "./contactsCsv";

export const CONTACTS_STORAGE_KEY = "roofing-estimator-vite-contacts-v1";
export const ORG_SETTINGS_STORAGE_KEY = "roofing-estimator-vite-org-v1";

export type OrgTemplateProfile = "residential" | "commercial";
export type OwnerFallbackProvider = "none" | "batchdata-relaxed";

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
  /**
   * ArcGIS Feature layer REST URL through the layer id, e.g.
   * `https://…/arcgis/rest/services/MyMap/FeatureServer/0` — used as a Mapbox overlay on Canvassing.
   */
  arcgisFeatureLayerUrl: string;
  /** Optional ArcGIS API token / key for private layers (also settable via VITE_ARCGIS_API_KEY). */
  arcgisApiKey: string;
  /** Optional non-MO owner/contact fallback provider. */
  ownerFallbackProvider: OwnerFallbackProvider;
  /** Optional API key specifically for fallback provider; if empty, app falls back to BatchData key. */
  ownerFallbackApiKey: string;
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
    arcgisFeatureLayerUrl: "",
    arcgisApiKey: "",
    ownerFallbackProvider: "none",
    ownerFallbackApiKey: "",
  };
}

export function loadOrgSettings(): OrgSettings {
  try {
    const raw = window.localStorage.getItem(ORG_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultOrgSettings();
    const p = JSON.parse(raw) as Partial<OrgSettings>;
    return { ...defaultOrgSettings(), ...p };
  } catch {
    return defaultOrgSettings();
  }
}

export function saveOrgSettings(org: OrgSettings): void {
  const r = saveOrgSettingsSafe(org);
  if (!r.ok) throw new Error(r.message);
}

/**
 * If `VITE_ARCGIS_API_KEY` is set but org storage has no key yet, copy env → localStorage
 * so the token appears under Contacts & settings and survives without re-reading `.env` in some flows.
 * Does not overwrite a key already saved in the browser.
 */
export function syncArcgisApiKeyFromEnvToOrgIfNeeded(): void {
  if (typeof window === "undefined") return;
  const env = import.meta.env.VITE_ARCGIS_API_KEY?.trim();
  if (!env) return;
  const org = loadOrgSettings();
  if (org.arcgisApiKey?.trim()) return;
  saveOrgSettingsSafe({ ...org, arcgisApiKey: env });
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
    window.localStorage.setItem(ORG_SETTINGS_STORAGE_KEY, json);
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
    const raw = window.localStorage.getItem(CONTACTS_STORAGE_KEY);
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
    window.localStorage.setItem(CONTACTS_STORAGE_KEY, json);
    return { ok: true };
  } catch (e) {
    if (e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22)) {
      return { ok: false, message: "Browser storage full. Remove contacts or clear site data." };
    }
    return { ok: false, message: e instanceof Error ? e.message : "Could not save contacts." };
  }
}
