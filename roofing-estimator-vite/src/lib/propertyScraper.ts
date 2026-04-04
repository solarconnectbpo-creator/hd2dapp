/**
 * Property lead rows: CSV import, JSON paste, optional Google Places + PDL in the UI.
 * Bulk owner / phone / PM discovery for B2B commercial roofing: use Cursor **Parallel** (`/parallel-enrich`)
 * on a seed list (addresses or LLC names), then upload the enriched CSV here — no RentCast.
 */

export const PENDING_PROPERTY_IMPORT_KEY = "roofing-pending-property-import-v1";
/** Mirrors pending import JSON so a remount (e.g. React Strict Mode) can still consume it after localStorage was cleared. */
export const PENDING_PROPERTY_IMPORT_SESSION_KEY = "roofing-pending-property-import-session-v1";

/** `rentcast` kept only for decoding older saved payloads / JSON. */
export type PropertyImportSource =
  | "csv-upload"
  | "json-paste"
  | "import"
  | "rentcast"
  | "batchdata"
  | "dealmachine";

export interface PropertyImportPayload {
  address: string;
  stateCode: string;
  latitude: string;
  longitude: string;
  areaSqFt: string;
  yearBuilt: string;
  lotSizeSqFt: string;
  propertyType: "residential" | "commercial" | "multi-family" | "other";
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  /** Individual you are calling (PM, principal, site contact) — distinct from LLC / deed name in ownerName */
  contactPersonName: string;
  /** Direct / mobile line for contactPersonName (Places/PDL main lines often stay in ownerPhone) */
  contactPersonPhone: string;
  /** e.g. "Individual" | "Organization" when present on import */
  ownerEntityType: string;
  /** Tax / assessor mailing for owner (often matches PM / corporate office) */
  ownerMailingAddress: string;
  /**
   * When the record is an Organization (or LLC-style name), the assessor name is often the PM entity on the deed.
   * Omitted on older saved imports.
   */
  ownerPmEntityLabel?: string;
  notes: string;
  source: PropertyImportSource;
  /**
   * Heuristic 0–100: stronger commercial-roofing lead (type, org owner, size, contacts, portfolio).
   * Set by `rankCommercialPropertyLeads` — verify before outreach.
   */
  leadScore?: number;
  /** Short explanations for leadScore */
  leadScoreReasons?: string[];
  /** Rows in this batch sharing the same primary owner name (portfolio hint). */
  ownerPortfolioCount?: number;
}

export interface PendingPropertyImportOptions {
  autoEstimate?: boolean;
  importFootprint?: boolean;
}

export interface PendingPropertyImportEnvelope {
  payload: PropertyImportPayload;
  options?: PendingPropertyImportOptions;
  /** GIS building footprint from Canvassing — applied on measurement map when `options.importFootprint`. */
  buildingFootprint?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
}

/** Default row for CSV / manual assembly. */
/**
 * Assessor/BatchData payloads sometimes populate `contactPersonName` / `ownerPmEntityLabel` or
 * `contactPersonPhone` without mirroring them into `ownerName` / `ownerPhone`. Copy across so
 * Canvassing owner-lock and proposal client fields stay consistent.
 */
export function normalizePropertyImportPayloadContacts(p: PropertyImportPayload): PropertyImportPayload {
  let ownerName = p.ownerName.trim();
  if (!ownerName) {
    ownerName = p.contactPersonName.trim() || (p.ownerPmEntityLabel ?? "").trim();
  }
  let ownerPhone = p.ownerPhone.trim();
  if (!ownerPhone) {
    ownerPhone = p.contactPersonPhone.trim();
  }
  return { ...p, ownerName, ownerPhone };
}

export function emptyPropertyImportPayload(
  source: PropertyImportSource,
  overrides: Partial<PropertyImportPayload> = {},
): PropertyImportPayload {
  return {
    address: "",
    stateCode: "",
    latitude: "",
    longitude: "",
    areaSqFt: "",
    yearBuilt: "",
    lotSizeSqFt: "",
    propertyType: "other",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    contactPersonName: "",
    contactPersonPhone: "",
    ownerEntityType: "",
    ownerMailingAddress: "",
    notes: "",
    source,
    ...overrides,
  };
}

