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
  /^owner_?name_?1$/i,
  /^owner_?name_?2$/i,
  /^owner_?name_?full$/i,
  /^prop_?owner_?name$/i,
  /^prop_?owner$/i,
  /^property_?owner_?name$/i,
  /^tax_?name$/i,
  /^taxname$/i,
  /^property_?owner$/i,
  /^deed_?hold$/i,
  /^deed_?name$/i,
  /^mail_?name$/i,
  /^mailing_?name$/i,
  /^mail_?to_?name$/i,
  /^primary_?owner$/i,
  /^own_?name$/i,
  /^owner$/i,
  /^owners?$/i,
  /^taxpayer$/i,
  /^grantee$/i,
  /^OWNER_NAME$/i,
  /^OWN_NAME$/i,
  /^PARCEL_OWNER$/i,
  /^DEEDHOLDER$/i,
  /^FULLNAME$/i,
  /^PNAME$/i,
];

/** Keys that look like site/mail/parcel location — never use as owner name. */
const OWNER_KEY_EXCLUDE =
  /address|addr|street|city|zip|mail_?line|owner_?mailing|mailing_?line|mail_?addr|situs|location|parcel|pin|apn|lat|lon|lng|coord|shape|objectid|fid|gid|globalid|acre|sq_?ft|lot|class|zoning|use$/i;

/** Try these first (case-insensitive key match). Order: primary owner before secondary. */
const OWNER_PRIORITY_KEYS = [
  "OWNER_NAME",
  "OWNERNAME",
  "OWNER_NAME_1",
  "OWNER1_NAME",
  "OWNER_NAME_FULL",
  "OWNERFULLNAME",
  "OWN_NAME",
  "PARCEL_OWNER",
  "PROP_OWNER",
  "PROP_OWNER_NAME",
  "PROPERTY_OWNER",
  "PROPERTY_OWNER_NAME",
  "TAX_NAME",
  "TAXPAYER_NAME",
  "DEEDHOLDER",
  "DEED_NAME",
  "PRIMARY_OWNER",
  "FULLNAME",
  "GRANTEE",
  "OWNER_NAME_2",
  "MAIL_NAME",
  "MAILING_NAME",
  "MAIL_TO_NAME",
  "PNAME",
  "OWNERCURRENT",
  "OWNER_CURRENT",
];

function getKeyCaseInsensitive(parcel: Record<string, unknown>, key: string): unknown {
  const u = key.toUpperCase();
  for (const [k, v] of Object.entries(parcel)) {
    if (k.toUpperCase() === u) return v;
  }
  return undefined;
}

function isPlausibleOwnerName(s: string): boolean {
  const t = s.trim();
  if (t.length < 2) return false;
  if (/^[\d.\s-]+$/i.test(t)) return false;
  const u = t.toUpperCase();
  if (/^(UNKNOWN|N\/A|N\/A\.|TBD|VACANT|NONE|NULL|TEST|\.+|-+)$/i.test(u)) return false;
  return true;
}

export function extractOwnerFromParcel(parcel: Record<string, unknown> | null): string {
  if (!parcel) return "";
  for (const pk of OWNER_PRIORITY_KEYS) {
    const v = getKeyCaseInsensitive(parcel, pk);
    const s = str(v);
    if (isPlausibleOwnerName(s)) return s;
  }
  const entries = Object.entries(parcel);
  for (const rx of OWNER_KEY_REGEXES) {
    for (const [k, v] of entries) {
      if (OWNER_KEY_EXCLUDE.test(k)) continue;
      if (rx.test(k)) {
        const s = str(v);
        if (isPlausibleOwnerName(s)) return s;
      }
    }
  }
  for (const [k, v] of entries) {
    if (OWNER_KEY_EXCLUDE.test(k)) continue;
    if (/owner|taxpayer|deed|grantee/i.test(k) && typeof v === "string") {
      if (/address|addr|street|situs|location|parcel|apn|pin|lat|lon|coord/i.test(k) && !/mail/i.test(k)) {
        continue;
      }
      const s = v.trim();
      if (isPlausibleOwnerName(s)) return s;
    }
  }

  const first = str(getKeyCaseInsensitive(parcel, "OWNER_FIRST_NAME"));
  const last = str(getKeyCaseInsensitive(parcel, "OWNER_LAST_NAME"));
  const combined = [first, last].filter(Boolean).join(" ").trim();
  if (isPlausibleOwnerName(combined)) return combined;

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
  maxRows = 100,
  maxValueChars = 520,
): Array<{ key: string; value: string }> {
  const out: Array<{ key: string; value: string }> = [];
  const keys = Object.keys(parcel).sort((a, b) => a.localeCompare(b));
  for (const key of keys) {
    if (out.length >= maxRows) break;
    const v = parcel[key];
    if (v != null && typeof v === "object" && !Array.isArray(v)) continue;
    const value = str(v);
    if (!value || value.length > maxValueChars) continue;
    out.push({ key, value });
  }
  return out;
}

