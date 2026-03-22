import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { BorderRadius, Spacing } from "@/constants/theme";
import type { RoofMeasurementValidationSummary } from "@/src/roofReports/roofReportTypes";

function confidenceColor(c: RoofMeasurementValidationSummary["overallConfidence"]): string {
  if (c === "high") return "#22c55e";
  if (c === "medium") return "#f59e0b";
  return "#ef4444";
}

export function MeasurementAccuracyPanel({
  summary,
}: {
  summary: RoofMeasurementValidationSummary;
}) {
  const color = confidenceColor(summary.overallConfidence);
  const label =
    summary.overallConfidence === "high"
      ? "Strong agreement across sources"
      : summary.overallConfidence === "medium"
        ? "Review recommended — some sources disagree"
        : "Verify on site — major disagreement between sources";

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: color,
          backgroundColor: `${color}14`,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Feather name="activity" size={18} color={color} />
        <ThemedText type="small" style={[styles.title, { color }]}>
          Measurement check
        </ThemedText>
        <ThemedText type="caption" style={[styles.badge, { color }]}>
          {summary.overallConfidence.toUpperCase()}
        </ThemedText>
      </View>
      <ThemedText type="caption" style={styles.subtitle}>
        {label}
      </ThemedText>
      {summary.messages.length ? (
        <View style={{ marginTop: Spacing.sm, gap: 6 }}>
          {summary.messages.map((msg, i) => (
            <View key={i} style={styles.bulletRow}>
              <ThemedText type="caption" style={styles.bullet}>
                •
              </ThemedText>
              <ThemedText type="caption" style={styles.msg}>
                {msg}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText type="caption" style={[styles.subtitle, { marginTop: 6 }]}>
          Trace, AI, and estimate figures are within expected tolerance (or only one source
          is present).
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: { fontWeight: "800", flex: 1 },
  badge: { fontWeight: "800", opacity: 0.95 },
  subtitle: { marginTop: 4, opacity: 0.92, lineHeight: 18 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  bullet: { opacity: 0.85, marginTop: 1 },
  msg: { flex: 1, lineHeight: 18, opacity: 0.95 },
});
