/**
 * Heuristic 3D roof plane detection from point clouds (RANSAC + simplified hull).
 * Not a substitute for survey-grade photogrammetry — useful for estimates / visualization.
 */

export interface RoofPlane {
  id: string;
  vertices: Array<[number, number, number]>;
  normal: [number, number, number];
  pitch: number;
  direction: number;
  area: number;
  perimeter: number;
  material?: string;
  condition?: "excellent" | "good" | "fair" | "poor" | "critical";
  color: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  intensity?: number;
}

export interface RoofGeometryModel {
  planes: RoofPlane[];
  totalArea: number;
  totalPitchAdjustedArea: number;
  centerPoint: [number, number, number];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  complexity: number;
  hasComplexFeatures: boolean;
  ridges: Array<{
    start: [number, number, number];
    end: [number, number, number];
    length: number;
    adjacentPlanes: [number, number];
  }>;
  valleys: Array<{
    start: [number, number, number];
    end: [number, number, number];
    length: number;
    adjacentPlanes: [number, number];
  }>;
}

export class Advanced3DRoofMeasurement {
  static detectRoofPlanes(
    pointCloud: Point3D[],
    distanceThreshold = 0.15,
    minPointsPerPlane = 50,
    maxIterations = 1000,
  ): RoofPlane[] {
    const planes: RoofPlane[] = [];
    const usedPoints = new Set<number>();

    for (let iter = 0; iter < maxIterations; iter++) {
      if (usedPoints.size >= pointCloud.length * 0.8) break;

      const plane = this.ransacPlane(pointCloud, distanceThreshold, usedPoints);

      if (!plane) break;

      if (plane.pointIndices.length >= minPointsPerPlane) {
        const vertices = this.convexHull3D(
          plane.pointIndices.map(
            (idx) =>
              [pointCloud[idx].x, pointCloud[idx].y, pointCloud[idx].z] as [
                number,
                number,
                number,
              ],
          ),
        );

        if (vertices.length >= 3) {
          const pitch = this.calculatePitch(plane.normal);
          const direction = this.calculateDirection(plane.normal);
          const area = this.calculatePolygonArea(vertices);

          planes.push({
            id: `plane_${planes.length}`,
            vertices: vertices as Array<[number, number, number]>,
            normal: plane.normal,
            pitch,
            direction,
            area,
            perimeter: this.calculatePerimeter(vertices),
            color: this.getPitchColor(pitch),
          });

          plane.pointIndices.forEach((idx) => usedPoints.add(idx));
        }
      }
    }

    return planes;
  }

  private static ransacPlane(
    pointCloud: Point3D[],
    distanceThreshold: number,
    usedPoints: Set<number>,
  ): {
    normal: [number, number, number];
    pointIndices: number[];
  } | null {
    const availableIndices = Array.from(
      { length: pointCloud.length },
      (_, i) => i,
    ).filter((i) => !usedPoints.has(i));

    if (availableIndices.length < 3) return null;

    let bestPlane: {
      normal: [number, number, number];
      pointIndices: number[];
    } | null = null;
    let maxInliers = 0;

    for (let i = 0; i < 100; i++) {
      const indices = this.randomSample(availableIndices, 3);
      const p1 = pointCloud[indices[0]];
      const p2 = pointCloud[indices[1]];
      const p3 = pointCloud[indices[2]];

      const v1 = [p2.x - p1.x, p2.y - p1.y, p2.z - p1.z];
      const v2 = [p3.x - p1.x, p3.y - p1.y, p3.z - p1.z];
      const normal = this.crossProduct(v1, v2);
      const normalLength = Math.sqrt(
        normal[0] ** 2 + normal[1] ** 2 + normal[2] ** 2,
      );

      if (normalLength < 0.001) continue;

      const normalUnit: [number, number, number] = [
        normal[0] / normalLength,
        normal[1] / normalLength,
        normal[2] / normalLength,
      ];

      const inliers: number[] = [];
      for (const idx of availableIndices) {
        const point = pointCloud[idx];
        const distance = Math.abs(
          normalUnit[0] * (point.x - p1.x) +
            normalUnit[1] * (point.y - p1.y) +
            normalUnit[2] * (point.z - p1.z),
        );

        if (distance < distanceThreshold) {
          inliers.push(idx);
        }
      }

      if (inliers.length > maxInliers) {
        maxInliers = inliers.length;
        bestPlane = {
          normal: normalUnit,
          pointIndices: inliers,
        };
      }
    }

    return bestPlane;
  }

