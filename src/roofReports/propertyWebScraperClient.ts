/**
 * PropertyWebScraper API client.
 *
 * Source project:
 * https://github.com/RealEstateWebTools/property_web_scraper
 */

export interface PropertyScraperListing {
  sourceUrl: string;
  title?: string;
  address?: string;
  lat?: number;
  lng?: number;
  priceText?: string;
  beds?: number;
  baths?: number;
  areaSqFt?: number;
  /** Heuristic 0–100: commercial / multifamily / large-building signal for roofing targets (verify on site). */
  listingLeadScore?: number;
  /** Explanations for listingLeadScore */
  commercialSignals?: string[];
  debug?: {
    addressSource?: string;
    latitudeSource?: string;
    longitudeSource?: string;
  };
  raw?: unknown;
}

const DEFAULT_BASE =
  process.env.EXPO_PUBLIC_PROPERTY_SCRAPER_API_BASE_URL?.trim() ||
  "https://scraper.propertywebbuilder.com";
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") ||
  "http://localhost:8787";
const USE_PROXY =
  process.env.EXPO_PUBLIC_PROPERTY_SCRAPER_USE_PROXY !== "false";

function toNum(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in obj && obj[k] != null) return obj[k];
  }
  return undefined;
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function deepFindFirst(
  input: unknown,
  keys: string[],
  maxDepth = 6,
): unknown {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const walk = (node: unknown, depth: number): unknown => {
    if (depth > maxDepth) return undefined;
    if (Array.isArray(node)) {
      for (const it of node) {
        const found = walk(it, depth + 1);
        if (found != null) return found;
      }
      return undefined;
    }
    const obj = asObject(node);
    if (!obj) return undefined;
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (wanted.has(k.toLowerCase())) return v;
    }
    for (const v of Object.values(obj)) {
      const found = walk(v, depth + 1);
      if (found != null) return found;
    }
    return undefined;
  };
  return walk(input, 0);
}

function composeAddress(node: unknown): string | undefined {
  const obj = asObject(node);
  if (!obj) return undefined;
  let line1 = toStr(
    pick(obj, [
      "addressLine1",
      "address_line1",
      "street",
      "streetAddress",
      "street_address",
    ]),
  );
  if (!line1) {
    const sn = toStr(pick(obj, ["street_number"]));
    const snm = toStr(pick(obj, ["street_name"]));
    const combined = [sn, snm].filter(Boolean).join(" ").trim();
    if (combined) line1 = combined;
  }
  const line2 = toStr(pick(obj, ["addressLine2", "address_line2"]));
  const city = toStr(pick(obj, ["city", "town", "locality"]));
  const state = toStr(pick(obj, ["state", "region", "province"]));
  const zip = toStr(pick(obj, ["zip", "postalCode", "postcode", "postal_code"]));
  const left = [line1, line2].filter(Boolean).join(" ").trim();
  const right = [city, state, zip].filter(Boolean).join(", ").trim();
  const out = [left, right].filter(Boolean).join(", ").trim();
  return out || undefined;
}

function deepFindFirstWithPath(
  input: unknown,
  keys: string[],
  maxDepth = 6,
): { value: unknown; path: string } | undefined {
  const wanted = new Set(keys.map((k) => k.toLowerCase()));
  const walk = (
    node: unknown,
    depth: number,
    path: string,
  ): { value: unknown; path: string } | undefined => {
    if (depth > maxDepth) return undefined;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const found = walk(node[i], depth + 1, `${path}[${i}]`);
        if (found) return found;
      }
      return undefined;
    }
    const obj = asObject(node);
    if (!obj) return undefined;
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      if (wanted.has(k.toLowerCase())) return { value: v, path: `${path}.${k}` };
    }
    for (const [k, v] of Object.entries(obj)) {
      const found = walk(v, depth + 1, `${path}.${k}`);
      if (found) return found;
    }
    return undefined;
  };
  return walk(input, 0, "root");
}

const LISTING_COMMERCIAL_KEYWORD_RULES: { re: RegExp; label: string }[] = [
  {
    re: /\b(commercial|retail|office|industrial|warehouse|medical\s+office|mixed[-\s]?use)\b/i,
    label: "Commercial / office / retail wording in listing text",
  },
  {
    re: /\b(strip\s*center|shopping\s*center|plaza|nnn|cap\s*rate|income\s+property|investment)\b/i,
    label: "Investment or retail-center wording",
  },
  {
    re: /\b(multifamily|multi[-\s]family|apartment\s+complex|\d+\s*\+?\s*units?\b|\bunits?:\s*\d+)/i,
    label: "Multifamily or multiple units wording",
  },
];

