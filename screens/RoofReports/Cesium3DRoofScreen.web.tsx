import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { setupCesium3DRoofTool } from "@/src/roofReports/cesium3dRoofTool";

const CESIUM_CONTAINER_ID = "cesiumRoofToolContainer";

/**
 * Web: full-screen Cesium globe — left-click vertices on terrain, right-click to close polygon.
 * Requires EXPO_PUBLIC_CESIUM_ION_TOKEN. See src/roofReports/CESIUM_3D_ROOF.md for static assets.
 */
export default function Cesium3DRoofScreen() {
  const { theme } = useTheme();
  const mapContainerRef = useRef<View | null>(null);
  const [areaM2, setAreaM2] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.EXPO_PUBLIC_CESIUM_ION_TOKEN;
    if (!token?.trim()) {
      setError("Set EXPO_PUBLIC_CESIUM_ION_TOKEN in .env.local (free token at cesium.com/ion).");
      return;
    }

    let cancelled = false;
    let destroy: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timer2: ReturnType<typeof setTimeout> | undefined;

    const run = () => {
      const maybeContainer = mapContainerRef.current as unknown;
      const container: HTMLDivElement | null =
        maybeContainer instanceof HTMLElement
          ? (maybeContainer as HTMLDivElement)
          : (document.getElementById(CESIUM_CONTAINER_ID) as HTMLDivElement | null);

      if (!container) {
        return false;
      }

      void (async () => {
        try {
          setStatus("Loading globe…");
          setError(null);
          const handle = await setupCesium3DRoofTool(container, {
            ionAccessToken: token.trim(),
            onPolygonComplete: (m2) => {
              if (!cancelled) setAreaM2(m2);
            },
          });
          destroy = handle.destroy;
          if (!cancelled) {
            setStatus("Left-click: add points on terrain · Right-click: close polygon (area in m²).");
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e));
            setStatus("");
          }
        }
      })();
      return true;
    };

    timer = setTimeout(() => {
      if (!run()) {
        timer2 = setTimeout(() => {
          if (!cancelled && !run()) {
            setError("Map container not ready. Go back and open this screen again.");
          }
        }, 300);
      }
    }, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (timer2) clearTimeout(timer2);
      try {
        destroy?.();
      } catch {
        // ignore
      }
    };
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.banner, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
        {error ? (
          <ThemedText type="small" style={{ color: theme.text }}>
            {error}
          </ThemedText>
        ) : (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {status || "Initializing…"}
          </ThemedText>
        )}
        {areaM2 != null && Number.isFinite(areaM2) ? (
          <ThemedText type="h4" style={{ marginTop: 8, color: theme.text }}>
            Geodesic area: {areaM2.toFixed(1)} m² ({(areaM2 * 10.7639104167).toFixed(0)} sq ft)
          </ThemedText>
        ) : null}
      </View>
      <View style={styles.mapWrap} ref={mapContainerRef} nativeID={CESIUM_CONTAINER_ID} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  mapWrap: { flex: 1, minHeight: 400 },
});