/** Compact notes block for estimator handoff / record-keeping. */
export function buildParcelHandoffNotes(parcel: Record<string, unknown>): string {
  const rows = parcelRowsForDisplay(parcel, 48);
  if (!rows.length) return "";
  return ["Missouri open parcel (public assessor extract)", ...rows.map((r) => `${r.key}: ${r.value}`)].join("\n");
}

/**
 * Merge Intel parcel with attributes from an ArcGIS / GeoJSON feature (click).
 * **Intel wins on key collision** — MO intel is normalized assessor data; GIS may duplicate or alias fields.
 * GIS-only keys still fill gaps Intel does not have.
 */
export function mergeParcelAttributes(
  intelParcel: Record<string, unknown> | null,
  featureAttributes: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!featureAttributes || Object.keys(featureAttributes).length === 0) return intelParcel;
  if (!intelParcel || Object.keys(intelParcel).length === 0) return { ...featureAttributes };
  return { ...featureAttributes, ...intelParcel };
}

const PHONE_KEY_RX =
  /phone|tel|mobile|cell|voice|dayphone|evephone|homephone|workphone|fax|owner_?phone|phone_?num|phonenumber|day_?phone|night_?phone|cell_?phone|contact_?phone|res_?phone|bus_?phone|primary_?phone/i;
const EMAIL_KEY_RX = /e-?mail|emailaddr|contactemail|owner_?email|email_?1/i;
const MAIL_ADDR_RX = /mail(ing)?_?(addr|address|line)|owner_?mail|tax_?mail|mail_?addr|sit_?mail/i;
/** Avoid bare "square" (e.g. price per square) and generic "area" without building context. */
const SQFT_KEY_RX =
  /(sq_?ft|sqft|\bsf\b|gsf|gross_?sf|living_?sf|bldg_?sf|building_?sf|living_?area|gross_?area|bldg_?area|res_?gross|com_?gross|improv|footprint|total_?bldg)/i;
const YEAR_BUILT_KEY_RX = /year_?built|yr_?blt|eff_?year_?built|res_?year_?built|const_?year/i;
const YEAR_KEY_EXCLUDE = /tax|fiscal|assessment|sale|certif|record/i;
const LOT_KEY_RX = /lot_?size|land_?area|lot_?sq|acre/i;

/** Explicit building-size fields only — never use Shape_Area / map geometry as living sq ft. */
const BUILDING_SQFT_FALLBACK_KEYS = [
  "BLDG_SQFT",
  "BUILDING_SQFT",
  "LIVING_SQFT",
  "TOTAL_SQFT",
  "SQFT",
  "RES_GROSS_AREA",
  "GROSS_BUILDING_AREA",
  "GBA",
  "BLD_SQFT",
  "IMPROV_SQFT",
];

function formatAssessorPhone(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const d = t.replace(/\D/g, "");
  const core = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  if (core.length === 10) return `(${core.slice(0, 3)}) ${core.slice(3, 6)}-${core.slice(6)}`;
  return t;
}

function firstNumericField(parcel: Record<string, unknown>, rx: RegExp): string {
  for (const [k, v] of Object.entries(parcel)) {
    if (!rx.test(k)) continue;
    const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return String(Math.round(n));
  }
  return "";
}

