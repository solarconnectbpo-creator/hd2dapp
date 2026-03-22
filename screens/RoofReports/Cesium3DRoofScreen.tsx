import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

/**
 * Native (iOS/Android): CesiumJS is web-only. Use the web build for the 3D globe demo.
 */
export default function Cesium3DRoofScreen() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ThemedText type="body" style={{ color: theme.textSecondary }}>
        The Cesium 3D roof trace demo runs in the web build only (WebGL + Cesium
        ion).
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.lg, justifyContent: "center" },
});
