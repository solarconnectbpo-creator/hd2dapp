/**
 * LiDAR-style 3D geometry helpers.
 * - cartesian: x,y,z in meters (Euclidean).
 * - geographic: x = latitude (deg), y = longitude (deg), z = elevation (m); horizontal uses WGS84 geodesic / local ENU.
 */

import * as turf from "@turf/turf";

import type { Point3D, PointCoordinateSystem } from "./types";

/** WGS84 mean Earth radius (m), used for local ENU linearization. */
const R_EARTH = 6371008.7714;

function resolveCoordinateSystem(
  points: Point3D[],
  fallback: PointCoordinateSystem,
): PointCoordinateSystem {
  const explicit = points.find((p) => p.coordinateSystem != null);
  if (explicit?.coordinateSystem) return explicit.coordinateSystem;
  return fallback;
}

/** Horizontal east / north offsets (m) from ref to p; ref = vertex for angle at B. */
function enuEastNorthMeters(p: Point3D, ref: Point3D): { east: number; north: number } {
  const latRef = (ref.x * Math.PI) / 180;
  const dLat = ((p.x - ref.x) * Math.PI) / 180;
  const dLon = ((p.y - ref.y) * Math.PI) / 180;
  const north = dLat * R_EARTH;
  const east = dLon * Math.cos(latRef) * R_EARTH;
  return { east, north };
}

/** Project WGS84 vertices to local ENU (m) with horizontal origin at first point; z = absolute elevation (m). */
function projectGeographicToENU(points: Point3D[]): Point3D[] {
  const ref = points[0];
  return points.map((p) => {
    const { east, north } = enuEastNorthMeters(p, ref);
    return { x: east, y: north, z: p.z };
  });
}

function geodesicDistanceMeters(p1: Point3D, p2: Point3D): number {
  const horizontal = turf.distance(turf.point([p1.y, p1.x]), turf.point([p2.y, p2.x]), {
    units: "meters",
  });
  const dz = p2.z - p1.z;
  return Math.sqrt(horizontal * horizontal + dz * dz);
}

function geodesicPolygonAreaSqM(points: Point3D[]): number {
  if (points.length < 3) return 0;
  const ring = points.map((p) => [p.y, p.x] as [number, number]);
  ring.push([points[0].y, points[0].x]);
  const poly = turf.polygon([ring]);
  return turf.area(poly);
}

function cartesianVolume(points: Point3D[]): number {
  if (points.length < 4) return 0;
  const p0 = points[0];
  let volume = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const b = points[i];
    const c = points[i + 1];
    const cx = b.y * c.z - b.z * c.y;
    const cy = b.z * c.x - b.x * c.z;
    const cz = b.x * c.y - b.y * c.x;
    volume += p0.x * cx + p0.y * cy + p0.z * cz;
  }
  return Math.abs(volume) / 6;
}