function firstStringField(parcel: Record<string, unknown>, rx: RegExp, minLen = 2): string {
  for (const [k, v] of Object.entries(parcel)) {
    if (!rx.test(k)) continue;
    const s = str(v);
    if (s.length >= minLen) return s;
  }
  return "";
}

/** Build mailing line from common split assessor fields. */
function buildMailingAddress(parcel: Record<string, unknown>): string {
  const line1 = str(
    getKeyCaseInsensitive(parcel, "MAIL_ADDR1") ??
      getKeyCaseInsensitive(parcel, "MAIL_ADDRESS1") ??
      getKeyCaseInsensitive(parcel, "MAIL_LINE1") ??
      getKeyCaseInsensitive(parcel, "MAIL_STREET") ??
      getKeyCaseInsensitive(parcel, "OWNER_MAILING_LINE1") ??
      getKeyCaseInsensitive(parcel, "MADDR1") ??
      getKeyCaseInsensitive(parcel, "MAIL_ADDRESS_LINE1") ??
      getKeyCaseInsensitive(parcel, "OWNER_MAIL_ADDR1"),
  );
  const line2 = str(
    getKeyCaseInsensitive(parcel, "MAIL_ADDR2") ??
      getKeyCaseInsensitive(parcel, "MAIL_LINE2") ??
      getKeyCaseInsensitive(parcel, "MADDR2"),
  );
  const city = str(
    getKeyCaseInsensitive(parcel, "MAIL_CITY") ??
      getKeyCaseInsensitive(parcel, "OWNER_MAIL_CITY") ??
      getKeyCaseInsensitive(parcel, "PROP_MAIL_CITY") ??
      getKeyCaseInsensitive(parcel, "MCITY"),
  );
  const st = str(getKeyCaseInsensitive(parcel, "MAIL_STATE") ?? getKeyCaseInsensitive(parcel, "OWNER_MAIL_STATE"));
  const zip = str(
    getKeyCaseInsensitive(parcel, "MAIL_ZIP") ??
      getKeyCaseInsensitive(parcel, "OWNER_MAIL_ZIP") ??
      getKeyCaseInsensitive(parcel, "ZIP") ??
      getKeyCaseInsensitive(parcel, "MZIP"),
  );
  const combined = [line1, line2, [city, st, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  if (combined.length > 5) return combined;
  const single = firstStringField(parcel, MAIL_ADDR_RX, 8);
  return single;
}

/** When field names omit "phone", scan short string values for US phone patterns. */
function phoneFromParcelScan(parcel: Record<string, unknown>): string {
  const fromKeys = formatAssessorPhone(firstStringField(parcel, PHONE_KEY_RX, 7));
  if (fromKeys) return fromKeys;
  const us10 = /\b(\d{3})\s*[-.]?\s*(\d{3})\s*[-.]?\s*(\d{4})\b/;
  for (const v of Object.values(parcel)) {
    const s = str(v);
    if (s.length > 96) continue;
    const m = s.match(us10);
    if (m) return formatAssessorPhone(m[0]);
  }
  return "";
}

/** When field names omit "email", scan short values for @ addresses. */
function emailFromParcelScan(parcel: Record<string, unknown>): string {
  const fromKeys = firstStringField(parcel, EMAIL_KEY_RX, 4).trim();
  if (fromKeys) return fromKeys;
  const at = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
  for (const v of Object.values(parcel)) {
    const s = str(v);
    if (s.length > 160) continue;
    const m = s.match(at);
    if (m) return m[0];
  }
  return "";
}

/** Auto-fill fields for PropertyImportPayload from merged parcel / GIS attributes. */
export function extractParcelAutoFill(parcel: Record<string, unknown> | null): {
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerMailingAddress: string;
  areaSqFt: string;
  yearBuilt: string;
  lotSizeSqFt: string;
} {
  if (!parcel) {
    return {
      ownerName: "",
      ownerPhone: "",
      ownerEmail: "",
      ownerMailingAddress: "",
      areaSqFt: "",
      yearBuilt: "",
      lotSizeSqFt: "",
    };
  }
  const ownerName = extractOwnerFromParcel(parcel);
  const ownerPhone = phoneFromParcelScan(parcel);
  const ownerEmail = emailFromParcelScan(parcel);
  const ownerMailingAddress = buildMailingAddress(parcel);
  let areaSqFt = firstNumericField(parcel, SQFT_KEY_RX);
  if (!areaSqFt) {
    for (const k of BUILDING_SQFT_FALLBACK_KEYS) {
      const v = parcel[k];
      const n = typeof v === "number" ? v : Number.parseFloat(String(v ?? "").replace(/,/g, ""));
      if (Number.isFinite(n) && n > 50 && n < 10_000_000) {
        areaSqFt = String(Math.round(n));
        break;
      }
    }
  }
  let yearBuilt = "";
  for (const [k, v] of Object.entries(parcel)) {
    if (YEAR_KEY_EXCLUDE.test(k)) continue;
    if (!YEAR_BUILT_KEY_RX.test(k)) continue;
    const y = typeof v === "number" ? v : Number.parseInt(String(v).replace(/\D/g, ""), 10);
    if (Number.isFinite(y) && y >= 1700 && y <= new Date().getFullYear() + 1) {
      yearBuilt = String(y);
      break;
    }
  }
  let lotSizeSqFt = firstNumericField(parcel, LOT_KEY_RX);
  if (!lotSizeSqFt && parcel.ACRES != null) {
    const a = typeof parcel.ACRES === "number" ? parcel.ACRES : Number.parseFloat(String(parcel.ACRES));
    if (Number.isFinite(a) && a > 0) lotSizeSqFt = String(Math.round(a * 43_560));
  }
  return {
    ownerName,
    ownerPhone,
    ownerEmail,
    ownerMailingAddress,
    areaSqFt,
    yearBuilt,
    lotSizeSqFt,
  };
}

export type ParcelAutoFillSnapshot = ReturnType<typeof extractParcelAutoFill>;

/**
 * Dev-only: logs Intel vs GIS attribute keys, sample scalar values, and mapped auto-fill.
 * Use the browser console while clicking parcels to align county-specific field names. No-op in production builds.
 */
export function debugLogParcelEnrichment(ctx: {
  lat: number;
  lng: number;
  intelParcel: Record<string, unknown> | null;
  arcgisFeatureProps: Record<string, unknown> | null;
  merged: Record<string, unknown> | null;
  autoFill: ParcelAutoFillSnapshot;
}): void {
  if (!import.meta.env.DEV) return;
  const summarize = (p: Record<string, unknown> | null): Record<string, string | number | boolean> | null => {
    if (!p) return null;
    const out: Record<string, string | number | boolean> = {};
    for (const [k, v] of Object.entries(p)) {
      if (v != null && typeof v === "object" && !Array.isArray(v)) continue;
      if (typeof v === "number" || typeof v === "boolean") {
        out[k] = v;
        continue;
      }
      if (Array.isArray(v)) {
        const s = JSON.stringify(v);
        out[k] = s.length > 120 ? `${s.slice(0, 117)}...` : s;
        continue;
      }
      const s = String(v);
      out[k] = s.length > 120 ? `${s.slice(0, 117)}...` : s;
    }
    return out;
  };
  console.debug(
    "[canvassing parcel debug]",
    JSON.stringify(
      {
        lat: ctx.lat,
        lng: ctx.lng,
        intelKeys: ctx.intelParcel ? Object.keys(ctx.intelParcel).sort() : [],
        gisKeys: ctx.arcgisFeatureProps ? Object.keys(ctx.arcgisFeatureProps).sort() : [],
        mergedKeyCount: ctx.merged ? Object.keys(ctx.merged).length : 0,
        intelPropsSample: summarize(ctx.intelParcel),
        gisPropsSample: summarize(ctx.arcgisFeatureProps),
        autoFill: ctx.autoFill,
      },
      null,
      2,
    ),
  );
}
