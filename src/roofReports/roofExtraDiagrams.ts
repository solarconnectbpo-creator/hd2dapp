import * as turf from "@turf/turf";

export type RoofPitchDiagramInput = {
  roofPitch?: string;
  roofFormType?: string;
  roofMaterialType?: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parsePitchToRiseRun(pitch?: string): { rise: number; run: number } | undefined {
  if (!pitch) return undefined;
  const m = pitch.match(/(\d{1,3}(?:\.\d+)?)\s*[/:]\s*(\d{1,3}(?:\.\d+)?)/);
  if (!m) return undefined;

  const rise = Number(m[1]);
  const run = Number(m[2]);
  if (!Number.isFinite(rise) || !Number.isFinite(run) || run <= 0) return undefined;

  return { rise, run };
}

export function buildRoofPitchDiagramSvgDataUrl(input: RoofPitchDiagramInput): string | undefined {
  const pitch = input.roofPitch?.trim();
  if (!pitch) return undefined;

  const parsed = parsePitchToRiseRun(pitch);
  if (!parsed) return undefined;

  const rise = parsed.rise;
  const run = parsed.run;
  const roofFormType = input.roofFormType?.trim();
  const roofMaterialType = input.roofMaterialType?.trim();
  const roofLabel = roofFormType
    ? `Roof Form: ${roofFormType}`
    : roofMaterialType
      ? `Roof Type: ${roofMaterialType}`
      : "Not specified";

  // Basic drawing: right triangle (rise = vertical, run = horizontal).
  const w = 900;
  const h = 540;
  const pad = 56;
  const triLeftX = pad + 90;
  const triBaseY = h - pad - 140;
  const triRightX = w - pad - 140;
  const triTopY = triBaseY - (triRightX - triLeftX) * (rise / run);

  const pitchAngleDeg = Math.atan(rise / run) * (180 / Math.PI);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="#f8fafc"/>
    <stop offset="100%" stop-color="#eef2ff"/>
  </linearGradient>
</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg)"/>
<rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="14" fill="#ffffff" stroke="#cbd5e1"/>

<text x="56" y="78" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#0f172a">Pitches Diagram</text>
<text x="56" y="108" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">${esc(roofLabel)}</text>

<rect x="56" y="${h - 138}" width="${w - 112}" height="82" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>

<g>
  <polygon points="${triLeftX},${triBaseY} ${triRightX},${triBaseY} ${triRightX},${triTopY}" fill="#f59e0b33" stroke="#d97706" stroke-width="3"/>
  <line x1="${triLeftX}" y1="${triTopY}" x2="${triLeftX}" y2="${triBaseY}" stroke="#334155" stroke-width="2"/>
  <line x1="${triLeftX}" y1="${triBaseY}" x2="${triRightX}" y2="${triBaseY}" stroke="#334155" stroke-width="2"/>

  <!-- Right angle marker -->
  <rect x="${triLeftX - 26}" y="${triBaseY - 26}" width="26" height="26" fill="#ffffff" stroke="#334155" stroke-width="2"/>

  <text x="${triLeftX + 14}" y="${triTopY - 10}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#0f172a">Rise</text>
  <text x="${triLeftX + (triRightX - triLeftX) / 2 - 20}" y="${triBaseY + 38}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#0f172a">Run</text>

  <text x="${triLeftX}" y="${triTopY + 32}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#0f172a">${esc(` ${rise}`)}</text>
  <text x="${triLeftX + (triRightX - triLeftX) / 2 - 20}" y="${triBaseY + 12}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#0f172a">${esc(` ${run}`)}</text>
</g>

<text x="84" y="${h - 102}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#0f172a">Pitch: ${esc(pitch)}</text>
<text x="430" y="${h - 102}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#0f172a">${esc(`Angle: ~${pitchAngleDeg.toFixed(1)} deg`)}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type RoofLengthsDiagramInput = {
  roofTraceGeoJson?: any;
  roofPerimeterFt?: number;
};

function extractPolygon(geo: any): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!geo) return null;
  if (geo?.type === "Feature" && geo?.geometry?.type === "Polygon") return geo as GeoJSON.Feature<GeoJSON.Polygon>;
  if (geo?.type === "Polygon") return { type: "Feature", properties: {}, geometry: geo };
  if (geo?.type === "Feature" && geo?.geometry?.type === "MultiPolygon") {
    const mp = geo.geometry.coordinates as GeoJSON.Position[][][];
    let best: GeoJSON.Position[][] | null = null;
    let bestArea = -1;
    for (const rings of mp) {
      try {
        const f = turf.polygon(rings);
        const a = turf.area(f);
        if (a > bestArea) {
          bestArea = a;
          best = rings;
        }
      } catch {
        // ignore
      }
    }
    if (!best) return null;
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: best } };
  }
  return null;
}

