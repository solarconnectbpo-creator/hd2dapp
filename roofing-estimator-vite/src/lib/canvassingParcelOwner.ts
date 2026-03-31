/**
 * Best-effort owner / site / parcel id from Missouri open-data style parcel objects (STL intel layer).
 * Field names vary by county/city extract — match common patterns case-insensitively.
 */

function str(v: unknown): string {
  if (v == null) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.trim();
}

const OWNER_KEY_REGEXES = [
  /^owner_?name$/i,
  /^tax_?name$/i,
  /^taxname$/i,
  /^prop_?owner$/i,
  /^property_?owner$/i,
  /^deed_?hold$/i,
  /^deed_?name$/i,
  /^mail_?name$/i,
  /^mailing_?name$/i,
  /^primary_?owner$/i,
  /^own_?name$/i,
  /^owner$/i,
  /^taxpayer$/i,
  /^grantee$/i,
];

export function extractOwnerFromParcel(parcel: Record<string, unknown> | null): string {
  if (!parcel) return "";
  const entries = Object.entries(parcel);
  for (const rx of OWNER_KEY_REGEXES) {
    for (const [k, v] of entries) {
      if (rx.test(k)) {
        const s = str(v);
        if (s.length > 1 && !/^[\d.\s-]+$/i.test(s)) return s;
      }
    }
  }
  for (const [k, v] of entries) {
    if (/owner|taxpayer|deed|grantee/i.test(k) && typeof v === "string") {
      const s = v.trim();
      if (s.length > 2) return s;
    }
  }
  return "";
}

const SITE_KEY_REGEXES = [
  /^site_?addr/i,
  /^sit_?addr/i,
  /^site_?address$/i,
  /^address$/i,
  /^prop_?addr/i,
  /^location_?addr/i,
  /^str_?num/i,
];

export function extractSiteAddressFromParcel(parcel: Record<string, unknown> | null): string {
  if (!parcel) return "";
  const entries = Object.entries(parcel);
  for (const rx of SITE_KEY_REGEXES) {
    for (const [k, v] of entries) {
      if (rx.test(k)) {
        const s = str(v);
        if (s.length > 3) return s;
      }
    }
  }
  return "";
}

const PARCEL_ID_REGEXES = [/^parcel_?id$/i, /^pin$/i, /^apn$/i, /^parcel$/i, /^objectid$/i, /^tlid$/i, /^pid$/i];

export function extractParcelIdFromParcel(parcel: Record<string, unknown> | null): string {
  if (!parcel) return "";
  const entries = Object.entries(parcel);
  for (const rx of PARCEL_ID_REGEXES) {
    for (const [k, v] of entries) {
      if (rx.test(k)) {
        const s = str(v);
        if (s) return s;
      }
    }
  }
  return "";
}

/** Sorted key-value rows for UI (skip huge blobs). */
export function parcelRowsForDisplay(
  parcel: Record<string, unknown>,
  maxRows = 18,
): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const keys = Object.keys(parcel).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    if (out.length >= maxRows) break;
    const v = parcel[key];
    if (v != null && typeof v === "object" && !Array.isArray(v)) continue;
    const value = str(v);
    if (!value || value.length > 280) continue;
    out.push({ key, value });
  }
  return out;
}

/** Compact notes block for estimator handoff / record-keeping. */
export function buildParcelHandoffNotes(parcel: Record<string, unknown>): string {
  const rows = parcelRowsForDisplay(parcel, 24);
  if (!rows.length) return "";
  return ["Missouri open parcel (public assessor extract)", ...rows.map((r) => `${r.key}: ${r.value}`)].join("\n");
}