function collectListingTextBlob(data: Record<string, unknown>, root: Record<string, unknown>): string {
  const chunks: string[] = [];
  const add = (v: unknown) => {
    if (typeof v === "string" && v.trim()) chunks.push(v.trim());
  };
  add(data.title);
  add(data.headline);
  add(data.name);
  add(data.description);
  add(data.description_html);
  add(data.property_type);
  add(data.property_subtype);
  add(data.listing_status);
  add(data.tenure);
  for (const v of Object.values(root)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const o = v as Record<string, unknown>;
      add(o.description);
      add(o.description_html);
    }
  }
  return chunks.join(" \n ").slice(0, 12000);
}

/**
 * Heuristic score for whether a scraped listing is a strong commercial roofing prospect.
 */
export function scoreListingCommercialRoofingSignal(input: {
  title?: string;
  address?: string;
  areaSqFt?: number;
  beds?: number;
  propertyTypeRaw?: string;
  textBlob: string;
}): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;
  const pt = (input.propertyTypeRaw ?? "").trim();
  if (
    pt &&
    /\b(commercial|industrial|retail|office|warehouse|multifamily|multi[-\s]family|apartment)\b/i.test(
      pt,
    )
  ) {
    score += 22;
    signals.push("Listing type field suggests commercial or multifamily use");
  }
  const blob = `${input.title ?? ""} ${input.address ?? ""} ${input.textBlob}`;
  const keywordHits: string[] = [];
  for (const { re, label } of LISTING_COMMERCIAL_KEYWORD_RULES) {
    if (re.test(blob) && !keywordHits.includes(label)) keywordHits.push(label);
  }
  if (keywordHits.length) {
    score += Math.min(26, keywordHits.length * 13);
    signals.push(...keywordHits);
  }
  const sqft = input.areaSqFt;
  if (typeof sqft === "number" && Number.isFinite(sqft) && sqft > 0) {
    if (sqft >= 25_000) {
      score += 14;
      signals.push("25k+ sq ft in listing");
    } else if (sqft >= 10_000) {
      score += 10;
      signals.push("10k+ sq ft in listing");
    } else if (sqft >= 5000) {
      score += 6;
      signals.push("5k+ sq ft in listing");
    } else if (sqft >= 2500) {
      score += 3;
      signals.push("2.5k+ sq ft in listing");
    }
  }
  if (input.beds === 0 && typeof sqft === "number" && sqft >= 2000) {
    score += 8;
    signals.push("Zero beds with notable floor area (possible commercial)");
  }
  score = Math.min(100, score);
  return { score, signals };
}