/** Best-effort 2-letter state from trailing ", ST" or ", ST ZIP" in a US-style line. */
export function inferStateCodeFromAddressLine(address: string): string {
  const m = address.trim().match(/,\s*([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?\s*$/);
  return m ? m[1]!.toUpperCase() : "";
}

export function mapPropertyType(raw: unknown): PropertyImportPayload["propertyType"] {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("apartment")) return "commercial"; // 5+ unit — treat as commercial portfolio target
  if (s.includes("commercial") || s.includes("office") || s.includes("retail")) return "commercial";
  if (s.includes("multi") || s.includes("duplex")) return "multi-family";
  if (s.includes("single") || s.includes("residential") || s.includes("house") || s.includes("townhouse")) {
    return "residential";
  }
  return "other";
}

const PM_NAME_RX =
  /\b(management|properties|holdings|realty|partners|investments|llc|l\.l\.c\.|lp|inc\.?|corp\.?|trust)\b/i;

export function isLikelyPropertyManagerOrCommercialOwner(name: string, entityType: string): boolean {
  const t = entityType.trim().toLowerCase();
  if (t === "organization") return true;
  return PM_NAME_RX.test(name);
}

function pickFirstNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    if (v == null) continue;
    const n = typeof v === "number" ? v : Number.parseFloat(String(v).replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function pushUniquePhone(bucket: string[], raw: unknown): void {
  if (raw == null) return;
  if (typeof raw === "string" || typeof raw === "number") {
    const s = String(raw).trim();
    if (s && !bucket.includes(s)) bucket.push(s);
    return;
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const k of ["number", "phone", "phoneNumber", "value", "formatted"]) {
      const s = String(o[k] ?? "").trim();
      if (s && !bucket.includes(s)) bucket.push(s);
    }
  }
}

function collectPhonesFromRecord(row: Record<string, unknown>, ownerBlock: Record<string, unknown> | undefined): string {
  const phones: string[] = [];
  const flatKeys = [
    "owner1Phone",
    "owner2Phone",
    "owner3Phone",
    "ownerPhone",
    "contactPhone",
    "dayPhone",
    "eveningPhone",
    "phone",
    "primaryPhone",
    "mobilePhone",
    "homePhone",
    "workPhone",
    "businessPhone",
    "mailingPhone",
    "assessorPhone",
  ];
  for (const k of flatKeys) pushUniquePhone(phones, row[k]);

  if (ownerBlock) {
    pushUniquePhone(phones, ownerBlock.phone);
    pushUniquePhone(phones, ownerBlock.phoneNumber);
    pushUniquePhone(phones, ownerBlock.primaryPhone);
    pushUniquePhone(phones, ownerBlock.mobilePhone);
    pushUniquePhone(phones, ownerBlock.homePhone);
    pushUniquePhone(phones, ownerBlock.workPhone);
    const arr = ownerBlock.phones;
    if (Array.isArray(arr)) for (const x of arr) pushUniquePhone(phones, x);
    const contacts = ownerBlock.contacts;
    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        if (c && typeof c === "object") {
          const co = c as Record<string, unknown>;
          pushUniquePhone(phones, co.phone);
          pushUniquePhone(phones, co.phoneNumber);
          pushUniquePhone(phones, co.mobile);
        }
      }
    }
  }
  return phones.join(" | ");
}

function collectEmailsFromRecord(row: Record<string, unknown>, ownerBlock: Record<string, unknown> | undefined): string {
  const emails: string[] = [];
  const add = (v: unknown) => {
    const s = String(v ?? "").trim();
    if (s.includes("@") && !emails.includes(s)) emails.push(s);
  };
  add(row.owner1Email);
  add(row.owner2Email);
  add(row.ownerEmail);
  add(row.contactEmail);
  add(row.email);
  if (ownerBlock) {
    add(ownerBlock.email);
    add(ownerBlock.primaryEmail);
    const contacts = ownerBlock.contacts;
    if (Array.isArray(contacts)) {
      for (const c of contacts) {
        if (c && typeof c === "object") add((c as Record<string, unknown>).email);
      }
    }
  }
  return emails.join(" | ");
}

