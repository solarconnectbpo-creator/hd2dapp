import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { parseRoofPitchRise } from "@/src/roofReports/roofLogicEngine";
import { AppColors } from "@/constants/theme";

type Props = {
  pitch?: string;
  label?: string;
};

/** ~0–45° display span (12:12 ≈ 45°). */
const MAX_DEG = 45;

/** Compact slope readout: degrees + rise/12 from normalized pitch (6:12, 3:4, 26°, etc.). */
export function RoofPitchGaugeStrip({ pitch, label }: Props) {
  const riseOn12 = parseRoofPitchRise(pitch);
  if (riseOn12 === undefined || !Number.isFinite(riseOn12)) return null;

  const deg = (Math.atan(riseOn12 / 12) * 180) / Math.PI;
  const pct = Math.min(1, Math.max(0, deg / MAX_DEG));
  const segment = deg < 14 ? 0 : deg < 28 ? 1 : 2;
  const zoneLabel =
    segment === 0 ? "Low slope" : segment === 1 ? "Moderate" : "Steep";

  return (
    <View
      style={styles.wrap}
      accessibilityRole="text"
      accessibilityLabel={`Roof pitch about ${deg.toFixed(0)} degrees, ${zoneLabel}`}
    >
      {label ? (
        <ThemedText type="caption" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <View style={styles.trackOuter}>
        <View style={styles.track}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.seg,
                {
                  backgroundColor:
                    i === segment
                      ? AppColors.primary
                      : "rgba(148,163,184,0.35)",
                },
              ]}
            />
          ))}
        </View>
        <View
          style={[
            styles.marker,
            {
              left: `${pct * 100}%`,
            },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </View>
      <ThemedText type="small" style={styles.meta}>
        {riseOn12.toFixed(1)}/12 · ~{deg.toFixed(1)}° ({pitch?.trim()}) ·{" "}
        {zoneLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 6, width: "100%", alignSelf: "stretch" },
  label: { opacity: 0.85 },
  trackOuter: {
    position: "relative",
    height: 14,
    justifyContent: "center",
    width: "100%",
    alignSelf: "stretch",
    paddingHorizontal: 2,
  },
  track: { flexDirection: "row", gap: 4, height: 10, width: "100%" },
  seg: { flex: 1, borderRadius: 4 },
  marker: {
    position: "absolute",
    width: 4,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: "rgba(15,23,42,0.92)",
    zIndex: 2,
    elevation: 2,
  },
  meta: { opacity: 0.9 },
});
