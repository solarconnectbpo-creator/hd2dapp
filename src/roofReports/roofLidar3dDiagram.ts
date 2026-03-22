import * as turf from "@turf/turf";

import {
  computeRoofPolygonEdgeMetrics,
  extractLargestPolygonFromTrace,
  parsePitchRiseRun,
  roofEdgeKindAbbrev,
} from "@/src/roofReports/roofPolygonMetrics";

export type RoofLidar3dDiagramInput = {
  roofTraceGeoJson?: any;
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofPitch?: string;
  roofType?: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Isometric-ish 3D extrusion + point cloud styling from traced footprint + optional pitch metadata. */
export function buildRoofLidar3dPolygonDiagramSvgDataUrl(
  input: RoofLidar3dDiagramInput,
): string | undefined {
  const poly = extractLargestPolygonFromTrace(input.roofTraceGeoJson);
  if (!poly) return undefined;

  const metrics = computeRoofPolygonEdgeMetrics(
    input.roofTraceGeoJson,
    input.roofPitch,
  );
  if (!metrics?.edges.length) return undefined;

  const ring = poly.geometry.coordinates?.[0] ?? [];
  if (ring.length < 4) return undefined;

  const openRing =
    ring.length > 3 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  if (openRing.length < 3) return undefined;

  const [minX, minY, maxX, maxY] = turf.bbox(poly);
  const spanX = Math.max(0.0000001, maxX - minX);
  const spanY = Math.max(0.0000001, maxY - minY);

  const w = 920;
  const h = 640;
  const pad = 52;
  const drawW = w - pad * 2;
  const drawH = h - pad * 2 - 200;
  const scale = Math.min(drawW / spanX, drawH / spanY);
  const ox = (w - drawW) / 2;
  const oy = pad + 48;

  const verts = openRing.map((p) => ({
    x: ox + (p[0] - minX) * scale,
    y: oy + drawH - (p[1] - minY) * scale,
  }));

  const pr = parsePitchRiseRun(input.roofPitch);
  const extrudeScale = pr ? 0.35 + Math.min(0.45, pr.rise / pr.run / 12) : 0.28;
  const ex = 78 * extrudeScale;
  const ey = -112 * extrudeScale;

  const top = verts.map((v) => ({ x: v.x + ex, y: v.y + ey }));
  const n = verts.length;

  const sideFaces: string[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const shade = 0.12 + (i % 3) * 0.04;
    sideFaces.push(
      `<polygon points="${verts[i].x.toFixed(1)},${verts[i].y.toFixed(1)} ${verts[j].x.toFixed(1)},${verts[j].y.toFixed(1)} ${top[j].x.toFixed(1)},${top[j].y.toFixed(1)} ${top[i].x.toFixed(1)},${top[i].y.toFixed(1)}" fill="rgba(14,165,233,${shade})" stroke="#0369a1" stroke-width="1.2"/>`,
    );
  }

  const topPts = `${top.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}`;
  const botPts = `${verts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}`;

  const polyFeat = turf.polygon([openRing.concat([openRing[0]])]);
  const dots: string[] = [];
  const bbox = turf.bbox(polyFeat);
  let seeded = 0;
  for (let k = 0; k < 120 && seeded < 55; k++) {
    const rx = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
    const ry = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
    try {
      if (turf.booleanPointInPolygon(turf.point([rx, ry]), polyFeat)) {
        const sx = ox + (rx - minX) * scale + ex * 0.95;
        const sy = oy + drawH - (ry - minY) * scale + ey * 0.95;
        const r = 1.2 + Math.random() * 1.4;
        dots.push(
          `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${r.toFixed(2)}" fill="rgba(56,189,248,0.55)" stroke="rgba(3,105,161,0.4)" stroke-width="0.6"/>`,
        );
        seeded++;
      }
    } catch {
      // ignore
    }
  }

  const edgeDim: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = top[i];
    const b = top[(i + 1) % n];
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const el = Math.hypot(dx, dy) || 1;
    dx /= el;
    dy /= el;
    const nx = -dy * 20;
    const ny = dx * 20;
    const m = metrics.edges[i];
    const p = m?.planFeet;
    const s = m?.slopeFeetApprox;
    const abbr = m ? roofEdgeKindAbbrev(m.kind) : "";
    let txt = `E${i + 1} ${abbr}`;
    if (p !== undefined) txt += ` ${p.toFixed(1)}' pl`;
    if (s !== undefined && input.roofPitch?.trim())
      txt += `/${s.toFixed(1)}' ln`;
    edgeDim.push(
      `<text x="${(midX + nx).toFixed(1)}" y="${(midY + ny).toFixed(1)}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#0c4a6e">${esc(txt)}</text>`,
    );
  }

  const sumPlan = metrics.perimeterPlanFt;
  const sumSlope =
    input.roofPitch?.trim() &&
    metrics.edges.some((e) => e.slopeFeetApprox != null)
      ? metrics.edges.reduce(
          (acc, e) => acc + (e.slopeFeetApprox ?? e.planFeet),
          0,
        )
      : undefined;

  const roofType = input.roofType?.trim();
  const ridgeHint =
    metrics.ridgeAxisHeadingDeg !== undefined
      ? `Ridge axis ~${metrics.ridgeAxisHeadingDeg.toFixed(0)}° N. `
      : "";
  const pitchNote = input.roofPitch?.trim()
    ? `${ridgeHint}Pitch ${esc(input.roofPitch.trim())}: Rk=plan×secθ; E/R≈plan; H/V=hip model.`
    : `${ridgeHint}Add pitch for classified lineal LF.`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="lidarBg" x1="0" x2="1" y1="0" y2="1">
    <stop offset="0%" stop-color="#0f172a"/>
    <stop offset="100%" stop-color="#1e3a5f"/>
  </linearGradient>
  <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="1.2" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#lidarBg)"/>
<rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="14" fill="#ffffff" fill-opacity="0.96" stroke="#bae6fd"/>

<text x="48" y="64" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="#0c4a6e">LiDAR-style 3D roof outline</text>
<text x="48" y="92" font-family="Arial, Helvetica, sans-serif" font-size="15" fill="#334155">${esc(
    roofType
      ? `Roof: ${roofType}`
      : "Traced footprint extruded for takeoff visualization",
  )}</text>
<text x="48" y="114" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#64748b">Axonometric projection from map trace (not raw aerial LiDAR). LF = geodesic feet on WGS84.</text>

<g transform="translate(0,8)">
  <polygon points="${botPts}" fill="rgba(148,163,184,0.2)" stroke="#64748b" stroke-width="2" stroke-dasharray="6 5"/>
  ${sideFaces.join("")}
  <polygon points="${topPts}" fill="rgba(56,189,248,0.22)" stroke="#0284c7" stroke-width="2.5" filter="url(#softGlow)"/>
  <g>${dots.join("")}</g>
  <g>${edgeDim.join("")}</g>
  ${verts
    .map(
      (v, i) =>
        `<line x1="${v.x.toFixed(1)}" y1="${v.y.toFixed(1)}" x2="${top[i].x.toFixed(1)}" y2="${top[i].y.toFixed(1)}" stroke="#0ea5e9" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.85"/>`,
    )
    .join("")}
</g>

<rect x="48" y="${h - 168}" width="${w - 96}" height="120" rx="10" fill="#f0f9ff" stroke="#7dd3fc"/>
<text x="64" y="${h - 138}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#0c4a6e">Totals (all edges)</text>
<text x="64" y="${h - 114}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#0f172a">Σ Plan (perimeter): ${esc(sumPlan.toFixed(1))} LF</text>
<text x="64" y="${h - 92}" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#0f172a">${
    sumSlope !== undefined
      ? `Σ Lineal (classified): ${esc(sumSlope.toFixed(1))} LF`
      : "Σ Lineal: enter pitch for takeoff totals"
  }</text>
<text x="64" y="${h - 68}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">${pitchNote}</text>
${
  input.roofAreaSqFt && Number.isFinite(input.roofAreaSqFt)
    ? `<text x="480" y="${h - 114}" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#0f172a">Area: ${esc(
        `${Math.round(input.roofAreaSqFt).toLocaleString()} sq ft`,
      )}</text>`
    : ""
}
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