/** Normalize property JSON (exports, devtools, Parallel output, etc.) into our import shape. */
export function mapRecordToImportPayload(
  row: Record<string, unknown>,
  source: PropertyImportSource,
): PropertyImportPayload | null {
  const line1 = String(row.addressLine1 ?? row.line1 ?? row.street_address ?? row.streetAddress ?? "").trim();
  const city = String(row.city ?? "").trim();
  const st = String(row.state ?? row.stateCode ?? "").trim();
  const zip = String(row.zipCode ?? row.zip ?? row.postalCode ?? row.zip_code ?? "").trim();
  const formatted = String(row.formattedAddress ?? row.formatted_address ?? row.address ?? "").trim();
  const address =
    formatted ||
    [line1, city, st, zip].filter(Boolean).join(", ") ||
    String(row.streetAddress ?? "").trim();

  if (!address) return null;

  const lat = pickFirstNumber(row.latitude, row.lat, (row as { location?: { latitude?: number } }).location?.latitude);
  const lng = pickFirstNumber(
    row.longitude,
    row.lng,
    row.lon,
    (row as { location?: { longitude?: number } }).location?.longitude,
  );

  const sqft = pickFirstNumber(
    row.squareFootage,
    row.livingArea,
    row.livingAreaSquareFeet,
    row.totalBuildingAreaSquareFeet,
    row.finishedSqFt,
  );
  const lot = pickFirstNumber(row.lotSize, row.lotSquareFeet, row.lotSizeSquareFeet);
  const year = row.yearBuilt != null ? String(row.yearBuilt) : "";

  const first = String(row.owner1NameFirstName ?? "").trim();
  const last = String(row.owner1NameLastName ?? "").trim();
  const ownerCombined = [first, last].filter(Boolean).join(" ").trim();
  const first2 = String(row.owner2NameFirstName ?? "").trim();
  const last2 = String(row.owner2NameLastName ?? "").trim();
  const owner2Combined = [first2, last2].filter(Boolean).join(" ").trim();

  const ownerBlock = row.owner as Record<string, unknown> | undefined;
  const nameArr = ownerBlock?.names;
  const fromApiNames = Array.isArray(nameArr)
    ? nameArr.map((x) => String(x).trim()).filter(Boolean)
    : [];
  const ownerFromNested = fromApiNames.join(" | ").trim();
  const fallbacks = [
    String(row.companyName ?? "").trim(),
    String(row.taxPayerName ?? row.taxpayerName ?? "").trim(),
    String(row.mailingName ?? "").trim(),
    String(row.ownerName ?? "").trim(),
  ].filter(Boolean);

  let owner =
    ownerFromNested ||
    ownerCombined ||
    fallbacks[0] ||
    (typeof row.owner === "string" ? row.owner.trim() : "");

  if (owner2Combined) {
    owner = owner ? `${owner} | ${owner2Combined}` : owner2Combined;
  }
  if (!owner && fallbacks.length > 1) {
    owner = fallbacks.slice(1).join(" | ");
  }

  const ownerEntityType = String(ownerBlock?.type ?? row.ownerEntityType ?? "").trim();
  const mailBlock = ownerBlock?.mailingAddress as Record<string, unknown> | undefined;
  const ownerMailingAddress = String(mailBlock?.formattedAddress ?? "").trim();

  const ownerPhone = collectPhonesFromRecord(row, ownerBlock);
  const ownerEmail = collectEmailsFromRecord(row, ownerBlock);

  const orgLike =
    ownerEntityType.toLowerCase() === "organization" || isLikelyPropertyManagerOrCommercialOwner(owner, ownerEntityType);
  /** Assessor “Organization” / LLC-style name — often the property manager entity on the record. */
  const ownerPmEntityLabel = orgLike && owner ? owner : "";

  const stateCode = (st || address.match(/\b([A-Z]{2})\s+\d{5}/i)?.[1] || "").toUpperCase().slice(0, 2);

  const notesParts: string[] = [];
  if (source === "json-paste") notesParts.push("Imported via JSON paste.");
  if (source === "rentcast") notesParts.push("Legacy RentCast import (API removed — re-verify data).");
  if (source === "batchdata") notesParts.push("BatchData Property Search API — verify owner and contact fields before outreach.");
  if (source === "dealmachine") notesParts.push("DealMachine Public API — verify owner and contact fields before outreach.");
  const pt = String(row.propertyType ?? row.type ?? "").trim();
  if (pt) notesParts.push(`Assessor property type: ${pt}.`);
  if (ownerEntityType) notesParts.push(`Owner entity type: ${ownerEntityType}.`);
  if (ownerMailingAddress && ownerMailingAddress !== address) {
    notesParts.push(`Owner mailing address: ${ownerMailingAddress}.`);
  }
  if (isLikelyPropertyManagerOrCommercialOwner(owner, ownerEntityType)) {
    notesParts.push("Flag: name/entity suggests LLC, management company, or institutional owner — verify for roofing bids.");
  }
  const lastSale = row.lastSalePrice != null ? `Last sale price (record): ${row.lastSalePrice}` : "";
  if (lastSale) notesParts.push(lastSale);

  return {
    address,
    stateCode: stateCode || "",
    latitude: lat != null ? String(lat) : "",
    longitude: lng != null ? String(lng) : "",
    areaSqFt: sqft != null ? sqft.toFixed(2) : "",
    yearBuilt: year,
    lotSizeSqFt: lot != null ? String(Math.round(lot)) : "",
    propertyType: mapPropertyType(row.propertyType ?? row.type),
    ownerName: owner,
    ownerPhone,
    ownerEmail,
    contactPersonName: "",
    contactPersonPhone: "",
    ownerEntityType,
    ownerMailingAddress,
    ownerPmEntityLabel,
    notes: notesParts.join("\n"),
    source,
  };
}

