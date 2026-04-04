/**
 * ArcGIS via HD2D Worker — layer URLs and tokens live server-side only.
 */

import { getHd2dApiBase } from "./hd2dApiBase";
import { getStoredSession } from "./authClient";
import { readJsonResponseBody } from "./readJsonResponse";
import type { ParcelAtPointOutcome } from "./arcgisParcelAtPoint";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

function authHeaders(): HeadersInit {
  const s = getStoredSession();
  const h: Record<string, string> = { Accept: "application/json" };
  if (s?.token) h.Authorization = `Bearer ${s.token}`;
  return h;
}

export type ParcelGeoJsonResult =
  | { ok: true; data: GeoJSON.FeatureCollection }
  | { ok: false; message: string };

/** GeoJSON for map overlay. Optional bbox loads parcels intersecting the map view (recommended). */
export async function fetchArcgisParcelGeoJsonViaBackend(
  bbox?: { west: number; south: number; east: number; north: number } | null,
): Promise<ParcelGeoJsonResult> {
  const base = apiBase();
  if (!base) return { ok: false, message: "Backend API base is not configured." };
  const q =
    bbox &&
    Number.isFinite(bbox.west) &&
    Number.isFinite(bbox.south) &&
    Number.isFinite(bbox.east) &&
    Number.isFinite(bbox.north)
      ? `?bbox=${[bbox.west, bbox.south, bbox.east, bbox.north].map((n) => n.toFixed(6)).join(",")}`
      : "";
  let res: Response;
  try {
    res = await fetch(`${base}/api/arcgis/parcel/geojson${q}`, {
      headers: authHeaders(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
  if (res.status === 401) {
    return { ok: false, message: "Sign in required for ArcGIS layer." };
  }
  if (!res.ok) {
    try {
      const err = await readJsonResponseBody<{ error?: string; success?: boolean }>(res);
      return { ok: false, message: err.error || `Parcel layer failed (HTTP ${res.status}).` };
    } catch {
      return { ok: false, message: `Parcel layer failed (HTTP ${res.status}).` };
    }
  }
  try {
    const data = await readJsonResponseBody<GeoJSON.FeatureCollection>(res);
    if (data?.type !== "FeatureCollection" || !Array.isArray(data.features)) {
      return { ok: false, message: "Invalid GeoJSON from server." };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, message: "Could not parse GeoJSON from server." };
  }
}

/** Point-in-polygon attributes using Worker-configured layers. */
export async function queryArcgisAtPointViaBackend(
  kind: "parcel" | "building",
  lat: number,
  lng: number,
): Promise<ParcelAtPointOutcome> {
  const base = apiBase();
  if (!base) {
    return { ok: false, reason: "no_layer", message: "Backend API is not configured." };
  }
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    kind,
  });
  let res: Response;
  try {
    res = await fetch(`${base}/api/arcgis/query-at-point?${params.toString()}`, {
      headers: authHeaders(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: "network", message: msg };
  }
  if (res.status === 401) {
    return { ok: false, reason: "api", message: "Sign in required for ArcGIS proxy." };
  }
  let data: unknown;
  try {
    data = await readJsonResponseBody(res);
  } catch {
    return { ok: false, reason: "api", message: "Invalid JSON from ArcGIS proxy." };
  }
  const rec = data as {
    ok?: boolean;
    attributes?: Record<string, unknown>;
    geometry?: GeoJSON.Geometry;
    reason?: string;
    message?: string;
  };
  if (rec.ok === true && rec.attributes && typeof rec.attributes === "object") {
    const out: { ok: true; attributes: Record<string, unknown>; geometry?: GeoJSON.Geometry } = {
      ok: true,
      attributes: rec.attributes,
    };
    const g = rec.geometry;
    if (g && typeof g === "object" && "type" in g) {
      out.geometry = g;
    }
    return out;
  }
  if (rec.ok === false && rec.reason === "no_hit") {
    return { ok: false, reason: "no_hit" };
  }
  if (rec.ok === false && rec.reason === "no_layer") {
    return { ok: false, reason: "no_layer", message: rec.message };
  }
  return {
    ok: false,
    reason: "api",
    message: rec.message || `ArcGIS proxy error (HTTP ${res.status}).`,
  };
}
