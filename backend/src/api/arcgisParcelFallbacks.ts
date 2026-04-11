/**
 * Extra public parcel FeatureServer/MapServer layers where the primary layer
 * (default: St. Louis County) has no coverage. Queried only when the map click or map
 * bbox intersects each region’s WGS84 box (best-effort rectangles).
 *
 * Built-ins: MO / IL / MN metros (`moIlParcelFallbackRegions`, `mnParcelFallbackRegions`) plus
 * `usParcelFallbackRegions` (other states + DC). Optional Worker var ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON:
 * JSON array of `{ "id", "layerUrl", "west", "south", "east", "north" }` appended to the list.
 */

import { MO_IL_PARCEL_FALLBACK_REGIONS, type ParcelFallbackRegion } from "./moIlParcelFallbackRegions";
import { MN_PARCEL_FALLBACK_REGIONS } from "./mnParcelFallbackRegions";
import { US_PARCEL_FALLBACK_REGIONS } from "./usParcelFallbackRegions";

export type { ParcelFallbackRegion };

/** Built-in MO/IL regions; same reference as MO_IL_PARCEL_FALLBACK_REGIONS. */
export const DEFAULT_MO_IL_PARCEL_FALLBACKS = MO_IL_PARCEL_FALLBACK_REGIONS;

function assertUniqueParcelFallbackIds(regions: readonly ParcelFallbackRegion[]): void {
  const seen = new Set<string>();
  for (const r of regions) {
    if (seen.has(r.id)) throw new Error(`Duplicate parcel fallback id: ${r.id}`);
    seen.add(r.id);
  }
}

/** Built-in MO, IL, MN, and other U.S. public parcel regions before optional Worker JSON. */
export const BUILT_IN_PARCEL_FALLBACK_REGIONS: readonly ParcelFallbackRegion[] = [
  ...MO_IL_PARCEL_FALLBACK_REGIONS,
  ...MN_PARCEL_FALLBACK_REGIONS,
  ...US_PARCEL_FALLBACK_REGIONS,
];

assertUniqueParcelFallbackIds(BUILT_IN_PARCEL_FALLBACK_REGIONS);

const LAYER_URL_TAIL = /\/(FeatureServer|MapServer)\/\d+$/i;

function isValidParcelFallbackRegion(x: unknown): x is ParcelFallbackRegion {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const id = o.id;
  const layerUrl = o.layerUrl;
  const west = o.west;
  const south = o.south;
  const east = o.east;
  const north = o.north;
  if (typeof id !== "string" || !id.trim()) return false;
  if (typeof layerUrl !== "string" || !LAYER_URL_TAIL.test(layerUrl.trim())) return false;
  if (![west, south, east, north].every((n) => typeof n === "number" && Number.isFinite(n))) return false;
  if (west >= east || south >= north) return false;
  return true;
}

/** Parses optional Worker JSON; invalid entries are skipped. */
export function parseExtraParcelFallbacksJson(raw: string | undefined): ParcelFallbackRegion[] {
  const s = (raw ?? "").trim();
  if (!s) return [];
  try {
    const data = JSON.parse(s) as unknown;
    if (!Array.isArray(data)) return [];
    const out: ParcelFallbackRegion[] = [];
    for (const item of data) {
      if (isValidParcelFallbackRegion(item)) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

export function allParcelFallbackRegions(env: { ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON?: string }): ParcelFallbackRegion[] {
  return [...BUILT_IN_PARCEL_FALLBACK_REGIONS, ...parseExtraParcelFallbacksJson(env.ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON)];
}

export function pointInParcelFallbackRegion(lat: number, lng: number, r: ParcelFallbackRegion): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lng >= r.west && lng <= r.east && lat >= r.south && lat <= r.north;
}

export function bboxIntersectsParcelFallbackRegion(
  west: number,
  south: number,
  east: number,
  north: number,
  r: ParcelFallbackRegion,
): boolean {
  if (![west, south, east, north].every(Number.isFinite)) return false;
  if (west >= east || south >= north) return false;
  return !(east < r.west || west > r.east || north < r.south || south > r.north);
}

export function parcelFallbackUrlsForPoint(
  lat: number,
  lng: number,
  env?: { ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON?: string },
): string[] {
  const regions = env ? allParcelFallbackRegions(env) : [...BUILT_IN_PARCEL_FALLBACK_REGIONS];
  const urls: string[] = [];
  for (const region of regions) {
    if (pointInParcelFallbackRegion(lat, lng, region)) urls.push(region.layerUrl);
  }
  return urls;
}
