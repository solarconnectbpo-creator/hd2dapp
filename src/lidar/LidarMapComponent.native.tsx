/**
 * Native (iOS/Android): map tap to collect Point3D samples and run LiDAR-style measurements.
 * Uses react-native-maps (not Mapbox GL). For true Z, supply elevation from LiDAR/DEM when calling addPoint.
 */

import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import MapView, { Marker, Polygon } from "react-native-maps";

import useLidarMeasurement from "./useLidarMeasurement";
import type { MeasurementResult, Point3D } from "./types";

export interface LidarMapComponentProps {
  /** Initial map center (defaults SF) */
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMeasurementComplete?: (measurement: MeasurementResult) => void;
}

export const LidarMapComponent: React.FC<LidarMapComponentProps> = ({
  onMeasurementComplete,
  initialRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
}) => {
  const mapRef = useRef<MapView>(null);
  const {
    selectedPoints,
    measurements,
    isDrawing,
    setIsDrawing,
    addPoint,
    clearPoints,
    calculateMeasurements,
  } = useLidarMeasurement();

  const handleMapPress = (event: {
    nativeEvent: { coordinate: { latitude: number; longitude: number } };
  }) => {
    if (!isDrawing) return;
    const { coordinate } = event.nativeEvent;
    const point: Point3D = {
      x: coordinate.latitude,
      y: coordinate.longitude,
      z: 0,
    };
    addPoint(point);
  };

  const handleMeasure = () => {
    const result = calculateMeasurements();
    if (result && onMeasurementComplete) onMeasurementComplete(result);
  };

  const polygonCoordinates = selectedPoints.map((p) => ({
    latitude: p.x,
    longitude: p.y,
  }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        onPress={handleMapPress}
        initialRegion={initialRegion}
        mapType="satellite"
      >
        {selectedPoints.map((point, index) => (
          <Marker
            key={`${point.x}-${point.y}-${index}`}
            coordinate={{ latitude: point.x, longitude: point.y }}
            title={`Point ${index + 1}`}
            description={`Z: ${point.z} (set from LiDAR/DEM for real elevation)`}
          />
        ))}
        {selectedPoints.length > 2 ? (
          <Polygon
            coordinates={polygonCoordinates}
            fillColor="rgba(0, 200, 0, 0.3)"
            strokeColor="rgba(0, 200, 0, 1)"
            strokeWidth={2}
          />
        ) : null}
      </MapView>

      <View style={styles.controlPanel}>
        <ScrollView
          style={styles.scrollView}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[
              styles.button,
              isDrawing ? styles.buttonActive : styles.buttonInactive,
            ]}
            onPress={() => setIsDrawing(!isDrawing)}
          >
            <Text style={styles.buttonText}>
              {isDrawing ? "Stop drawing" : "Start drawing"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonMeasure]}
            onPress={handleMeasure}
            disabled={selectedPoints.length < 2}
          >
            <Text style={styles.buttonText}>Calculate measurement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonClear]}
            onPress={clearPoints}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>
            Tap the map while drawing is on. x/y are lat/lng; area/volume math
            assumes planar X/Y unless you use projected coordinates.
          </Text>

          {measurements ? (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Results</Text>
              {measurements.distance !== undefined ? (
                <Text style={styles.resultText}>
                  Distance: {measurements.distance.toFixed(4)} (XY+Z units)
                </Text>
              ) : null}
              {measurements.angle !== undefined ? (
                <Text style={styles.resultText}>
                  Angle: {measurements.angle.toFixed(2)}°
                </Text>
              ) : null}
              {measurements.area !== undefined ? (
                <Text style={styles.resultText}>
                  Area (planar XY): {measurements.area.toFixed(6)}
                </Text>
              ) : null}
              {measurements.volume !== undefined ? (
                <Text style={styles.resultText}>
                  Volume (fan est.): {measurements.volume.toFixed(6)}
                </Text>
              ) : null}
              {measurements.elevationChange !== undefined ? (
                <Text style={styles.resultText}>
                  |ΔZ|: {measurements.elevationChange.toFixed(4)}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Points: {selectedPoints.length}</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },
  controlPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    maxHeight: "40%",
  },
  scrollView: { maxHeight: "100%" },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: "center",
  },
  buttonActive: { backgroundColor: "#4CAF50" },
  buttonInactive: { backgroundColor: "#999" },
  buttonMeasure: { backgroundColor: "#2196F3" },
  buttonClear: { backgroundColor: "#f44336" },
  buttonText: { color: "white", fontSize: 14, fontWeight: "600" },
  resultsContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  resultText: { fontSize: 12, color: "#666", marginVertical: 3 },
  infoContainer: {
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  infoText: { fontSize: 12, color: "#1976d2" },
  hint: { fontSize: 11, color: "#666", marginTop: 8, lineHeight: 16 },
});

export default LidarMapComponent;