  private static convexHull3D(
    points: Array<[number, number, number]>,
  ): Array<[number, number, number]> {
    if (points.length <= 3) return points;

    const center = this.centroid(points);

    let maxDist = 0;
    let p1 = points[0];

    for (const point of points) {
      const dist = Math.hypot(
        point[0] - center[0],
        point[1] - center[1],
        point[2] - center[2],
      );
      if (dist > maxDist) {
        maxDist = dist;
        p1 = point;
      }
    }

    const sorted = points
      .filter((p) => p[0] !== p1[0] || p[1] !== p1[1] || p[2] !== p1[2])
      .sort((a, b) => {
        const angleA = Math.atan2(a[1] - p1[1], a[0] - p1[0]);
        const angleB = Math.atan2(b[1] - p1[1], b[0] - p1[0]);
        return angleA - angleB;
      });

    return [p1, ...sorted.slice(0, Math.min(10, sorted.length))];
  }

  private static centroid(
    points: Array<[number, number, number]>,
  ): [number, number, number] {
    if (points.length === 0) return [0, 0, 0];
    let x = 0;
    let y = 0;
    let z = 0;
    for (const p of points) {
      x += p[0];
      y += p[1];
      z += p[2];
    }
    const n = points.length;
    return [x / n, y / n, z / n];
  }

  private static crossProduct(a: number[], b: number[]): number[] {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  }

  private static randomSample<T>(arr: T[], size: number): T[] {
    const n = Math.min(size, arr.length);
    const result: T[] = [];
    const indices = new Set<number>();

    if (n === 0) return result;

    let guard = 0;
    while (result.length < n && guard < arr.length * 20) {
      guard++;
      const idx = Math.floor(Math.random() * arr.length);
      if (!indices.has(idx)) {
        indices.add(idx);
        result.push(arr[idx]);
      }
    }
    return result;
  }

  private static calculatePitch(normal: [number, number, number]): number {
    const zComponent = Math.abs(normal[2]);
    const xyMagnitude = Math.sqrt(normal[0] ** 2 + normal[1] ** 2);
    const pitchRad = Math.atan2(xyMagnitude, zComponent);
    return Math.round(((pitchRad * 180) / Math.PI) * 10) / 10;
  }

  private static calculateDirection(normal: [number, number, number]): number {
    let direction = Math.atan2(normal[1], normal[0]) * (180 / Math.PI);
    direction = (direction + 90 + 360) % 360;
    return Math.round(direction);
  }

  private static calculatePolygonArea(
    vertices: Array<[number, number, number]>,
  ): number {
    if (vertices.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      const cross = this.crossProduct(v1, v2);
      area += Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2) / 2;
    }

