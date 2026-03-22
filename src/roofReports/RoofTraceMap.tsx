import React from "react";
import { View, Text, StyleSheet } from "react-native";

import type { RoofPoint3D } from "./roofTrace3d";

export type { RoofPoint3D } from "./roofTrace3d";

export interface RoofTraceMetrics {
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  // GeoJSON is optional; only used for future overlays/export.
  geoJson?: any;
  /** Web: terrain-sampled polygon corners (Mapbox DEM). */
  roofTracePoints3D?: RoofPoint3D[];
  avgTerrainElevationM?: number;
  /** Advisory rise:12 from terrain spread vs span (not a substitute for field measure). */
  terrainPitchEstimate?: string;
}

export interface RoofTraceMapProps {
  initialCenter?: { lat: number; lng: number };
  onTraceChange: (metrics: RoofTraceMetrics | null) => void;
  /**
   * Web only: after flying to the property, pick the Microsoft building footprint under the pin
   * and load it into the tracer (best-effort).
   */
  autoTraceFromFootprint?: boolean;
  /**
   * Web only: tint the traced roof polygon to match selected material (shingle, tile, slate, TPO, metal).
   */
  traceMaterialType?: string;
}

export default function RoofTraceMap({
  onTraceChange,
  autoTraceFromFootprint: _auto,
  traceMaterialType: _material,
}: RoofTraceMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Roof tracing (web only)</Text>
      <Text style={styles.body}>
        Rooftop measurements are populated automatically when you trace a roof
        polygon on the web build.
      </Text>
      <Text
        style={styles.link}
        onPress={() => {
          onTraceChange(null);
        }}
      >
        Clear trace
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  body: { fontSize: 13, color: "#64748b", lineHeight: 18 },
  link: { marginTop: 10, color: "#2563EB", fontWeight: "700" },
});
