/**
 * STL parcel intel (Cloudflare Worker) — same base URL as `getHd2dApiBase()`.
 */

import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";

export function getIntelApiBase(): string {
  return getHd2dApiBase();
}

/** Missouri bounds — Worker STL intel layers; skip fetch outside state to avoid noise. */
export const MISSOURI_BBOX = { west: -95.78, east: -89.09, north: 40.62, south: 35.99 } as const;

/** Illinois state bounds — parcel map fallbacks include several IL counties (not statewide parcels). */
export const ILLINOIS_BBOX = { west: -91.52, east: -87.02, north: 42.51, south: 36.97 } as const;

export function isInMissouriBbox(lat: number, lng: number): boolean {
  return (
    lat >= MISSOURI_BBOX.south &&
    lat <= MISSOURI_BBOX.north &&
    lng >= MISSOURI_BBOX.west &&
    lng <= MISSOURI_BBOX.east
  );
}

export function isInIllinoisBbox(lat: number, lng: number): boolean {
  return (
    lat >= ILLINOIS_BBOX.south &&
    lat <= ILLINOIS_BBOX.north &&
    lng >= ILLINOIS_BBOX.west &&
    lng <= ILLINOIS_BBOX.east
  );
}

/** True when public MO/IL parcel overlays may apply (metro counties + primary STL layer). */
export function isInMoIlParcelCoverageBbox(lat: number, lng: number): boolean {
  return isInMissouriBbox(lat, lng) || isInIllinoisBbox(lat, lng);
}

export type StlIntelLite = {
  parcel: Record<string, unknown> | null;
};

export async function fetchStlIntelAtPoint(lat: number, lng: number): Promise<StlIntelLite | null> {
  if (!isInMissouriBbox(lat, lng)) return null;
  const base = getIntelApiBase();
  if (!base) return null;
  try {
    const res = await fetch(
      `${base}/api/stl/intel?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
    if (!res.ok) return null;
    const json = await readJsonResponseBody<{ data?: { parcel?: Record<string, unknown> | null } }>(res);
    return { parcel: json.data?.parcel ?? null };
  } catch {
    return null;
  }
}
