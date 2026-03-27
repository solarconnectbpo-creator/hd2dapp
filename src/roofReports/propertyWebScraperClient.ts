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
  const line1 = toStr(
    pick(obj, ["addressLine1", "address_line1", "street", "streetAddress"]),
  );
  const line2 = toStr(pick(obj, ["addressLine2", "address_line2"]));
  const city = toStr(pick(obj, ["city", "town", "locality"]));
  const state = toStr(pick(obj, ["state", "region", "province"]));
  const zip = toStr(pick(obj, ["zip", "postalCode", "postcode"]));
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

export function normalizePropertyScraperListing(
  sourceUrl: string,
  raw: unknown,
): PropertyScraperListing {
  const root = (raw ?? {}) as Record<string, unknown>;
  const data =
    (root.data as Record<string, unknown> | undefined) ??
    (root.listing as Record<string, unknown> | undefined) ??
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
    toNum(pick(data, ["areaSqFt", "area_sqft", "sqft", "square_feet"])) ??
    toNum(asObject(data.area)?.sqft) ??
    toNum(deepFindFirst(root, ["areaSqFt", "area_sqft", "sqft", "square_feet"]));

  const addrDirect = toStr(
    pick(data, ["address", "full_address", "display_address", "location"]),
  );
  let addressSource: string | undefined;
  if (addrDirect) addressSource = "data.address|full_address|display_address|location";
  const addrComposed =
    composeAddress(data.location) ??
    composeAddress(data.address) ??
    composeAddress(deepFindFirst(root, ["location", "address_obj", "address"]));
  if (!addressSource && addrComposed) addressSource = "composed(location/address parts)";
  const addrDeep = toStr(
    deepFindFirst(root, [
      "address",
      "full_address",
      "display_address",
      "streetAddress",
      "formattedAddress",
    ]),
  );
  if (!addressSource && addrDeep) addressSource = "deep(address fields)";

  return {
    sourceUrl,
    title: toStr(pick(data, ["title", "headline", "name"])),
    address: addrDirect || addrComposed || addrDeep,
    lat,
    lng,
    priceText:
      toStr(pick(data, ["price", "priceText", "formatted_price"])) ||
      toStr(deepFindFirst(root, ["price", "priceText", "formatted_price"])),
    beds: toNum(pick(data, ["beds", "bedrooms"])),
    baths: toNum(pick(data, ["baths", "bathrooms"])),
    areaSqFt,
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