function feetFromDistanceKm(km: number): number {
  return km * 3280.839895;
}

export function buildRoofLengthsDiagramSvgDataUrl(input: RoofLengthsDiagramInput): string | undefined {
  const poly = extractPolygon(input.roofTraceGeoJson);
  if (!poly) return undefined;

  const ring = poly.geometry.coordinates?.[0] ?? [];
  // Expect closed ring: first coord repeats at end.
  if (ring.length < 4) return undefined;

  const pts = ring.slice(0, -1); // drop duplicate closing point
  if (pts.length < 3) return undefined;

  const edges: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dKm = turf.distance(turf.point(a), turf.point(b), { units: "kilometers" });
    if (!Number.isFinite(dKm)) continue;
    edges.push(feetFromDistanceKm(dKm));
  }

  if (!edges.length) return undefined;

  const totalFromSegments = edges.reduce((sum, v) => sum + v, 0);
  const perimeter = input.roofPerimeterFt && Number.isFinite(input.roofPerimeterFt) ? input.roofPerimeterFt : totalFromSegments;

  const w = 900;
  const h = 540;
  const pad = 56;

  // If there are lots of vertices, group segments into bins so the chart stays readable.
  const maxBars = 24;
  const groupsCount = edges.length > maxBars ? maxBars : edges.length;
  const groupSize = edges.length > maxBars ? Math.ceil(edges.length / maxBars) : 1;

  const groups: Array<{ label: string; totalFt: number }> = [];
  for (let i = 0; i < edges.length; i += groupSize) {
    const slice = edges.slice(i, i + groupSize);
    if (!slice.length) continue;
    const start = i + 1;
    const end = Math.min(edges.length, i + groupSize);
    groups.push({ label: slice.length === 1 ? `E${start}` : `E${start}-${end}`, totalFt: slice.reduce((s, v) => s + v, 0) });
    if (groups.length >= groupsCount) break;
  }

  const maxTotal = Math.max(...groups.map((g) => g.totalFt));
  const chartLeft = pad + 56;
  const chartRight = w - pad - 56;
  const chartTop = 140;
  const chartBottom = h - pad - 190;
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;

  const barGap = 6;
  const barW = groups.length ? Math.max(10, (chartWidth - barGap * (groups.length - 1)) / groups.length) : 10;

  const bars = groups
    .map((g, idx) => {
      const x = chartLeft + idx * (barW + barGap);
      const barH = maxTotal > 0 ? (g.totalFt / maxTotal) * chartHeight : 0;
      const y = chartBottom - barH;
      return `<g>
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="6" fill="#f59e0b" opacity="0.9" />
      </g>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="#f8fafc"/>
    <stop offset="100%" stop-color="#eef2ff"/>
  </linearGradient>
</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg)"/>
<rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="14" fill="#ffffff" stroke="#cbd5e1"/>

<text x="56" y="78" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#0f172a">Lengths Diagram</text>
<text x="56" y="108" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">Edge lengths from traced roof outline</text>

<line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#cbd5e1" stroke-width="2"/>
<g>${bars}</g>

<rect x="56" y="${h - 138}" width="${w - 112}" height="82" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
<text x="84" y="${h - 102}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#0f172a">Total perimeter: ${esc(Math.round(perimeter).toLocaleString())} ft</text>
<text x="610" y="${h - 102}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#334155">${esc(`Edges traced: ${edges.length}`)}</text>

<!-- Table-like labels -->
<g font-family="Arial, Helvetica, sans-serif">
${groups
  .slice(0, maxBars)
  .map((g, i) => {
    const x = chartLeft + i * (barW + barGap) + barW / 2;
    const yLabel = chartBottom + 26;
    const yValue = chartBottom + 44;
    return `<text x="${x.toFixed(1)}" y="${yLabel}" text-anchor="middle" font-size="12" fill="#475569">${esc(g.label)}</text>
<text x="${x.toFixed(1)}" y="${yValue}" text-anchor="middle" font-size="12" fill="#0f172a">${esc(`${g.totalFt.toFixed(1)} ft`)}</text>`;
  })
  .join("")}
</g>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

