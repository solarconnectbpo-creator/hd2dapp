import * as turf from "@turf/turf";

import {
  computeRoofPolygonEdgeMetrics,
  extractLargestPolygonFromTrace,
  roofEdgeKindAbbrev,
  type RoofEdgeKind,
} from "@/src/roofReports/roofPolygonMetrics";

export interface RoofDiagramInput {
  roofTraceGeoJson?: any;
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofType?: string;
  /** When set, edge callouts include approximate slope LF (uniform pitch model). */
  roofPitch?: string;
  /** Mapbox static satellite URL (same viewport as property lat/lng below). */
  satelliteImageUrl?: string;
  propertyLat?: number;
  propertyLng?: number;
}

/** Match Mapbox static export dimensions. */
export const ROOF_DIAGRAM_SATELLITE_ZOOM = 20;
export const ROOF_DIAGRAM_WIDTH = 1200;
export const ROOF_DIAGRAM_HEIGHT = 700;
/** Bottom stats strip — diagram + satellite render above this. */
const FOOTER_H = 56;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function areaSqToSquares(areaSqFt?: number): number | undefined {
  if (!areaSqFt || !Number.isFinite(areaSqFt) || areaSqFt <= 0) return undefined;
  return areaSqFt / 100;
}

function mercatorWorldSize(zoom: number): number {
  return 512 * Math.pow(2, zoom);
}

/** Mapbox/Web Mercator world coordinates (same family as Mapbox GL). */
function lngLatToWorld(lng: number, lat: number, worldSize: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * worldSize;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * worldSize;
  return { x, y };
}

/** Project lon/lat to SVG pixels matching Mapbox static `center` + `zoom` + width x height. */
function lngLatToSvgPixel(
  lng: number,
  lat: number,
  centerLng: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const worldSize = mercatorWorldSize(zoom);
  const p = lngLatToWorld(lng, lat, worldSize);
  const c = lngLatToWorld(centerLng, centerLat, worldSize);
  return {
    x: width / 2 + (p.x - c.x),
    y: height / 2 + (p.y - c.y),
  };
}

const MERCATOR_WORLD_UNIT = 512;

function expandBboxGeographic(
  bbox: [number, number, number, number],
  padRatio: number,
): [number, number, number, number] {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const dx = maxLng - minLng;
  const dy = maxLat - minLat;
  const padX = Math.max(dx * padRatio, 1e-7);
  const padY = Math.max(dy * padRatio, 1e-7);
  return [minLng - padX, minLat - padY, maxLng + padX, maxLat + padY];
}