    return area;
  }

  private static calculatePerimeter(
    vertices: Array<[number, number, number]>,
  ): number {
    let perimeter = 0;
    for (let i = 0; i < vertices.length; i++) {
      const v1 = vertices[i];
      const v2 = vertices[(i + 1) % vertices.length];
      perimeter += Math.hypot(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
    }
    return perimeter;
  }

  private static getPitchColor(pitch: number): string {
    if (pitch < 5) return "#FF6B6B";
    if (pitch < 15) return "#FFA06B";
    if (pitch < 25) return "#FFD700";
    if (pitch < 35) return "#90EE90";
    if (pitch < 50) return "#4169E1";
    return "#8B008B";
  }

  static buildRoofGeometry(planes: RoofPlane[]): RoofGeometryModel {
    if (planes.length === 0) {
      return {
        planes: [],
        totalArea: 0,
        totalPitchAdjustedArea: 0,
        centerPoint: [0, 0, 0],
        boundingBox: {
          min: [0, 0, 0],
          max: [0, 0, 0],
        },
        complexity: 0,
        hasComplexFeatures: false,
        ridges: [],
        valleys: [],
      };
    }

    const totalArea = planes.reduce((sum, p) => sum + p.area, 0);

    const totalPitchAdjustedArea = planes.reduce((sum, p) => {
      const pitchRad = (p.pitch * Math.PI) / 180;
      const c = Math.cos(pitchRad);
      return sum + (Math.abs(c) < 1e-6 ? p.area : p.area / c);
    }, 0);

    const allVertices = planes.flatMap((p) => p.vertices);
    const centerPoint = this.centroid(
      allVertices as Array<[number, number, number]>,
    );

    const bbox = this.calculateBBox(allVertices);

    const ridges = this.detectRidges(planes);
    const valleys = this.detectValleys(planes);

    const complexity = this.calculateComplexity(planes);

    return {
      planes,
      totalArea,
      totalPitchAdjustedArea,
      centerPoint,
      boundingBox: bbox,
      complexity,
      hasComplexFeatures: ridges.length > 0 || valleys.length > 0,
      ridges,
      valleys,
    };
  }

  private static detectRidges(
    planes: RoofPlane[],
  ): RoofGeometryModel["ridges"] {
    const ridges: RoofGeometryModel["ridges"] = [];

    for (let i = 0; i < planes.length; i++) {
      for (let j = i + 1; j < planes.length; j++) {
        const plane1 = planes[i];
        const plane2 = planes[j];

        for (const v1 of plane1.vertices) {
          for (const v2 of plane2.vertices) {
            const dist = Math.hypot(
              v2[0] - v1[0],
              v2[1] - v1[1],
              v2[2] - v1[2],
            );

            if (dist < 0.1) {
              const dotProduct =
                plane1.normal[0] * plane2.normal[0] +
                plane1.normal[1] * plane2.normal[1] +
                plane1.normal[2] * plane2.normal[2];

              if (dotProduct < 0.8) {
                ridges.push({
                  start: v1,
                  end: v2,
                  length: dist,
                  adjacentPlanes: [i, j],
                });
              }
            }
          }
        }
      }
    }

    return ridges;
  }

  private static detectValleys(
    planes: RoofPlane[],
  ): RoofGeometryModel["valleys"] {
    const valleys: RoofGeometryModel["valleys"] = [];

    for (let i = 0; i < planes.length; i++) {
      for (let j = i + 1; j < planes.length; j++) {
        const plane1 = planes[i];
        const plane2 = planes[j];

        const dotProduct =
          plane1.normal[0] * plane2.normal[0] +
          plane1.normal[1] * plane2.normal[1] +
          plane1.normal[2] * plane2.normal[2];

        if (dotProduct > 0.8) {
          valleys.push({
            start: plane1.vertices[0],
            end: plane2.vertices[0],
            length: Math.hypot(
              plane2.vertices[0][0] - plane1.vertices[0][0],
              plane2.vertices[0][1] - plane1.vertices[0][1],
              plane2.vertices[0][2] - plane1.vertices[0][2],
            ),
            adjacentPlanes: [i, j],
          });
        }
      }
    }

    return valleys;
  }

  private static calculateBBox(vertices: Array<[number, number, number]>): {
    min: [number, number, number];
    max: [number, number, number];
  } {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const v of vertices) {
      minX = Math.min(minX, v[0]);
      maxX = Math.max(maxX, v[0]);
      minY = Math.min(minY, v[1]);
      maxY = Math.max(maxY, v[1]);
      minZ = Math.min(minZ, v[2]);
      maxZ = Math.max(maxZ, v[2]);
    }

    return {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
    };
  }

  private static calculateComplexity(planes: RoofPlane[]): number {
    let complexity = 0;

    complexity += Math.min(1, planes.length / 10);

    const pitches = planes.map((p) => p.pitch);
    const avgPitch =
      pitches.reduce((a, b) => a + b, 0) / Math.max(pitches.length, 1);
    const pitchVariance =
      pitches.reduce((sum, p) => sum + (p - avgPitch) ** 2, 0) /
      Math.max(pitches.length, 1);
    complexity += Math.min(1, pitchVariance / 100);

    const directions = planes.map((p) => p.direction);
    const uniqueDirections = new Set(directions.map((d) => Math.round(d / 45)));
    complexity += Math.min(1, uniqueDirections.size / 8);

    return Math.round((complexity / 3) * 100) / 100;
  }
}

export default Advanced3DRoofMeasurement;
