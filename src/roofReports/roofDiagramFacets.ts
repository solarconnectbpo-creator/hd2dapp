import earcut from "earcut";
import * as turf from "@turf/turf";

const SQ_M_TO_SQ_FT = 10.76391041670972;

export type FacetSvgPiece = {
  pointsAttr: string;
  labelSqFt: number;
  cx: number;
  cy: number;
};

function polygonAreaPx(verts: { x: number; y: number }[]): number {
  let s = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    s += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return Math.abs(s) / 2;
}

/**
 * Earcut triangulation in **SVG pixel space** (same coords as the diagram outline) so facets align with the satellite.
 * Areas are allocated in proportion to triangle area vs. footprint geodesic area.
 */
export function buildFacetPiecesFromSvgVerts(
  verts: { x: number; y: number }[],
  totalRoofAreaSqFt: number | undefined,
  polyFeature: GeoJSON.Feature<GeoJSON.Polygon>,
): FacetSvgPiece[] {
  if (verts.length < 3) return [];
  const geoSqFt = turf.area(polyFeature) * SQ_M_TO_SQ_FT;
  if (!Number.isFinite(geoSqFt) || geoSqFt <= 0) return [];

  const totalPx = polygonAreaPx(verts);
  if (!Number.isFinite(totalPx) || totalPx <= 0) return [];

  const flat: number[] = [];
  for (const v of verts) {
    flat.push(v.x, v.y);
  }

  const triangles = earcut(flat);
  const out: FacetSvgPiece[] = [];

  const triAreaPx = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
  ) => 0.5 * Math.abs(ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

  for (let i = 0; i < triangles.length; i += 3) {
    const ia = triangles[i];
    const ib = triangles[i + 1];
    const ic = triangles[i + 2];
    if (ia === undefined || ib === undefined || ic === undefined) continue;

    const ax = flat[ia * 2];
    const ay = flat[ia * 2 + 1];
    const bx = flat[ib * 2];
    const by = flat[ib * 2 + 1];
    const cx = flat[ic * 2];
    const cy = flat[ic * 2 + 1];
    const aPx = triAreaPx(ax, ay, bx, by, cx, cy);
    const triShare = aPx / totalPx;
    const labelSqFt =
      totalRoofAreaSqFt &&
      Number.isFinite(totalRoofAreaSqFt) &&
      totalRoofAreaSqFt > 0
        ? totalRoofAreaSqFt * triShare
        : geoSqFt * triShare;

    const pointsAttr = `${ax.toFixed(2)},${ay.toFixed(2)} ${bx.toFixed(2)},${by.toFixed(2)} ${cx.toFixed(2)},${cy.toFixed(2)}`;
    const fcx = (ax + bx + cx) / 3;
    const fcy = (ay + by + cy) / 3;
    out.push({ pointsAttr, labelSqFt, cx: fcx, cy: fcy });
  }

  return out;
}
