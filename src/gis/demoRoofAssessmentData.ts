import type { Point3D } from "@/src/gis/advanced3dRoofMeasurement";
import type { BuildingFootprint } from "@/src/gis/gisBuildingService";

function haversineM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function pickClosestBuildingFootprint(
  buildings: BuildingFootprint[],
  lat: number,
  lon: number,
): BuildingFootprint | null {
  if (!buildings.length) return null;
  let best: BuildingFootprint | null = null;
  let bestD = Infinity;
  for (const b of buildings) {
    const [blon, blat] = b.centerPoint;
    const d = haversineM(lat, lon, blat, blon);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** When OSM has no building way, use a small bbox around the pin for measurements. */
export function buildFallbackBuildingFootprint(
  lat: number,
  lng: number,
  idSuffix: string,
): BuildingFootprint {
  const d = 0.00025;
  return {
    id: `fallback_${idSuffix}`,
    osmId: 0,
    coordinates: [
      [lng - d, lat - d],
      [lng + d, lat - d],
      [lng + d, lat + d],
      [lng - d, lat + d],
    ],
    area: 150,
    perimeter: 160,
    height: 10,
    roofShape: "unknown",
    centerPoint: [lng, lat],
    bbox: {
      minLon: lng - d,
      minLat: lat - d,
      maxLon: lng + d,
      maxLat: lat + d,
    },
  };
}

/** Dense points on a single sloped plane so RANSAC can detect a plane (≥ default min inliers). */
export function createDemoPointCloud(): Point3D[] {
  const pts: Point3D[] = [];
  for (let i = 0; i < 220; i++) {
    const x = (Math.random() - 0.5) * 18;
    const y = (Math.random() - 0.5) * 18;
    const z = 0.12 * x + 0.08 * y + (Math.random() - 0.5) * 0.08;
    pts.push({ x, y, z });
  }
  return pts;
}

export const DEMO_BUILDING_FOOTPRINT: BuildingFootprint = {
  id: "demo_building",
  osmId: 0,
  coordinates: [
    [-77.0365, 38.8974],
    [-77.0355, 38.8974],
    [-77.0355, 38.8984],
    [-77.0365, 38.8984],
  ],
  area: 164,
  perimeter: 420,
  height: 12,
  roofShape: "gabled",
  centerPoint: [-77.036, 38.8979],
  bbox: {
    minLon: -77.0365,
    minLat: 38.8974,
    maxLon: -77.0355,
    maxLat: 38.8984,
  },
};