/** Best-effort parse of JSON copied from devtools / exports (nested objects OK). */
export function parsePropertyJsonPaste(text: string): PropertyImportPayload | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed);
  } catch {
    return null;
  }

  const candidates: Record<string, unknown>[] = [];
  const visit = (v: unknown) => {
    if (!v || typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    const o = v as Record<string, unknown>;
    candidates.push(o);
    for (const k of Object.keys(o)) {
      visit(o[k]);
    }
  };
  visit(obj);

  for (const row of candidates) {
    const p = mapRecordToImportPayload(row, "json-paste");
    if (p?.address) return p;
  }
  return null;
}

export function parsePendingPropertyImport(raw: string): PendingPropertyImportEnvelope | null {
  try {
    const parsed = JSON.parse(raw) as Partial<PendingPropertyImportEnvelope> | PropertyImportPayload;
    if (parsed && typeof parsed === "object" && "payload" in parsed) {
      const env = parsed as PendingPropertyImportEnvelope;
      if (env.payload?.address) return env;
      return null;
    }
    const legacy = parsed as PropertyImportPayload;
    if (legacy?.address) return { payload: legacy };
    return null;
  } catch {
    return null;
  }
}

export function stashPendingPropertyImport(
  payload: PropertyImportPayload,
  options?: PendingPropertyImportOptions,
  buildingFootprint?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null,
): void {
  try {
    const envelope: PendingPropertyImportEnvelope = {
      payload,
      options,
      ...(buildingFootprint != null ? { buildingFootprint } : {}),
    };
    const json = JSON.stringify(envelope);
    window.localStorage.setItem(PENDING_PROPERTY_IMPORT_KEY, json);
    try {
      window.sessionStorage.setItem(PENDING_PROPERTY_IMPORT_SESSION_KEY, json);
    } catch {
      /* private mode */
    }
  } catch {
    /* quota */
  }
}
