/**
 * BatchData Property Search API — address-based property + owner fields (licensed data, not HTML scraping).
 * Dev/preview (same-origin): Vite proxy `/batchdata-api/...` → api.batchdata.com.
 * Production build: HD2D Worker `POST /api/batchdata/property-search` (see `getHd2dApiBase()` / `VITE_INTEL_API_BASE`).
 * Comply with https://batchdata.io terms and your account limits.
 */

import { getHd2dApiBase } from "./hd2dApiBase";
import { mapRecordToImportPayload, type PropertyImportPayload } from "./propertyScraper";
import { isViteDevProxyOrigin } from "./viteApiProxy";

export const PROPERTY_SCRAPER_BATCHDATA_KEY_STORAGE = "roofing-estimator-vite-batchdata-api-key";

function batchdataPropertySearchUrl(): string {
  if (isViteDevProxyOrigin()) {
    return "/batchdata-api/api/v1/property/search";
  }
  return `${getHd2dApiBase()}/api/batchdata/property-search`;
}

export type BatchDataAddressCriteria = {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
};

/** Parse "123 Main St, Austin, TX 78701" style lines into BatchData searchCriteria.address. */
export function parseUsAddressLineForBatchData(line: string): BatchDataAddressCriteria | null {
  const parts = line
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const last = parts[parts.length - 1]!;
  const stateZip = last.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (stateZip && parts.length >= 3) {
    return {
      street_address: parts.slice(0, -2).join(", "),
      city: parts[parts.length - 2]!,
      state: stateZip[1]!.toUpperCase(),
      zip_code: stateZip[2]!,
    };
  }

  if (parts.length >= 3) {
    /** "123 Main St, Austin, TX" (no ZIP) — BatchData accepts empty zip_code. */
    const stOnly = last.match(/^([A-Za-z]{2})\s*$/i);
    if (stOnly) {
      const streetPart = parts.slice(0, -2).join(", ").trim();
      const cityPart = parts[parts.length - 2]!.trim();
      if (streetPart && cityPart) {
        return {
          street_address: streetPart,
          city: cityPart,
          state: stOnly[1]!.toUpperCase(),
          zip_code: "",
        };
      }
    }

    const maybeZip = last.match(/^(\d{5}(?:-\d{4})?)$/);
    if (maybeZip) {
      const stPart = parts[parts.length - 2]!;
      const st = stPart.match(/^([A-Za-z]{2})$/)?.[1]?.toUpperCase();
      if (st) {
        return {
          street_address: parts.slice(0, -3).join(", ") || parts[0]!,
          city: parts[parts.length - 3]!,
          state: st,
          zip_code: maybeZip[1]!,
        };
      }
    }
  }

  return null;
}

function extractBatchDataErrorMessage(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const o = json as { status?: { message?: string; text?: string; code?: number } };
  const m = o.status?.message ?? o.status?.text;
  return m ? String(m) : null;
}

function scorePropertyLikeObject(o: Record<string, unknown>): number {
  let score = 0;
  const keys = Object.keys(o).map((k) => k.toLowerCase());
  const has = (sub: string) => keys.some((k) => k.includes(sub));
  if (has("address") || has("street") || has("formatted")) score += 2;
  if (has("owner") || has("tax") || has("parcel")) score += 2;
  /** BatchData / assessor-style keys that still identify a property record */
  if (has("apn") || has("fips") || has("assessor") || has("deed") || has("mailing")) score += 1;
  if (has("square") || has("sqft") || has("building")) score += 1;
  if (has("year")) score += 1;
  if (o.owner && typeof o.owner === "object") score += 2;
  return score;
}

/** Walk JSON and pick the most property-like object (BatchData response shapes vary by product tier). */
export function extractBatchDataPropertyRecord(root: unknown): Record<string, unknown> | null {
  let bestScore = -1;
  let bestObj: Record<string, unknown> | null = null;

  const visit = (v: unknown) => {
    if (v == null || typeof v !== "object") return;
    if (Array.isArray(v)) {
      for (const x of v) visit(x);
      return;
    }
    const o = v as Record<string, unknown>;
    const score = scorePropertyLikeObject(o);
    /** BatchData tiers sometimes return slim objects (address + one assessor field). */
    if (score >= 2 && score > bestScore) {
      bestScore = score;
      bestObj = o;
    }
    for (const k of Object.keys(o)) visit(o[k]);
  };

  visit(root);
  return bestObj;
}

