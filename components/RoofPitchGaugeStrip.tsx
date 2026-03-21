import React from "react";
import { View, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { parseRoofPitchRise } from "@/src/roofReports/roofLogicEngine";
import { AppColors } from "@/constants/theme";

type Props = {
  pitch?: string;
  label?: string;
};

/** Compact slope readout: approximate degrees from rise/12 and a 3-zone strip (flat / moderate / steep). */
export function RoofPitchGaugeStrip({ pitch, label }: Props) {
  const rise = parseRoofPitchRise(pitch);
  if (rise === undefined || !Number.isFinite(rise)) return null;

  const deg = (Math.atan(rise / 12) * 180) / Math.PI;
  const segment = deg < 14 ? 0 : deg < 28 ? 1 : 2;
  const zoneLabel = segment === 0 ? "Low slope" : segment === 1 ? "Moderate" : "Steep";

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="caption" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <View style={styles.strip}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.seg,
              { backgroundColor: i === segment ? AppColors.primary : "rgba(148,163,184,0.35)" },
            ]}
          />
        ))}
      </View>
      <ThemedText type="small" style={styles.meta}>
        ~{deg.toFixed(1)}° ({pitch?.trim()}) · {zoneLabel}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, gap: 6 },
  label: { opacity: 0.85 },
  strip: { flexDirection: "row", gap: 4, height: 10 },
  seg: { flex: 1, borderRadius: 4 },
  meta: { opacity: 0.9 },
});
