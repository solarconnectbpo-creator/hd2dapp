/**
 * STL parcel intel (Cloudflare Worker) — same base URL as `getHd2dApiBase()`.
 */

import { getHd2dApiBase } from "./hd2dApiBase";

export function getIntelApiBase(): string {
  return getHd2dApiBase();
}

/** Missouri bounds — Worker serves St. Louis–oriented layers; skip fetch outside state to avoid noise. */
export const MISSOURI_BBOX = { west: -95.78, east: -89.09, north: 40.62, south: 35.99 } as const;

export function isInMissouriBbox(lat: number, lng: number): boolean {
  return (
    lat >= MISSOURI_BBOX.south &&
    lat <= MISSOURI_BBOX.north &&
    lng >= MISSOURI_BBOX.west &&
    lng <= MISSOURI_BBOX.east
  );
}

export type StlIntelLite = {
  parcel: Record<string, unknown> | null;
};

export async function fetchStlIntelAtPoint(lat: number, lng: number): Promise<StlIntelLite | null> {
  if (!isInMissouriBbox(lat, lng)) return null;
  const base = getIntelApiBase();
  try {
    const res = await fetch(
      `${base}/api/stl/intel?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { parcel?: Record<string, unknown> | null } };
    return { parcel: json.data?.parcel ?? null };
  } catch {
    return null;
  }
}
