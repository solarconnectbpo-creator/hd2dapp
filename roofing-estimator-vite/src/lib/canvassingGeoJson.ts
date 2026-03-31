import type { ContactRecord } from "./contactsCsv";

/** Import points from GeoJSON FeatureCollection / single Feature (addresses in properties). */
export function parseLeadsFromGeoJson(text: string): ContactRecord[] {
  let root: unknown;
  try {
    root = JSON.parse(text) as unknown;
  } catch {
    return [];
  }
  const features: Array<{ geometry?: { type?: string; coordinates?: unknown }; properties?: Record<string, unknown> }> =
    [];
  if (root && typeof root === "object" && !Array.isArray(root)) {
    const o = root as { type?: string; features?: unknown[]; geometry?: unknown; properties?: unknown };
    if (o.type === "FeatureCollection" && Array.isArray(o.features)) {
      for (const f of o.features) {
        if (f && typeof f === "object") features.push(f as (typeof features)[0]);
      }
    } else if (o.type === "Feature") {
      features.push(o as (typeof features)[0]);
    }
  }
  const batchId = Date.now();
  const out: ContactRecord[] = [];
  let i = 0;
  for (const f of features) {
    i += 1;
    const g = f.geometry;
    if (!g || g.type !== "Point" || !Array.isArray(g.coordinates)) continue;
    const coords = g.coordinates as number[];
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const p = f.properties ?? {};
    const str = (k: string) => (p[k] != null ? String(p[k]).trim() : "");
    const address = str("address") || str("street") || str("Street") || str("SITE_ADDR") || str("site_addr");
    const city = str("city") || str("CITY") || str("City");
    const state = str("state") || str("STATE") || str("st") || str("ST");
    const zip = str("zip") || str("ZIP") || str("zipcode") || str("ZIPCODE");
    const name = str("name") || str("owner") || str("OWNER") || str("label") || "Lead";
    out.push({
      id: `canvass_geo_${batchId}_${i}`,
      name,
      company: str("company") || "",
      email: str("email") || "",
      phone: str("phone") || "",
      address,
      city,
      state,
      zip,
      lat,
      lng,
      notes: str("notes") || "",
    });
  }
  return out;
}