async function readJsonResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { parseError: true, raw: text.slice(0, 500) };
  }
}

export type BatchDataSearchOk = {
  ok: true;
  payload: PropertyImportPayload;
  /** Raw property object from the API response (for assessor / tax fields not mapped to `PropertyImportPayload`). */
  rawRecord: Record<string, unknown>;
};
export type BatchDataSearchErr = { ok: false; message: string };

/** US state/province full name → 2-letter (Nominatim sometimes returns full state names). */
const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function normalizeUsStateCode(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (t.length === 2) return t.toUpperCase();
  return US_STATE_NAME_TO_CODE[t.toLowerCase()] ?? "";
}

/**
 * Build BatchData search criteria from Nominatim reverse-geocode JSON (`display_name` + `address`).
 * Falls back to structured `address` when `display_name` is not parseable by `parseUsAddressLineForBatchData`
 * (e.g. trailing "United States" or extra locality segments).
 */
export function nominatimReverseToBatchDataCriteria(args: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}): BatchDataAddressCriteria | null {
  const dn = args.display_name?.replace(/,?\s*United States\s*$/i, "").trim();
  if (dn) {
    const parsed = parseUsAddressLineForBatchData(dn);
    if (parsed) return parsed;
  }

  const a = args.address;
  if (!a) return null;

  const road =
    [a.house_number, a.road].filter(Boolean).join(" ").trim() ||
    String(a.road ?? "").trim() ||
    String(a.pedestrian ?? "").trim();
  const city = String(
    a.city || a.town || a.village || a.suburb || a.hamlet || a.municipality || "",
  ).trim();
  const postcode = String(a.postcode ?? "").trim();
  const stateRaw = String(a.state ?? "").trim();
  let state = normalizeUsStateCode(stateRaw);

  if (!state && args.display_name) {
    const m = args.display_name.match(/\b([A-Za-z]{2})\s+\d{5}(?:-\d{4})?\b/);
    if (m?.[1]) state = m[1].toUpperCase();
  }

  if (!road || !city || !state) return null;

  return {
    street_address: road,
    city,
    state,
    zip_code: postcode,
  };
}

/** Best-effort lines for assessor / tax display from a BatchData property object. */
export function formatTaxSummaryFromBatchDataRecord(record: Record<string, unknown>): string {
  const lines: string[] = [];
  const add = (label: string, v: unknown) => {
    if (v == null || v === "") return;
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    const t = s.trim();
    if (t) lines.push(`${label}: ${t}`);
  };

  add("APN / Parcel", record.apn ?? record.parcelNumber ?? record.parcelId ?? record.parcel_id);
  add("FIPS", record.fips ?? record.fipsCode);
  add("County", record.countyName ?? record.county ?? record.county_name);
  add("Assessed value", record.assessedValue ?? record.totalAssessedValue ?? record.assessedValueAmount);
  add("Market value", record.marketValue ?? record.totalMarketValue);
  add(
    "Annual / tax amount",
    record.annualTax ??
      record.taxAmount ??
      record.propertyTaxAmount ??
      record.totalTaxAmount ??
      record.taxBillAmount,
  );
  add("Tax year", record.taxYear);

  const assessor = record.assessor;
  if (assessor && typeof assessor === "object") {
    const o = assessor as Record<string, unknown>;
    add("Assessor (assessed)", o.assessedValue ?? o.totalAssessedValue ?? o.totalValue);
  }

  const tax = record.tax;
  if (tax && typeof tax === "object") {
    const o = tax as Record<string, unknown>;
    add("Tax (detail)", o.amount ?? o.annualAmount ?? o.total);
  }

  return lines.join("\n");
}

/**
 * POST /api/v1/property/search with searchCriteria.address (BatchData v1).
 */