function mercatorBoundsOfBbox(bbox: [number, number, number, number], worldSize: number) {
  const [w, s, e, n] = bbox;
  const corners = [
    lngLatToWorld(w, s, worldSize),
    lngLatToWorld(e, s, worldSize),
    lngLatToWorld(e, n, worldSize),
    lngLatToWorld(w, n, worldSize),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/**
 * Mapbox static bbox images stretch this Mercator extent to the viewport — uniform scale keeps the trace inside.
 */
function lngLatToPixelBboxFit(
  lng: number,
  lat: number,
  bbox: [number, number, number, number],
  width: number,
  height: number,
  marginPx: number,
): { x: number; y: number } {
  const worldSize = MERCATOR_WORLD_UNIT;
  const { minX, maxX, minY, maxY } = mercatorBoundsOfBbox(bbox, worldSize);
  const p = lngLatToWorld(lng, lat, worldSize);
  const mw = Math.max(maxX - minX, 1e-9);
  const mh = Math.max(maxY - minY, 1e-9);
  const innerW = width - 2 * marginPx;
  const innerH = height - 2 * marginPx;
  const sx = innerW / mw;
  const sy = innerH / mh;
  const sc = Math.min(sx, sy);
  const contentW = mw * sc;
  const contentH = mh * sc;
  const ox = marginPx + (innerW - contentW) / 2;
  const oy = marginPx + (innerH - contentH) / 2;
  return {
    x: ox + (p.x - minX) * sc,
    y: oy + (p.y - minY) * sc,
  };
}

function extractMapboxTokenFromUrl(url: string): string | undefined {
  const m = url.match(/access_token=([^&]+)/);
  return m?.[1];
}

function buildMapboxStaticBboxUrl(
  bbox: [number, number, number, number],
  width: number,
  height: number,
  token: string,
): string {
  const [west, south, east, north] = bbox;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/static/[${west},${south},${east},${north}]/${Math.round(width)}x${Math.round(height)}?access_token=${token}`;
}

function metersPerDegLon(latDeg: number): number {
  return 111_320 * Math.cos((latDeg * Math.PI) / 180);
}

function ringToEnu(openRing: GeoJSON.Position[]): { x: number; y: number }[] {
  let cLon = 0;
  let cLat = 0;
  for (const p of openRing) {
    cLon += p[0];
    cLat += p[1];
  }
  cLon /= openRing.length;
  cLat /= openRing.length;
  const mx = metersPerDegLon(cLat);
  return openRing.map((p) => ({
    x: (p[0] - cLon) * mx,
    y: (p[1] - cLat) * 111_320,
  }));
}

function signedArea2(verts: { x: number; y: number }[]): number {
  let a = 0;
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
  }
  return a / 2;
}

/** Reflex (concave) interior corner in plan — valley indicator. */
function vertexIsReflex(enu: { x: number; y: number }[], i: number): boolean {
  const n = enu.length;
  const p0 = enu[(i - 1 + n) % n];
  const p1 = enu[i];
  const p2 = enu[(i + 1) % n];
  const ux = p1.x - p0.x;
  const uy = p1.y - p0.y;
  const vx = p2.x - p1.x;
  const vy = p2.y - p1.y;
  const cross = ux * vy - uy * vx;
  const area = signedArea2(enu);
  const ccw = area > 0;
  return ccw ? cross < 0 : cross > 0;
}

/** EagleView-style colors: eave green, rake yellow, hip purple, valley red, ridge line orange. */
const C = {
  fill: "rgba(52, 152, 219, 0.48)",
  eave: "#27AE60",
  rake: "#F1C40F",
  hip: "#9B59B6",
  valley: "#E74C3C",
  eaveRidgeParallel: "#27AE60",
  ridgeLine: "#E67E22",
  label: "#ffffff",
  labelStroke: "rgba(0,0,0,0.55)",
};

function edgeStrokeColor(
  kind: RoofEdgeKind,
  edgeEndVertexIdx: number,
  enu: { x: number; y: number }[],
): string {
  if (kind === "rake") return C.rake;
  if (kind === "eave_ridge") return C.eaveRidgeParallel;
  if (kind === "hip_valley") {
    return vertexIsReflex(enu, edgeEndVertexIdx) ? C.valley : C.hip;
  }
  return C.eaveRidgeParallel;
}

export function buildRoofDiagramSvgDataUrl(input: RoofDiagramInput): string | undefined {
  const area = input.roofAreaSqFt;
  const perimeter = input.roofPerimeterFt;
  const squares = areaSqToSquares(area);
  const roofType = input.roofType?.trim();

  const w = ROOF_DIAGRAM_WIDTH;
  const h = ROOF_DIAGRAM_HEIGHT;
  const pad = 44;
  const zoom = ROOF_DIAGRAM_SATELLITE_ZOOM;
  const drawH = h - FOOTER_H;

  const poly = extractLargestPolygonFromTrace(input.roofTraceGeoJson);
  const edgeMetrics = computeRoofPolygonEdgeMetrics(input.roofTraceGeoJson, input.roofPitch);

  const useSatellite =
    !!input.satelliteImageUrl?.trim() &&
    typeof input.propertyLat === "number" &&
    typeof input.propertyLng === "number" &&
    Number.isFinite(input.propertyLat) &&
    Number.isFinite(input.propertyLng);

  const centerLng = useSatellite ? input.propertyLng! : 0;
  const centerLat = useSatellite ? input.propertyLat! : 0;

  let points = "";
  let verts: { x: number; y: number }[] = [];
  let vertsEnu: { x: number; y: number }[] = [];
  let openRingLonLat: GeoJSON.Position[] = [];

  let satelliteDisplayUrl = input.satelliteImageUrl?.trim() ?? "";
  let satelliteImageHeight = h;
  let padBboxProject: [number, number, number, number] | null = null;
  let bboxFitMarginPx = 12;

  if (poly) {
    try {
      const ring = poly.geometry.coordinates?.[0] ?? [];
      if (ring.length >= 3) {
        openRingLonLat =
          ring.length > 3 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
            ? ring.slice(0, -1)
            : ring.slice();
        vertsEnu = ringToEnu(openRingLonLat);

        const envToken =
          typeof process !== "undefined" ? ((process as { env?: { EXPO_PUBLIC_MAPBOX_TOKEN?: string } }).env?.EXPO_PUBLIC_MAPBOX_TOKEN as string | undefined) : undefined;
        const mapboxToken = extractMapboxTokenFromUrl(input.satelliteImageUrl ?? "") ?? envToken;

        if (useSatellite && mapboxToken) {
          const rawBbox = turf.bbox(poly) as [number, number, number, number];
          padBboxProject = expandBboxGeographic(rawBbox, 0.08);
          satelliteDisplayUrl = buildMapboxStaticBboxUrl(padBboxProject, w, drawH, mapboxToken);
          satelliteImageHeight = drawH;
          verts = openRingLonLat.map((p) =>
            lngLatToPixelBboxFit(p[0], p[1], padBboxProject!, w, drawH, bboxFitMarginPx),
          );
        } else if (useSatellite) {
          satelliteImageHeight = drawH;
          verts = openRingLonLat.map((p) =>
            lngLatToSvgPixel(p[0], p[1], centerLng, centerLat, zoom, w, drawH),
          );
        } else {
          const [minX, minY, maxX, maxY] = turf.bbox(poly);
          const spanX = Math.max(0.0000001, maxX - minX);
          const spanY = Math.max(0.0000001, maxY - minY);
          const drawW = w - pad * 2;
          const drawHarea = drawH - pad * 2 - 100;
          const scale = Math.min(drawW / spanX, drawHarea / spanY);
          const ox = (w - drawW) / 2;
          const oy = pad + 32;
          verts = openRingLonLat.map((p) => ({
            x: ox + (p[0] - minX) * scale,
            y: oy + drawHarea - (p[1] - minY) * scale,
          }));
        }

        const closedForPoly = [...verts, verts[0]];
        points = closedForPoly.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
      }
    } catch {
      // ignore
    }
  }

  const edgeLabels: string[] = [];
  const edgeLines: string[] = [];
  const n = verts.length;

  if (n >= 3 && edgeMetrics?.edges.length === n) {
    for (let i = 0; i < n; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % n];
      const m = edgeMetrics.edges[i];
      const plan = m?.planFeet;
      const slope = m?.slopeFeetApprox;
      const abbr = m ? roofEdgeKindAbbrev(m.kind) : "";
      const endIdx = (i + 1) % n;
      const stroke = edgeStrokeColor(m.kind, endIdx, vertsEnu);

      edgeLines.push(
        `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />`,
      );

      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const elen = Math.hypot(dx, dy) || 1;
      dx /= elen;
      dy /= elen;
      const perpX = -dy * 20;
      const perpY = dx * 20;
      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angleDeg > 90) angleDeg -= 180;
      if (angleDeg < -90) angleDeg += 180;

      let label = "";
      if (plan !== undefined && Number.isFinite(plan)) {
        label = `${plan.toFixed(1)}'`;
        if (slope !== undefined && Number.isFinite(slope) && input.roofPitch?.trim()) {
          label += ` · ${slope.toFixed(1)}'`;
        }
      } else {
        label = `E${i + 1}`;
      }
      const sub = `${abbr}`;

      const lx = midX + perpX;
      const ly = midY + perpY;
      edgeLabels.push(`<g transform="translate(${lx.toFixed(2)}, ${ly.toFixed(2)}) rotate(${angleDeg.toFixed(2)})">
<text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="800" fill="${C.label}" stroke="${C.labelStroke}" stroke-width="0.35">${esc(label)}</text>
<text x="0" y="16" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="${C.label}" stroke="${C.labelStroke}" stroke-width="0.25">${esc(sub)}</text>
</g>`);
    }
  }

  /** Optional ridge axis line (orange dashed) — PCA from metrics (satellite view only). */
  let ridgeOverlay = "";
  if (useSatellite && verts.length >= 3 && edgeMetrics?.ridgeAxisHeadingDeg !== undefined && poly) {
    try {
      const [minX, minY, maxX, maxY] = turf.bbox(poly);
      const cLon = (minX + maxX) / 2;
      const cLat = (minY + maxY) / 2;
      const heading = (edgeMetrics.ridgeAxisHeadingDeg * Math.PI) / 180;
      const spanM =
        Math.max(
          Math.hypot((maxX - minX) * metersPerDegLon(cLat), (maxY - minY) * 111_320),
          8,
        ) * 0.45;
      const east = Math.sin(heading);
      const north = Math.cos(heading);
      const dLon = (east * spanM) / metersPerDegLon(cLat);
      const dLat = (north * spanM) / 111_320;
      let p0: { x: number; y: number };
      let p1: { x: number; y: number };
      if (padBboxProject) {
        p0 = lngLatToPixelBboxFit(cLon - dLon, cLat - dLat, padBboxProject, w, drawH, bboxFitMarginPx);
        p1 = lngLatToPixelBboxFit(cLon + dLon, cLat + dLat, padBboxProject, w, drawH, bboxFitMarginPx);
      } else {
        p0 = lngLatToSvgPixel(cLon - dLon, cLat - dLat, centerLng, centerLat, zoom, w, drawH);
        p1 = lngLatToSvgPixel(cLon + dLon, cLat + dLat, centerLng, centerLat, zoom, w, drawH);
      }
      ridgeOverlay = `<line x1="${p0.x.toFixed(2)}" y1="${p0.y.toFixed(2)}" x2="${p1.x.toFixed(2)}" y2="${p1.y.toFixed(2)}" stroke="${C.ridgeLine}" stroke-width="3" stroke-dasharray="10 7" stroke-opacity="0.95" />`;
    } catch {
      // ignore
    }
  }

  /** Centroid label — total area (EagleView-style). */
  let areaCallout = "";
  if (verts.length >= 3 && area && Number.isFinite(area)) {
    let cx = 0;
    let cy = 0;
    for (const v of verts) {
      cx += v.x;
      cy += v.y;
    }
    cx /= verts.length;
    cy /= verts.length;
    const areaStr = `${Math.round(area).toLocaleString()} sq ft`;
    areaCallout = `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" fill="${C.label}" stroke="${C.labelStroke}" stroke-width="0.6">${esc(areaStr)}</text>`;
  }

  const metricArea = area && Number.isFinite(area) ? `${Math.round(area).toLocaleString()} sq ft` : "Not traced";
  const metricPerim =
    perimeter && Number.isFinite(perimeter)
      ? `${Math.round(perimeter).toLocaleString()} ft`
      : edgeMetrics && Number.isFinite(edgeMetrics.perimeterPlanFt)
        ? `${Math.round(edgeMetrics.perimeterPlanFt).toLocaleString()} ft`
        : "Not traced";
  const metricSquares = squares && Number.isFinite(squares) ? `${squares.toFixed(2)} squares` : "N/A";

  const legend = `<g transform="translate(${w - 280}, ${satelliteImageHeight - 118})">
<rect x="0" y="0" width="260" height="96" rx="8" fill="rgba(15,23,42,0.72)" stroke="rgba(255,255,255,0.2)"/>
<text x="12" y="22" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" fill="#f8fafc">Traced perimeter</text>
<line x1="12" y1="34" x2="40" y2="34" stroke="${C.eave}" stroke-width="4"/><text x="48" y="38" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#e2e8f0">Eave / ridge∥</text>
<line x1="12" y1="50" x2="40" y2="50" stroke="${C.rake}" stroke-width="4"/><text x="48" y="54" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#e2e8f0">Rake</text>
<line x1="140" y1="34" x2="168" y2="34" stroke="${C.hip}" stroke-width="4"/><text x="176" y="38" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#e2e8f0">Hip</text>
<line x1="140" y1="50" x2="168" y2="50" stroke="${C.valley}" stroke-width="4"/><text x="176" y="54" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#e2e8f0">Valley</text>
<text x="12" y="78" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="#94a3b8">Geodesic LF · PCA ridge axis · pitch model</text>
</g>`;

  const titleBlock = `
<text x="56" y="52" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="#f8fafc">Roof measurement diagram</text>
<text x="56" y="82" font-family="Arial, Helvetica, sans-serif" font-size="17" fill="#e2e8f0">${esc(roofType ? `Roof: ${roofType}` : "Roof: Not specified")}</text>`;

  const statsBar = `
<rect x="0" y="${h - 56}" width="${w}" height="56" fill="rgba(15,23,42,0.88)"/>
<text x="24" y="${h - 22}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#f8fafc">Area: ${esc(metricArea)}</text>
<text x="420" y="${h - 22}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#f8fafc">Perimeter: ${esc(metricPerim)}</text>
<text x="820" y="${h - 22}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#f8fafc">Squares: ${esc(metricSquares)}</text>`;

  const bgLayer = useSatellite
    ? `<image href="${esc(satelliteDisplayUrl)}" x="0" y="0" width="${w}" height="${satelliteImageHeight}" preserveAspectRatio="none" opacity="1"/>
<rect x="0" y="0" width="${w}" height="${satelliteImageHeight}" fill="rgba(15,23,42,0.12)"/>`
    : `<defs><linearGradient id="fallbackBg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#1e293b"/><stop offset="100%" stop-color="#0f172a"/></linearGradient><pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.15)" stroke-width="1"/></pattern></defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#fallbackBg)"/>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#grid)"/>`;

  const diagramBody =
    points && verts.length
      ? `<polygon points="${points}" fill="${C.fill}" stroke="none"/>
${ridgeOverlay}
<g>${edgeLines.join("\n")}</g>
<g>${edgeLabels.join("\n")}</g>
${areaCallout}
${legend}
`
      : `<rect x="${pad}" y="120" width="${w - pad * 2}" height="${h - 200}" rx="10" fill="rgba(30,41,59,0.5)" stroke="rgba(148,163,184,0.4)" stroke-dasharray="8 6"/>
<text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#94a3b8">No traced roof polygon available</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${bgLayer}
${titleBlock}
${diagramBody}
${statsBar}
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
