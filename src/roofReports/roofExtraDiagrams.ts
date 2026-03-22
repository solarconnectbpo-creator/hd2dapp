import {
  computeRoofPolygonEdgeMetrics,
  roofEdgeKindAbbrev,
} from "@/src/roofReports/roofPolygonMetrics";

export type RoofPitchDiagramInput = {
  roofPitch?: string;
  roofFormType?: string;
  roofMaterialType?: string;
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parsePitchToRiseRun(
  pitch?: string,
): { rise: number; run: number } | undefined {
  if (!pitch) return undefined;
  const m = pitch.match(/(\d{1,3}(?:\.\d+)?)\s*[/:]\s*(\d{1,3}(?:\.\d+)?)/);
  if (!m) return undefined;

  const rise = Number(m[1]);
  const run = Number(m[2]);
  if (!Number.isFinite(rise) || !Number.isFinite(run) || run <= 0)
    return undefined;

  return { rise, run };
}

export function buildRoofPitchDiagramSvgDataUrl(
  input: RoofPitchDiagramInput,
): string | undefined {
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

  const refRunFt = 12;
  const refRiseFt = refRunFt * (rise / run);
  const slopeLengthRefFt = Math.hypot(refRunFt, refRiseFt);

  // Basic drawing: right triangle (rise = vertical, run = horizontal).
  const w = 900;
  const h = 560;
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

<rect x="56" y="${h - 158}" width="${w - 112}" height="102" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>

<g>
  <polygon points="${triLeftX},${triBaseY} ${triRightX},${triBaseY} ${triRightX},${triTopY}" fill="#f59e0b33" stroke="#d97706" stroke-width="3"/>
  <line x1="${triRightX}" y1="${triTopY}" x2="${triRightX}" y2="${triBaseY}" stroke="#334155" stroke-width="2"/>
  <line x1="${triLeftX}" y1="${triBaseY}" x2="${triRightX}" y2="${triBaseY}" stroke="#334155" stroke-width="2"/>
  <line x1="${triLeftX}" y1="${triBaseY}" x2="${triRightX}" y2="${triTopY}" stroke="#b45309" stroke-width="2" stroke-dasharray="5 4"/>

  <!-- Right angle at bottom-right -->
  <rect x="${triRightX - 26}" y="${triBaseY - 26}" width="26" height="26" fill="#ffffff" stroke="#334155" stroke-width="2"/>

  <text x="${triRightX + 10}" y="${(triTopY + triBaseY) / 2}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#0f172a">Rise</text>
  <text x="${triLeftX + (triRightX - triLeftX) / 2 - 20}" y="${triBaseY + 38}" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#0f172a">Run</text>
  <text x="${triLeftX + 40}" y="${(triTopY + triBaseY) / 2 - 20}" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="700" fill="#b45309">Slope (LF)</text>

  <text x="${triRightX + 8}" y="${triTopY + 28}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#0f172a">${esc(`${refRiseFt.toFixed(2)}'`)}</text>
  <text x="${triLeftX + (triRightX - triLeftX) / 2 - 36}" y="${triBaseY + 12}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800" fill="#0f172a">${esc(`${refRunFt}'`)}</text>
  <text x="${triLeftX + 20}" y="${(triTopY + triBaseY) / 2}" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="800" fill="#b45309">${esc(`~${slopeLengthRefFt.toFixed(2)}' LF`)}</text>
</g>

<text x="84" y="${h - 122}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">Pitch: ${esc(pitch)}</text>
<text x="84" y="${h - 96}" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="600" fill="#334155">${esc(
    `Ref: ${refRunFt}' run → ${refRiseFt.toFixed(2)}' rise → ~${slopeLengthRefFt.toFixed(2)}' LF along roof plane`,
  )}</text>
<text x="430" y="${h - 122}" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#0f172a">${esc(`Angle: ~${pitchAngleDeg.toFixed(1)}°`)}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export type RoofLengthsDiagramInput = {
  roofTraceGeoJson?: any;
  roofPerimeterFt?: number;
  /** Uniform pitch for slope LF column (optional). */
  roofPitch?: string;
};

export function buildRoofLengthsDiagramSvgDataUrl(
  input: RoofLengthsDiagramInput,
): string | undefined {
  const metrics = computeRoofPolygonEdgeMetrics(
    input.roofTraceGeoJson,
    input.roofPitch,
  );
  if (!metrics?.edges.length) return undefined;

  const edges = metrics.edges;
  const ridgeAxisHeadingDeg = metrics.ridgeAxisHeadingDeg;
  const perimeter =
    input.roofPerimeterFt && Number.isFinite(input.roofPerimeterFt)
      ? input.roofPerimeterFt
      : metrics.perimeterPlanFt;

  const sumSlope = input.roofPitch?.trim()
    ? edges.reduce((acc, e) => acc + (e.slopeFeetApprox ?? e.planFeet), 0)
    : edges.reduce((acc, e) => acc + e.planFeet, 0);

  const w = 900;
  const h = 720;
  const pad = 56;

  const maxBars = 36;
  const groupsCount = edges.length > maxBars ? maxBars : edges.length;
  const groupSize =
    edges.length > maxBars ? Math.ceil(edges.length / maxBars) : 1;

  const groups: Array<{ label: string; planFt: number; slopeFt: number }> = [];
  for (let i = 0; i < edges.length; i += groupSize) {
    const slice = edges.slice(i, i + groupSize);
    if (!slice.length) continue;
    const start = slice[0].index;
    const end = slice[slice.length - 1].index;
    groups.push({
      label: slice.length === 1 ? `E${start}` : `E${start}–E${end}`,
      planFt: slice.reduce((s, v) => s + v.planFeet, 0),
      slopeFt: slice.reduce((s, v) => s + (v.slopeFeetApprox ?? v.planFeet), 0),
    });
    if (groups.length >= groupsCount) break;
  }

  const maxTotal = Math.max(
    ...groups.map((g) => Math.max(g.planFt, g.slopeFt)),
  );
  const chartLeft = pad + 56;
  const chartRight = w - pad - 56;
  const chartTop = 142;
  const chartBottom = 268;
  const chartHeight = chartBottom - chartTop;
  const chartWidth = chartRight - chartLeft;

  const barGap = 5;
  const barW = groups.length
    ? Math.max(8, (chartWidth - barGap * (groups.length - 1)) / groups.length)
    : 8;

  const bars = groups
    .map((g, idx) => {
      const x = chartLeft + idx * (barW + barGap);
      const hPlan = maxTotal > 0 ? (g.planFt / maxTotal) * chartHeight : 0;
      const hSlope = maxTotal > 0 ? (g.slopeFt / maxTotal) * chartHeight : 0;
      const yPlan = chartBottom - hPlan;
      const ySlope = chartBottom - hSlope;
      return `<g>
        <rect x="${(x + barW * 0.08).toFixed(1)}" y="${yPlan.toFixed(1)}" width="${(barW * 0.38).toFixed(1)}" height="${hPlan.toFixed(1)}" rx="4" fill="#94a3b8" opacity="0.95" />
        <rect x="${(x + barW * 0.52).toFixed(1)}" y="${ySlope.toFixed(1)}" width="${(barW * 0.38).toFixed(1)}" height="${hSlope.toFixed(1)}" rx="4" fill="#f59e0b" opacity="0.95" />
      </g>`;
    })
    .join("");

  const tableMax = 24;
  const tableEdges = edges.slice(0, tableMax);
  const moreCount = edges.length - tableEdges.length;
  const rowY0 = chartBottom + 62;
  const rowH = 13;
  const colEdge = 52;
  const colKind = 118;
  const colPlan = 210;
  const colSlope = 360;

  const tableHeader = `<text x="${colEdge}" y="${rowY0}" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#334155">Edge</text>
<text x="${colKind}" y="${rowY0}" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#334155">Type</text>
<text x="${colPlan}" y="${rowY0}" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#334155">Plan LF</text>
<text x="${colSlope}" y="${rowY0}" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" fill="#334155">Lineal LF</text>`;

  const tableBody = tableEdges
    .map((e, i) => {
      const y = rowY0 + rowH * (i + 1);
      const s = (e.slopeFeetApprox ?? e.planFeet).toFixed(2);
      return `<text x="${colEdge}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#0f172a">E${e.index}</text>
<text x="${colKind}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#0369a1">${esc(roofEdgeKindAbbrev(e.kind))}</text>
<text x="${colPlan}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#0f172a">${esc(`${e.planFeet.toFixed(2)}'`)}</text>
<text x="${colSlope}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#0f172a">${esc(`${s}'`)}</text>`;
    })
    .join("");

  const tableMore =
    moreCount > 0
      ? `<text x="${colEdge}" y="${rowY0 + rowH * (tableEdges.length + 1)}" font-family="Arial, Helvetica, sans-serif" font-size="10" fill="#64748b">+ ${moreCount} more edges (see perimeter totals)</text>`
      : "";

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
<text x="56" y="108" font-family="Arial, Helvetica, sans-serif" font-size="16" fill="#334155">Per-edge LF — gray plan, orange classified lineal (rake / eave-ridge / hip).</text>
<text x="56" y="128" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#64748b">${
    ridgeAxisHeadingDeg !== undefined
      ? esc(
          `Ridge axis est.: ${ridgeAxisHeadingDeg.toFixed(0)}° from north (PCA on footprint). `,
        )
      : ""
  }E/R=eave·ridge, Rk=rake, H/V=hip·valley. Pitch required for slope column.</text>

<rect x="${chartLeft - 8}" y="${chartTop - 24}" width="200" height="36" fill="#ffffff" stroke="#e2e8f0" rx="6"/>
<text x="${chartLeft}" y="${chartTop - 8}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">■ Plan LF  ■ Slope LF</text>

<line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#cbd5e1" stroke-width="2"/>
<g>${bars}</g>

<g font-family="Arial, Helvetica, sans-serif">
${groups
  .slice(0, maxBars)
  .map((g, i) => {
    const x = chartLeft + i * (barW + barGap) + barW / 2;
    const yLabel = chartBottom + 22;
    const yValue = chartBottom + 40;
    return `<text x="${x.toFixed(1)}" y="${yLabel}" text-anchor="middle" font-size="10" fill="#475569">${esc(g.label)}</text>
<text x="${x.toFixed(1)}" y="${yValue}" text-anchor="middle" font-size="9" fill="#0f172a">${esc(`${g.planFt.toFixed(0)}/${g.slopeFt.toFixed(0)}`)}</text>`;
  })
  .join("")}
</g>

<rect x="48" y="${chartBottom + 48}" width="${w - 96}" height="${28 + rowH * (tableEdges.length + 2 + (moreCount > 0 ? 1 : 0))}" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
<g>${tableHeader}${tableBody}${tableMore}</g>

<rect x="56" y="${h - 52}" width="${w - 112}" height="36" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
<text x="72" y="${h - 28}" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#0f172a">Plan perimeter: ${esc(Math.round(perimeter).toLocaleString())} LF · Σ lineal: ${esc(sumSlope.toFixed(1))} LF · ${esc(String(edges.length))} edges</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
