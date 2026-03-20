import * as turf from "@turf/turf";

export interface RoofDiagramInput {
  roofTraceGeoJson?: any;
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofType?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function areaSqToSquares(areaSqFt?: number): number | undefined {
  if (!areaSqFt || !Number.isFinite(areaSqFt) || areaSqFt <= 0) return undefined;
  return areaSqFt / 100;
}

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

export function buildRoofDiagramSvgDataUrl(input: RoofDiagramInput): string | undefined {
  const area = input.roofAreaSqFt;
  const perimeter = input.roofPerimeterFt;
  const squares = areaSqToSquares(area);
  const roofType = input.roofType?.trim();

  const w = 900;
  const h = 540;
  const pad = 56;

  const poly = extractPolygon(input.roofTraceGeoJson);
  let points = "";
  if (poly) {
    try {
      const ring = poly.geometry.coordinates?.[0] ?? [];
      if (ring.length >= 3) {
        const [minX, minY, maxX, maxY] = turf.bbox(poly);
        const spanX = Math.max(0.0000001, maxX - minX);
        const spanY = Math.max(0.0000001, maxY - minY);
        const drawW = w - pad * 2;
        const drawH = h - pad * 2 - 120;
        const scale = Math.min(drawW / spanX, drawH / spanY);
        const ox = (w - drawW) / 2;
        const oy = pad + 40;
        points = ring
          .map((p) => {
            const x = ox + (p[0] - minX) * scale;
            const y = oy + drawH - (p[1] - minY) * scale;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
      }
    } catch {
      // ignore
    }
  }

  const metricArea = area && Number.isFinite(area) ? `${Math.round(area).toLocaleString()} sq ft` : "Not traced";
  const metricPerim = perimeter && Number.isFinite(perimeter) ? `${Math.round(perimeter).toLocaleString()} ft` : "Not traced";
  const metricSquares = squares && Number.isFinite(squares) ? `${squares.toFixed(2)} squares` : "N/A";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="#f8fafc"/>
    <stop offset="100%" stop-color="#eef2ff"/>
  </linearGradient>
</defs>
<rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg)"/>
<rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="14" fill="#ffffff" stroke="#cbd5e1"/>
<text x="56" y="78" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="800" fill="#0f172a">Roof Measurement Diagram</text>
<text x="56" y="108" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#334155">${esc(roofType ? `Roof Type: ${roofType}` : "Roof Type: Not specified")}</text>
${points ? `<polygon points="${points}" fill="#f59e0b33" stroke="#d97706" stroke-width="3"/>` : `<rect x="${pad + 20}" y="170" width="${w - pad * 2 - 40}" height="${h - 280}" rx="10" fill="#f8fafc" stroke="#94a3b8" stroke-dasharray="7 6"/><text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#64748b">No traced roof polygon available</text>`}
<rect x="56" y="${h - 138}" width="${w - 112}" height="82" rx="10" fill="#f8fafc" stroke="#cbd5e1"/>
<text x="84" y="${h - 102}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#0f172a">Area: ${esc(metricArea)}</text>
<text x="360" y="${h - 102}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#0f172a">Perimeter: ${esc(metricPerim)}</text>
<text x="700" y="${h - 102}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#0f172a">Squares: ${esc(metricSquares)}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
