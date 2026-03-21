/**
 * Roof trace 3D helpers (web / Mapbox):
 * - Elevation from Map.queryTerrainElevation when terrain is loaded, else Mapbox Tilequery (terrain-v2).
 * - Rough pitch from elevation spread vs horizontal span (advisory only).
 */

import * as turf from "@turf/turf";
import type { Map as MapboxMap } from "mapbox-gl";

export interface RoofPoint3D {
  lng: number;
  lat: number;
  elevation?: number;
}

export interface RoofTrace3D {
  polygon2D: GeoJSON.Feature<GeoJSON.Polygon>;
  points3D: RoofPoint3D[];
  areaM2: number;
  areaSqFt: number;
  perimeterFt: number;
  avgElevationM?: number;
  estimatedPitch?: string;
}

/**
 * Mapbox Tilequery on mapbox-terrain-v2 (vector) — fallback when map terrain query is unavailable.
 */
export async function getElevationTilequery(
  lng: number,
  lat: number,
  mapboxToken: string,
): Promise<number | null> {
  try {
    const url = `https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/${lng},${lat}.json?access_token=${encodeURIComponent(mapboxToken)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: Array<{ properties?: Record<string, unknown> }>;
    };
    const props = data.features?.[0]?.properties;
    if (!props) return null;
    const ele = props.ele ?? props.elevation;
    if (typeof ele === "number" && Number.isFinite(ele)) return ele;
    if (typeof ele === "string") {
      const n = Number.parseFloat(ele);
      return Number.isFinite(n) ? n : null;
    }
  } catch (e) {
    console.warn("Elevation tilequery failed:", e);
  }
  return null;
}

/**
 * Prefer in-map terrain RGB (same source as the globe); falls back to Tilequery API.
 */
export async function getElevationAtLngLat(
  lng: number,
  lat: number,
  map: MapboxMap | null,
  mapboxToken: string,
): Promise<number | null> {
  if (map) {
    try {
      const q = map.queryTerrainElevation([lng, lat]);
      if (typeof q === "number" && Number.isFinite(q)) return q;
    } catch {
      // terrain not ready
    }
  }
  return getElevationTilequery(lng, lat, mapboxToken);
}

/**
 * Estimate roof pitch (rise:12) from corner elevations vs horizontal distance between
 * highest and lowest samples. If those coincide, uses ~¼ perimeter as a characteristic run.
 */
export function estimatePitchFrom3DTrace(
  points3D: RoofPoint3D[],
  perimeterMeters: number,
): string | undefined {
  const valid = points3D.filter((p) => p.elevation !== undefined);
  if (valid.length < 2) return undefined;

  const elevations = valid.map((p) => p.elevation!);
  const maxElev = Math.max(...elevations);
  const minElev = Math.min(...elevations);
  const riseM = maxElev - minElev;
  if (riseM < 0.05) return "0:12";

  const maxGroup = valid.filter((p) => p.elevation === maxElev);
  const minGroup = valid.filter((p) => p.elevation === minElev);
  let runM = 0;
  for (const a of maxGroup) {
    for (const b of minGroup) {
      const d = turf.distance(turf.point([a.lng, a.lat]), turf.point([b.lng, b.lat]), { units: "meters" });
      if (d > runM) runM = d;
    }
  }

  if (!Number.isFinite(runM) || runM < 1) {
    runM = Math.max(perimeterMeters / 4, 2);
  }

  const risePer12 = (riseM / runM) * 12;
  const rise = Math.min(24, Math.max(1, Math.round(risePer12)));
  return `${rise}:12`;
}

/**
 * Build 3D-aware roof trace metrics from a drawn polygon feature.
 */
export async function enhanceRoofTraceWith3D(
  polygonFeature: GeoJSON.Feature<GeoJSON.Polygon>,
  mapboxToken: string,
  map: MapboxMap | null,
): Promise<RoofTrace3D | null> {
  const geom = polygonFeature.geometry;
  if (!geom || geom.type !== "Polygon" || !geom.coordinates?.[0]?.length) return null;

  const ring = geom.coordinates[0];
  const corners = ring.slice(0, -1) as [number, number][];

  const points3D: RoofPoint3D[] = await Promise.all(
    corners.map(async ([lng, lat]) => {
      const elev = await getElevationAtLngLat(lng, lat, map, mapboxToken);
      return { lng, lat, elevation: elev ?? undefined };
    }),
  );

  const feature = turf.polygon([ring]);
  const areaM2 = turf.area(feature);
  const areaSqFt = areaM2 * 10.7639104167;
  let perimeterFt: number;
  try {
    const line = turf.polygonToLine(feature);
    perimeterFt = turf.length(line, { units: "feet" });
  } catch {
    perimeterFt = turf.length(turf.lineString(ring), { units: "feet" });
  }

  const perimeterM = turf.length(turf.lineString(ring), { units: "meters" });
  const estimatedPitch = estimatePitchFrom3DTrace(points3D, perimeterM);

  const defined = points3D.filter((p) => p.elevation !== undefined);
  const avgElevationM =
    defined.length > 0 ? defined.reduce((s, p) => s + (p.elevation as number), 0) / defined.length : undefined;

  return {
    polygon2D: polygonFeature,
    points3D,
    areaM2,
    areaSqFt,
    perimeterFt,
    avgElevationM,
    estimatedPitch,
  };
}
