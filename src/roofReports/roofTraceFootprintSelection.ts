import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";

export function isPolyLikeFeature(
  feature: unknown,
): feature is Feature<Polygon | MultiPolygon> {
  const t = (feature as Feature | null)?.geometry?.type;
  return t === "Polygon" || t === "MultiPolygon";
}

export type FootprintPickOptions = {
  /** When the pin is outside all footprints, only accept the nearest polygon if its edge is within this distance (meters). */
  maxEdgeDistanceMeters?: number;
};

/**
 * Picks the Microsoft-building footprint that best matches the map pin.
 * - If the pin lies inside one or more footprints, chooses the **smallest-area** polygon (tightest building match).
 * - Otherwise chooses the polygon with the smallest **geodesic distance** from the pin to the polygon boundary,
 *   only if that distance is within `maxEdgeDistanceMeters`.
 */
export function selectBestFootprintForPin(
  features: Feature[],
  lng: number,
  lat: number,
  options?: FootprintPickOptions,
): Feature<Polygon | MultiPolygon> | null {
  const maxEdgeM = options?.maxEdgeDistanceMeters ?? 48;
  const polys = features.filter(isPolyLikeFeature);
  if (!polys.length) return null;

  const pt = turf.point([lng, lat]);

  type Row = {
    f: Feature<Polygon | MultiPolygon>;
    inside: boolean;
    area: number;
    /** Signed distance from @turf/point-to-polygon-distance (negative = inside). */
    rawM: number;
  };

  const rows: Row[] = [];

  for (const f of polys) {
    try {
      const rawM = turf.pointToPolygonDistance(pt, f, {
        units: "meters",
        method: "geodesic",
      });
      let inside = rawM < 0;
      if (!inside) {
        try {
          inside = turf.booleanPointInPolygon(
            pt,
            f as Feature<Polygon | MultiPolygon>,
          );
        } catch {
          // keep inside false
        }
      }
      const area = turf.area(f);
      rows.push({ f, inside, area, rawM });
    } catch {
      // skip invalid geometry
    }
  }

  if (!rows.length) return null;

  const insideRows = rows.filter((r) => r.inside);
  if (insideRows.length) {
    insideRows.sort((a, b) => a.area - b.area);
    return insideRows[0].f;
  }

  const outside = rows.filter((r) => r.rawM >= 0 && r.rawM <= maxEdgeM);
  if (!outside.length) return null;
  outside.sort((a, b) => a.rawM - b.rawM);
  return outside[0].f;
}
