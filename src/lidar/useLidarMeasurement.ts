/**
 * React hook for LiDAR-style point picking and geometry measurements (Expo / React Native).
 */

import { useState, useCallback } from "react";

import LidarGeometryEngine from "./LidarGeometryEngine";
import type {
  MeasurementResult,
  Point3D,
  PointCoordinateSystem,
} from "./types";

export function useLidarMeasurement(options?: {
  coordinateSystem?: PointCoordinateSystem;
}) {
  const coordinateSystem: PointCoordinateSystem =
    options?.coordinateSystem ?? "geographic";
  const [selectedPoints, setSelectedPoints] = useState<Point3D[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementResult | null>(
    null,
  );
  const [isDrawing, setIsDrawing] = useState(false);

  const addPoint = useCallback((point: Point3D) => {
    setSelectedPoints((prev) => [...prev, point]);
  }, []);

  const clearPoints = useCallback(() => {
    setSelectedPoints([]);
    setMeasurements(null);
  }, []);

  const calculateMeasurements = useCallback(():
    | MeasurementResult
    | undefined => {
    if (selectedPoints.length < 2) {
      console.warn("Need at least 2 points for measurement");
      return undefined;
    }

    const result: MeasurementResult = {
      distance: undefined,
      angle: undefined,
      area: undefined,
      volume: undefined,
      elevationChange: undefined,
      timestamp: new Date().toISOString(),
    };

    if (selectedPoints.length === 2) {
      result.distance = LidarGeometryEngine.calculateDistance(
        selectedPoints[0],
        selectedPoints[1],
        coordinateSystem,
      );
      result.elevationChange = Math.abs(
        selectedPoints[1].z - selectedPoints[0].z,
      );
    } else if (selectedPoints.length === 3) {
      result.angle = LidarGeometryEngine.calculateAngle(
        selectedPoints[0],
        selectedPoints[1],
        selectedPoints[2],
        coordinateSystem,
      );
    } else {
      result.area = LidarGeometryEngine.calculateArea(
        selectedPoints,
        coordinateSystem,
      );
      result.volume = LidarGeometryEngine.calculateVolume(
        selectedPoints,
        coordinateSystem,
      );
    }

    setMeasurements(result);
    return result;
  }, [selectedPoints, coordinateSystem]);

  return {
    selectedPoints,
    measurements,
    isDrawing,
    setIsDrawing,
    addPoint,
    clearPoints,
    calculateMeasurements,
  };
}

export default useLidarMeasurement;
