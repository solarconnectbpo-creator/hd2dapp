/**
 * TypeScript types for LiDAR-style measurement helpers (3D points, results, point clouds, Mapbox layer hints).
 */

export type PointCoordinateSystem = "geographic" | "cartesian";

export interface Point3D {
  /** Latitude or local/plan X */
  x: number;
  /** Longitude or local/plan Y */
  y: number;
  /** Elevation or Z (meters in metric workflows) */
  z: number;
  /** When omitted, geometry uses the coordinate system passed to measurement helpers (see useLidarMeasurement). */
  coordinateSystem?: PointCoordinateSystem;
  /** Optional return intensity */
  intensity?: number;
  /** Optional capture time (ISO string) */
  timestamp?: string;
}

export interface MeasurementResult {
  /** Straight-line distance: geodesic horizontal + vertical (m) when geographic; Euclidean when cartesian. */
  distance?: number;
  /** Angle at middle point, degrees */
  angle?: number;
  /** Planar or projected area (square meters if inputs are meters) */
  area?: number;
  /** Volume estimate (cubic meters if inputs are meters) */
  volume?: number;
  /** Absolute vertical delta */
  elevationChange?: number;
  timestamp: string;
}

export interface PointCloud {
  points: Point3D[];
  metadata?: {
    source: string;
    captureTime: string;
    /** Points per meter (or vendor-specific density) */
    resolution: number;
  };
}

export interface MapboxLidarLayer {
  id: string;
  type: "circle" | "fill" | "line";
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
}
