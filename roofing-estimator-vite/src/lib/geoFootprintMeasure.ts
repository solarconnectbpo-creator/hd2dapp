import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";

export type BuildingFootprintFeature = Feature<Polygon | MultiPolygon>;

/** m² → ft² (international foot) — single source for footprint math. */
export const SQ_FT_PER_SQ_M = 10.76391041671;

function ensureClosedRing(ring: [number, number][]): [number, number][] {
  if (ring.length < 3) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) return ring;
  return [...ring, a];
}

/** Geodesic polygon area in m² (Turf / WGS84). */
export function ringAreaSqM(openOrClosedRing: [number, number][]): number {
  if (openOrClosedRing.length < 3) return 0;
  const ring = ensureClosedRing(openOrClosedRing);
  const poly = turf.polygon([ring]);
  return turf.area(poly as Feature<Polygon>);
}

/** Plan footprint area in ft² from a map outline ring. */
export function ringPlanAreaSqFt(ring: [number, number][]): number {
  return ringAreaSqM(ring) * SQ_FT_PER_SQ_M;
}

/** Geodesic perimeter of a closed footprint ring (ft). */
export function ringPerimeterFt(openOrClosedRing: [number, number][]): number {
  if (openOrClosedRing.length < 2) return 0;
  const ring = ensureClosedRing(openOrClosedRing);
  const line = turf.lineString(ring);
  return turf.length(line, { units: "feet" });
}

/** Open LineString path length (ft) — ridge/eave lines drawn on map. */
export function pathLengthFt(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  const line = turf.lineString(coords);
  return turf.length(line, { units: "feet" });
}

/** Point halfway along an open LineString by geodesic distance (for label placement). */
export function midpointAlongPolylineFt(coords: [number, number][]): [number, number] | null {
  if (coords.length < 2) return null;
  const line = turf.lineString(coords);
  const len = turf.length(line, { units: "feet" });
  if (len <= 0) return coords[0] ?? null;
  const pt = turf.along(line, len / 2, { units: "feet" });
  return pt.geometry.coordinates as [number, number];
}

function outerRingFromIntersection(inter: Feature<Polygon | MultiPolygon>): [number, number][] | null {
  const g = inter.geometry;
  if (g.type === "Polygon") {
    return g.coordinates[0] as [number, number][];
  }
  let best: [number, number][] | null = null;
  let bestA = 0;
  for (const poly of g.coordinates) {
    const ring = poly[0] as [number, number][];
    const a = turf.area(turf.polygon([ring]));
    if (a > bestA) {
      bestA = a;
      best = ring;
    }
  }
  return best;
}

function toOpenRing(ring: [number, number][]): [number, number][] {
  if (ring.length < 2) return ring;
  const a = ring[0];
  const b = ring[ring.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) return ring.slice(0, -1);
  return ring;
}

/**
 * Clip AI roof plan ring to a parcel (property) or building footprint polygon.
 * Prefers overlap with the boundary you clicked inside (Canvassing parcel / USGS building).
 */
export function clipPlanRingToBoundary(
  samRing: [number, number][],
  boundary: Feature<Polygon | MultiPolygon>,
): { ring: [number, number][]; clipped: boolean } | null {
  if (samRing.length < 3) return null;
  const closed = ensureClosedRing(samRing);
  const sam = turf.polygon([closed]);
  let bestInter: Feature<Polygon | MultiPolygon> | null = null;
  let bestArea = 0;

  const tryBoundaryPolygon = (rings: [number, number][][]) => {
    const b = turf.polygon(rings as [number, number][][]);
    const inter = turf.intersect(turf.featureCollection([sam, b]));
    if (!inter) return;
    const a = turf.area(inter);
    if (a > bestArea) {
      bestArea = a;
      bestInter = inter;
    }
  };

  if (boundary.geometry.type === "Polygon") {
    tryBoundaryPolygon(boundary.geometry.coordinates as [number, number][][]);
  } else {
    for (const poly of boundary.geometry.coordinates) {
      tryBoundaryPolygon(poly as [number, number][][]);
    }
  }

  if (!bestInter || bestArea < 1e-8) return null;
  const outer = outerRingFromIntersection(bestInter);
  if (!outer || outer.length < 3) return null;
  return { ring: toOpenRing(outer), clipped: true };
}

/** Plan area (ft²) from a GeoJSON polygon feature (holes respected). */
export function polygonFeaturePlanAreaSqFt(feature: Feature<Polygon>): number {
  return turf.area(feature as Feature<Polygon>) * SQ_FT_PER_SQ_M;
}

/** Plan area (ft²) from USGS/OSM building footprint (Polygon or MultiPolygon). */
export function footprintFeaturePlanAreaSqFt(feature: BuildingFootprintFeature): number {
  return turf.area(feature as Feature<Polygon | MultiPolygon>) * SQ_FT_PER_SQ_M;
}

/**
 * One Polygon feature per outer ring so map auto-calc (polygon-only) can sum plan area and perimeters.
 */
export function footprintToPolygonFeatures(feature: BuildingFootprintFeature): Feature<Polygon>[] {
  const g = feature.geometry;
  const props = feature.properties ?? {};
  if (g.type === "Polygon") {
    return [{ type: "Feature", properties: { ...props }, geometry: g }];
  }
  return g.coordinates.map((coords) => ({
    type: "Feature" as const,
    properties: { ...props },
    geometry: { type: "Polygon" as const, coordinates: coords },
  }));
}

/** Outer-ring perimeter (ft) only — matches roofing footprint edge, not holes. */
export function polygonFeatureOuterPerimeterFt(feature: Feature<Polygon>): number {
  const ring = feature.geometry.coordinates[0] as [number, number][];
  return ringPerimeterFt(ring);
}

/** True when the outer ring self-intersects (bow-tie, etc.) — area takeoff may be invalid. */
export function polygonFeatureHasSelfIntersection(feature: Feature<Polygon>): boolean {
  return turf.kinks(feature as Feature<Polygon>).features.length > 0;
}

/**
 * When no building footprint exists, conservative roof plan SF from lot size (tiered ratio + cap).
 * Planning only — verify in the field before bids or permits.
 */
export function estimateRoofSqFtFromLotSqFtConservative(lotSqFt: number): { midpointSqFt: number; note: string } | null {
  if (!Number.isFinite(lotSqFt) || lotSqFt <= 0) return null;
  let ratio = 0.12;
  if (lotSqFt < 5000) ratio = 0.55;
  else if (lotSqFt < 15000) ratio = 0.25;
  else if (lotSqFt < 43560) ratio = 0.12;
  else ratio = 0.06;
  let cap = 2500;
  if (lotSqFt >= 43560) cap = 1800;
  else if (lotSqFt >= 15000) cap = 2000;
  const raw = lotSqFt * ratio;
  const midpointSqFt = Math.min(cap, Math.max(800, Math.round(raw)));
  return {
    midpointSqFt,
    note: `Plan-only estimate from lot size (${Math.round(lotSqFt)} sf lot); no GIS/OSM building polygon — verify in field.`,
  };
}
