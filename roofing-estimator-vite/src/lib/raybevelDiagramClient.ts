/**
 * Dev-only bridge to R/raybevel via Vite middleware POST /api/raybevel-diagram.
 * @see https://github.com/tylermorganwall/raybevel
 */

const RAYBEVEL_DEV_PATH = "/api/raybevel-diagram";

export function exteriorRingLngLatFromPolygonFeature(feature: {
  geometry?: { type?: string; coordinates?: number[][][] };
}): [number, number][] | null {
  const g = feature.geometry;
  if (g?.type !== "Polygon" || !Array.isArray(g.coordinates?.[0])) return null;
  const ring = g.coordinates[0];
  if (ring.length < 4) return null;
  return ring.map(([x, y]) => [x, y] as [number, number]);
}

export async function fetchRaybevelSkeletonSvg(ring: [number, number][]): Promise<{ svg: string } | { error: string }> {
  if (!import.meta.env.DEV) {
    return { error: "Raybevel diagram API is only wired in Vite dev (see roof-diagram-raybevel/README.md)." };
  }
  try {
    const res = await fetch(RAYBEVEL_DEV_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ring }),
    });
    const text = await res.text();
    if (!res.ok) {
      return { error: text.trim() || `HTTP ${res.status}` };
    }
    if (!text.includes("<svg")) {
      return { error: "Unexpected response (not SVG)." };
    }
    return { svg: text };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed";
    return { error: msg };
  }
}
