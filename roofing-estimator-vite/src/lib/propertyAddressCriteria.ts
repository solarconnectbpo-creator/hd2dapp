/**
 * US address parsing and nested JSON property extraction — shared by DealMachine and map enrichment.
 */

export type UsAddressSearchCriteria = {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
};

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

/** Parse "123 Main St, Austin, TX 78701" style lines into structured address parts. */
export function parseUsAddressLineForSearch(line: string): UsAddressSearchCriteria | null {
  let normalized = line.trim();
  normalized = normalized.replace(/,?\s*(United States|USA)\s*$/i, "").trim();
  const parts = normalized
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
      const st2 = stPart.match(/^([A-Za-z]{2})$/)?.[1]?.toUpperCase();
      if (st2) {
        return {
          street_address: parts.slice(0, -3).join(", ") || parts[0]!,
          city: parts[parts.length - 3]!,
          state: st2,
          zip_code: maybeZip[1]!,
        };
      }
      const stFull = normalizeUsStateCode(stPart);
      if (stFull.length === 2 && parts.length >= 4) {
        return {
          street_address: parts.slice(0, -3).join(", ") || parts[0]!,
          city: parts[parts.length - 3]!,
          state: stFull,
          zip_code: maybeZip[1]!,
        };
      }
    }

    const fullState = normalizeUsStateCode(last);
    if (fullState.length === 2 && parts.length >= 3) {
      const cityPart = parts[parts.length - 2]!.trim();
      const streetPart = parts.slice(0, -2).join(", ").trim();
      if (streetPart && cityPart) {
        return {
          street_address: streetPart,
          city: cityPart,
          state: fullState,
          zip_code: "",
        };
      }
    }
  }

  return null;
}

function scorePropertyLikeObject(o: Record<string, unknown>): number {
  let score = 0;
  const keys = Object.keys(o).map((k) => k.toLowerCase());
  const has = (sub: string) => keys.some((k) => k.includes(sub));
  if (has("address") || has("street") || has("formatted")) score += 2;
  if (has("owner") || has("tax") || has("parcel")) score += 2;
  if (has("apn") || has("fips") || has("assessor") || has("deed") || has("mailing")) score += 1;
  if (has("square") || has("sqft") || has("building")) score += 1;
  if (has("year")) score += 1;
  if (o.owner && typeof o.owner === "object") score += 2;
  return score;
}

/** Walk JSON and pick the most property-like object (API response shapes vary). */
export function extractNestedPropertyRecordFromJson(root: unknown): Record<string, unknown> | null {
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
    if (score >= 2 && score > bestScore) {
      bestScore = score;
      bestObj = o;
    }
    for (const k of Object.keys(o)) visit(o[k]);
  };

  visit(root);
  return bestObj;
}

/**
 * Build search criteria from Nominatim reverse-geocode JSON (`display_name` + `address`).
 */
export function nominatimReverseToAddressCriteria(args: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}): UsAddressSearchCriteria | null {
  const dn = args.display_name?.replace(/,?\s*United States\s*$/i, "").trim();
  if (dn) {
    const parsed = parseUsAddressLineForSearch(dn);
    if (parsed) return parsed;
  }

  const a = args.address;
  if (!a) return null;

  let road =
    [a.house_number, a.road].filter(Boolean).join(" ").trim() ||
    String(a.road ?? "").trim() ||
    String(a.pedestrian ?? "").trim() ||
    String(a.residential ?? "").trim();
  let city = String(
    a.city ||
      a.town ||
      a.village ||
      a.suburb ||
      a.hamlet ||
      a.municipality ||
      a.city_district ||
      a.neighbourhood ||
      a.quarter ||
      "",
  ).trim();
  if (!city) {
    const county = String(a.county ?? "")
      .replace(/\s+County$/i, "")
      .trim();
    if (county) city = county;
  }
  const postcode = String(a.postcode ?? "").trim();
  const stateRaw = String(a.state ?? "").trim();
  let state = normalizeUsStateCode(stateRaw);

  if (!state && args.display_name) {
    const m = args.display_name.match(/\b([A-Za-z]{2})\s+\d{5}(?:-\d{4})?\b/);
    if (m?.[1]) state = m[1].toUpperCase();
  }
  if (!state && dn) {
    const seg = dn
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const tail = seg[seg.length - 1] ?? "";
    const fromTail = normalizeUsStateCode(tail);
    if (fromTail.length === 2) state = fromTail;
  }

  if (!road && dn) {
    const firstSeg = dn.split(",")[0]?.trim() ?? "";
    if (firstSeg.length >= 4 && !/^[\d.-]+$/.test(firstSeg)) {
      road = firstSeg;
    }
  }
  if (!road) {
    const place = String(a.neighbourhood ?? a.suburb ?? a.quarter ?? a.hamlet ?? "").trim();
    if (place && city) road = `${place} (${city})`;
  }

  if (!road || !city || !state) return null;

  return {
    street_address: road,
    city,
    state,
    zip_code: postcode,
  };
}

/** Best-effort assessor / tax lines from a property API object (DealMachine, assessor JSON, etc.). */
export function formatAssessorTaxSummaryFromRecord(record: Record<string, unknown>): string {
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