export function normalizePropertyScraperListing(
  sourceUrl: string,
  raw: unknown,
): PropertyScraperListing {
  const root = (raw ?? {}) as Record<string, unknown>;
  const listingsArr = root.listings;
  const listingsFirst =
    Array.isArray(listingsArr) &&
    listingsArr.length > 0 &&
    typeof listingsArr[0] === "object" &&
    listingsArr[0] !== null
      ? (listingsArr[0] as Record<string, unknown>)
      : undefined;
  const data =
    (root.data as Record<string, unknown> | undefined) ??
    (root.listing as Record<string, unknown> | undefined) ??
    listingsFirst ??
    root;

  const dataCoords = asObject(data.coordinates);
  let latSource: string | undefined;
  let lngSource: string | undefined;
  let lat = toNum(pick(data, ["lat", "latitude"]));
  if (lat !== undefined) latSource = "data.lat|latitude";
  if (lat === undefined) {
    lat = toNum(dataCoords?.lat);
    if (lat !== undefined) latSource = "data.coordinates.lat";
  }
  if (lat === undefined) {
    lat = toNum(dataCoords?.latitude);
    if (lat !== undefined) latSource = "data.coordinates.latitude";
  }
  if (lat === undefined) {
    const deepLat = deepFindFirstWithPath(root, ["lat", "latitude"]);
    lat = toNum(deepLat?.value);
    if (lat !== undefined) latSource = deepLat?.path;
  }

  let lng = toNum(pick(data, ["lng", "lon", "longitude"]));
  if (lng !== undefined) lngSource = "data.lng|lon|longitude";
  if (lng === undefined) {
    lng = toNum(dataCoords?.lng);
    if (lng !== undefined) lngSource = "data.coordinates.lng";
  }
  if (lng === undefined) {
    lng = toNum(dataCoords?.longitude);
    if (lng !== undefined) lngSource = "data.coordinates.longitude";
  }
  if (lng === undefined) {
    lng = toNum(dataCoords?.lon);
    if (lng !== undefined) lngSource = "data.coordinates.lon";
  }
  if (lng === undefined) {
    const deepLng = deepFindFirstWithPath(root, ["lng", "lon", "longitude"]);
    lng = toNum(deepLng?.value);
    if (lng !== undefined) lngSource = deepLng?.path;
  }

  const areaSqFt =
    toNum(pick(data, ["areaSqFt", "area_sqft", "sqft", "square_feet", "constructed_area"])) ??
    toNum(asObject(data.area)?.sqft) ??
    toNum(deepFindFirst(root, ["areaSqFt", "area_sqft", "sqft", "square_feet", "constructed_area"]));

  const addrDirect = toStr(
    pick(data, [
      "address",
      "address_string",
      "full_address",
      "display_address",
      "location",
    ]),
  );
  let addressSource: string | undefined;
  if (addrDirect) {
    addressSource =
      "data.address|address_string|full_address|display_address|location";
  }
  const addrComposed =
    composeAddress(data.location) ??
    composeAddress(data.address) ??
    composeAddress(data) ??
    composeAddress(deepFindFirst(root, ["location", "address_obj", "address"]));
  if (!addressSource && addrComposed) addressSource = "composed(location/address parts)";
  const addrDeep = toStr(
    deepFindFirst(root, [
      "address",
      "address_string",
      "full_address",
      "display_address",
      "streetAddress",
      "street_address",
      "formattedAddress",
    ]),
  );
  if (!addressSource && addrDeep) addressSource = "deep(address fields)";

  if (lat === 0 && lng === 0) {
    lat = undefined;
    lng = undefined;
    latSource = undefined;
    lngSource = undefined;
  }

  const resolvedTitle = toStr(pick(data, ["title", "headline", "name"]));
  const resolvedAddress = addrDirect || addrComposed || addrDeep;
  const bedsNum = toNum(pick(data, ["beds", "bedrooms", "count_bedrooms"]));
  const textBlob = collectListingTextBlob(data, root);
  const propertyTypeRaw =
    [
      toStr(pick(data, ["property_type", "propertyType"])),
      toStr(pick(data, ["property_subtype", "propertySubtype"])),
    ]
      .filter(Boolean)
      .join(" ") || "";

  const { score: listingLeadScore, signals: commercialSignals } =
    scoreListingCommercialRoofingSignal({
      title: resolvedTitle,
      address: resolvedAddress,
      areaSqFt,
      beds: bedsNum,
      propertyTypeRaw,
      textBlob,
    });

  return {
    sourceUrl,
    title: resolvedTitle,
    address: resolvedAddress,
    lat,
    lng,
    priceText:
      toStr(pick(data, ["price", "priceText", "formatted_price", "price_string"])) ||
      toStr(deepFindFirst(root, ["price", "priceText", "formatted_price", "price_string"])),
    beds: bedsNum,
    baths: toNum(pick(data, ["baths", "bathrooms", "count_bathrooms"])),
    areaSqFt,
    listingLeadScore,
    commercialSignals: commercialSignals.length ? commercialSignals : undefined,
    debug: {
      addressSource,
      latitudeSource: latSource,
      longitudeSource: lngSource,
    },
    raw,
  };
}

export async function fetchListingFromPropertyWebScraper(
  listingUrl: string,
): Promise<PropertyScraperListing> {
  const u = listingUrl.trim();
  if (!u) throw new Error("Listing URL is required.");
  const directEndpoint = `${DEFAULT_BASE.replace(/\/+$/, "")}/public_api/v1/listings?url=${encodeURIComponent(u)}`;
  const proxyEndpoint = `${API_BASE}/api/property-scraper/listing?url=${encodeURIComponent(u)}`;

  const candidates = USE_PROXY
    ? [proxyEndpoint, directEndpoint]
    : [directEndpoint, proxyEndpoint];

  let lastError = "";
  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint, { headers: { Accept: "application/json" } });
      const text = await res.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `Property scraper returned non-JSON: ${text.slice(0, 220)}`,
        );
      }
      if (!res.ok) {
        throw new Error(
          `Property scraper ${res.status}: ${JSON.stringify(json).slice(0, 260)}`,
        );
      }
      return normalizePropertyScraperListing(u, json);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(lastError || "Property scraper request failed");
}