export class LidarGeometryEngine {
  static calculateDistance(
    point1: Point3D,
    point2: Point3D,
    coordinateSystem: PointCoordinateSystem = "cartesian",
  ): number {
    const mode = resolveCoordinateSystem([point1, point2], coordinateSystem);
    if (mode === "geographic") {
      return geodesicDistanceMeters(point1, point2);
    }
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  static calculateAngle(
    pointA: Point3D,
    pointB: Point3D,
    pointC: Point3D,
    coordinateSystem: PointCoordinateSystem = "cartesian",
  ): number {
    const mode = resolveCoordinateSystem([pointA, pointB, pointC], coordinateSystem);
    if (mode === "geographic") {
      const enuA = enuEastNorthMeters(pointA, pointB);
      const enuC = enuEastNorthMeters(pointC, pointB);
      const eastA = enuA.east;
      const northA = enuA.north;
      const eastC = enuC.east;
      const northC = enuC.north;
      const vectorBA = {
        x: eastA,
        y: northA,
        z: pointA.z - pointB.z,
      };
      const vectorBC = {
        x: eastC,
        y: northC,
        z: pointC.z - pointB.z,
      };
      const dotProduct =
        vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y + vectorBA.z * vectorBC.z;
      const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2 + vectorBA.z ** 2);
      const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2);
      if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
      const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
      return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
    }
    const vectorBA = {
      x: pointA.x - pointB.x,
      y: pointA.y - pointB.y,
      z: pointA.z - pointB.z,
    };
    const vectorBC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y,
      z: pointC.z - pointB.z,
    };
    const dotProduct =
      vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y + vectorBA.z * vectorBC.z;
    const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2 + vectorBA.z ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2);
    if (magnitudeBA === 0 || magnitudeBC === 0) return 0;
    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  }

  /** Planar area: geodesic polygon (m²) when geographic; shoelace in XY when cartesian. */
  static calculateArea(points: Point3D[], coordinateSystem: PointCoordinateSystem = "cartesian"): number {
    const mode = resolveCoordinateSystem(points, coordinateSystem);
    if (mode === "geographic") {
      return geodesicPolygonAreaSqM(points);
    }
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * Fan volume from origin through first vertex (same model as before).
   * Geographic: vertices projected to local ENU (m) at first point, then metric fan volume.
   */
  static calculateVolume(points: Point3D[], coordinateSystem: PointCoordinateSystem = "cartesian"): number {
    const mode = resolveCoordinateSystem(points, coordinateSystem);
    if (mode === "geographic") {
      if (points.length < 4) return 0;
      const metric = projectGeographicToENU(points);
      return cartesianVolume(metric);
    }
    return cartesianVolume(points);
  }

  static calculateElevationProfile(
    startPoint: Point3D,
    endPoint: Point3D,
    samples: number = 10,
    coordinateSystem: PointCoordinateSystem = "cartesian",
  ): Point3D[] {
    const mode = resolveCoordinateSystem([startPoint, endPoint], coordinateSystem);
    const profile: Point3D[] = [];
    const n = Math.max(1, Math.floor(samples));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (mode === "geographic") {
        profile.push({
          x: startPoint.x + (endPoint.x - startPoint.x) * t,
          y: startPoint.y + (endPoint.y - startPoint.y) * t,
          z: startPoint.z + (endPoint.z - startPoint.z) * t,
        });
      } else {
        profile.push({
          x: startPoint.x + (endPoint.x - startPoint.x) * t,
          y: startPoint.y + (endPoint.y - startPoint.y) * t,
          z: startPoint.z + (endPoint.z - startPoint.z) * t,
        });
      }
    }
    return profile;
  }

  static filterByElevation(points: Point3D[], minElevation: number, maxElevation: number): Point3D[] {
    return points.filter((p) => p.z >= minElevation && p.z <= maxElevation);
  }

  static getBoundingBox(points: Point3D[]): { min: Point3D; max: Point3D } {
    if (points.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }
    let minX = points[0].x,
      maxX = points[0].x;
    let minY = points[0].y,
      maxY = points[0].y;
    let minZ = points[0].z,
      maxZ = points[0].z;
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
    return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
  }

  static downsamplePointCloud(
    points: Point3D[],
    gridSize: number,
    coordinateSystem: PointCoordinateSystem = "cartesian",
  ): Point3D[] {
    if (gridSize <= 0) return [...points];
    const mode = points.length ? resolveCoordinateSystem(points, coordinateSystem) : coordinateSystem;
    const grid = new Map<string, Point3D[]>();
    const ref = points[0];
    for (const point of points) {
      let key: string;
      if (mode === "geographic" && ref) {
        const { east, north } = enuEastNorthMeters(point, ref);
        key = `${Math.floor(east / gridSize)},${Math.floor(north / gridSize)},${Math.floor(point.z / gridSize)}`;
      } else {
        key = `${Math.floor(point.x / gridSize)},${Math.floor(point.y / gridSize)},${Math.floor(point.z / gridSize)}`;
      }
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(point);
    }
    const downsampled: Point3D[] = [];
    for (const cluster of grid.values()) {
      downsampled.push({
        x: cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length,
        y: cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length,
        z: cluster.reduce((sum, p) => sum + p.z, 0) / cluster.length,
      });
    }
    return downsampled;
  }
}

export default LidarGeometryEngine;
