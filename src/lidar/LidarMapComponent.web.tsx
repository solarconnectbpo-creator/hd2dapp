/**
 * Web: react-native-maps is not used — show instructions. Use Mapbox web (e.g. PropertySelectMap) or a native build.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

import type { MeasurementResult } from "./types";

export interface LidarMapComponentProps {
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMeasurementComplete?: (measurement: MeasurementResult) => void;
}

export const LidarMapComponent: React.FC<LidarMapComponentProps> = () => (
  <View style={styles.box}>
    <Text style={styles.title}>LiDAR map picker</Text>
    <Text style={styles.body}>
      This control uses <Text style={styles.mono}>react-native-maps</Text>, which targets iOS and Android. On web,
      use your existing Mapbox flows (e.g. roof trace / property maps) or run the app on a device.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  box: { flex: 1, padding: 24, justifyContent: "center", backgroundColor: "#f8fafc" },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12, color: "#0f172a" },
  body: { fontSize: 14, lineHeight: 22, color: "#475569" },
  mono: { fontFamily: "monospace", color: "#0f172a" },
});

export default LidarMapComponent;