export async function fetchBatchDataPropertyByAddress(
  apiKey: string,
  criteria: BatchDataAddressCriteria,
): Promise<BatchDataSearchOk | BatchDataSearchErr> {
  const key = apiKey.trim();
  if (!key) return { ok: false, message: "BatchData API key is empty." };
  if (!criteria.street_address || !criteria.city || !criteria.state) {
    return { ok: false, message: "Street, city, and state are required for BatchData search." };
  }

  const url = batchdataPropertySearchUrl();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        searchCriteria: {
          address: {
            street_address: criteria.street_address,
            city: criteria.city,
            state: criteria.state,
            zip_code: criteria.zip_code || "",
          },
        },
      }),
    });
  } catch (e) {
    const hint = isViteDevProxyOrigin()
      ? ""
      : " Run the HD2D Worker (wrangler dev on port 8787) or set VITE_INTEL_API_BASE to a deployed Worker so BatchData requests use /api/batchdata/property-search.";
    return {
      ok: false,
      message: `Network error calling BatchData (${e instanceof Error ? e.message : String(e)}).${hint}`,
    };
  }

  const json = await readJsonResponse(res);
  if (!res.ok) {
    const apiMsg = extractBatchDataErrorMessage(json);
    const suffix = apiMsg ? `: ${apiMsg}` : "";
    return { ok: false, message: `BatchData ${res.status}${suffix}` };
  }

  const record = extractBatchDataPropertyRecord(json);
  if (!record) {
    return {
      ok: false,
      message:
        "BatchData returned 200 but no property object was found in the response. Check the network tab raw JSON or contact BatchData support for your response schema.",
    };
  }

  const payload = mapRecordToImportPayload(record, "batchdata");
  if (!payload) {
    return { ok: false, message: "Could not map BatchData record to a property row (missing address)." };
  }
  return { ok: true, payload, rawRecord: record };
}

/** Merge API-derived fields into an existing row; keeps non-empty manual/CSV values. */
export function mergeBatchDataIntoPropertyRow(
  base: PropertyImportPayload,
  fromApi: PropertyImportPayload,
): PropertyImportPayload {
  const pick = (a: string, b: string) => (a.trim() ? a : b);
  return {
    ...base,
    address: pick(base.address, fromApi.address),
    stateCode: pick(base.stateCode, fromApi.stateCode),
    latitude: pick(base.latitude, fromApi.latitude),
    longitude: pick(base.longitude, fromApi.longitude),
    areaSqFt: pick(base.areaSqFt, fromApi.areaSqFt),
    yearBuilt: pick(base.yearBuilt, fromApi.yearBuilt),
    lotSizeSqFt: pick(base.lotSizeSqFt, fromApi.lotSizeSqFt),
    propertyType: base.propertyType !== "other" ? base.propertyType : fromApi.propertyType,
    ownerName: pick(base.ownerName, fromApi.ownerName),
    ownerPhone: pick(base.ownerPhone, fromApi.ownerPhone),
    ownerEmail: pick(base.ownerEmail, fromApi.ownerEmail),
    contactPersonName: pick(base.contactPersonName, fromApi.contactPersonName),
    contactPersonPhone: pick(base.contactPersonPhone, fromApi.contactPersonPhone),
    ownerEntityType: pick(base.ownerEntityType, fromApi.ownerEntityType),
    ownerMailingAddress: pick(base.ownerMailingAddress, fromApi.ownerMailingAddress),
    ownerPmEntityLabel: pick(base.ownerPmEntityLabel ?? "", fromApi.ownerPmEntityLabel ?? "") || undefined,
    notes: [base.notes, fromApi.notes].filter(Boolean).join("\n"),
    source: base.source,
  };
}

export type BatchDataBulkOptions = {
  limit: number;
  delayMs: number;
  skipIfOwnerPresent: boolean;
};

export async function enrichPropertyRecordsWithBatchData(
  rows: PropertyImportPayload[],
  apiKey: string,
  opts: BatchDataBulkOptions,
): Promise<{ results: PropertyImportPayload[]; filled: number; skipped: number; failed: number }> {
  const results = [...rows];
  let filled = 0;
  let skipped = 0;
  let failed = 0;
  let calls = 0;

  for (let i = 0; i < results.length; i++) {
    if (calls >= opts.limit) break;
    const row = results[i]!;
    if (opts.skipIfOwnerPresent && row.ownerName.trim()) {
      skipped++;
      continue;
    }
    const criteria = parseUsAddressLineForBatchData(row.address);
    if (!criteria) {
      skipped++;
      continue;
    }

    const r = await fetchBatchDataPropertyByAddress(apiKey, criteria);
    calls++;
    if (!r.ok) {
      failed++;
      results[i] = {
        ...row,
        notes: row.notes + (row.notes ? "\n" : "") + `BatchData error: ${r.message}`,
      };
    } else {
      filled++;
      results[i] = mergeBatchDataIntoPropertyRow(row, r.payload);
    }

    if (calls < opts.limit && i < results.length - 1 && opts.delayMs > 0) {
      await new Promise((res) => setTimeout(res, opts.delayMs));
    }
  }

  return { results, filled, skipped, failed };
}
