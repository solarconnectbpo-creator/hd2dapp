import type { Feature, Polygon, Position } from "geojson";

export type FootprintFeature = Feature<Polygon>;

const METERS_PER_DEG_LAT = 111320;
function toLocalFeet(lng: number, lat: number, origin: { lng: number; lat: number }): [number, number] {
  const phi = (origin.lat * Math.PI) / 180;
  const cosLat = Math.cos(phi);
  const x = ((lng - origin.lng) * Math.PI) / 180 * METERS_PER_DEG_LAT * cosLat * 3.28084;
  const y = ((lat - origin.lat) * Math.PI) / 180 * METERS_PER_DEG_LAT * 3.28084;
  return [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000];
}

/**
 * Build ASCII DXF with LWPOLYLINE entities in feet (local plane at first vertex).
 */
export function buildFootprintDxfFromPolygons(features: FootprintFeature[], layerName = "ROOF_FOOTPRINT"): string {
  const polys = features.filter((f) => f.geometry?.type === "Polygon");
  if (!polys.length) {
    return ["0", "SECTION", "2", "HEADER", "0", "ENDSEC", "0", "EOF"].join("\r\n");
  }

  const lines: string[] = [];
  lines.push("0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1015", "0", "ENDSEC");
  lines.push("0", "SECTION", "2", "TABLES", "0", "ENDSEC");
  lines.push("0", "SECTION", "2", "ENTITIES");

  let handle = 100;
  for (const f of polys) {
    const ring = f.geometry.coordinates[0] as Position[];
    if (!ring || ring.length < 3) continue;
    const first = ring[0];
    if (!Array.isArray(first) || first.length < 2) continue;
    const origin = { lng: first[0]!, lat: first[1]! };

    const xy: [number, number][] = [];
    for (const p of ring) {
      if (!Array.isArray(p) || p.length < 2) continue;
      xy.push(toLocalFeet(p[0]!, p[1]!, origin));
    }
    if (xy.length < 3) continue;

    handle++;
    const n = xy.length;
    lines.push("0", "LWPOLYLINE", "5", String(handle));
    lines.push("100", "AcDbEntity", "8", layerName);
    lines.push("100", "AcDbPolyline");
    lines.push("90", String(n));
    lines.push("70", "1");
    for (const [x, y] of xy) {
      lines.push("10", x.toFixed(4));
      lines.push("20", y.toFixed(4));
    }
  }

  lines.push("0", "ENDSEC", "0", "EOF");
  return lines.join("\r\n");
}
