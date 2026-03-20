import React from "react";
import { View, Text, StyleSheet } from "react-native";

import type { PropertySelection } from "./roofReportTypes";

export interface PropertySelectMapProps {
  onPropertySelected: (property: PropertySelection) => void;
  leads?: PropertySelection[];
  /** When `key` changes, web map flies to this point (picker search). */
  focusRequest?: { lat: number; lng: number; key: number };
}

// Non-web fallback. Mapbox GL setup is currently implemented for web only.
export default function PropertySelectMap({ onPropertySelected }: PropertySelectMapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Property Map (Web only)</Text>
      <Text style={styles.body}>
        Mapbox GL is not enabled for native builds in this demo. Select a property on the web build,
        or export by editing after selection.
      </Text>
      {/* Small helper so users can still proceed on non-web while testing */}
      <Text
        style={styles.link}
        onPress={() =>
          onPropertySelected({
            address: "Demo property (not geocoded)",
            lat: 0,
            lng: 0,
            clickedAtIso: new Date().toISOString(),
          })
        }
      >
        Use demo property
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 13, color: "#555", textAlign: "center", marginBottom: 12 },
  link: { color: "#2563EB", fontWeight: "700", textAlign: "center" },
});

