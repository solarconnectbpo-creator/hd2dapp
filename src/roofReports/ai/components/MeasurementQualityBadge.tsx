/**
 * Measurement Quality Badge Component
 * Shows real-time quality score with visual indicator.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface MeasurementQualityBadgeProps {
  score: number; // 0-100
  label?: string;
  showDetails?: boolean;
}

export default function MeasurementQualityBadge({
  score,
  label = "Quality",
  showDetails = true,
}: MeasurementQualityBadgeProps) {
  const { theme } = useTheme();

  const getQualityColor = (s: number) => {
    if (s >= 80) return "#10b981";
    if (s >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getQualityLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Fair";
    return "Poor";
  };

  const color = getQualityColor(score);
  const qualityLabel = getQualityLabel(score);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.cardBackground, borderColor: color },
      ]}
    >
      <View style={[styles.circle, { backgroundColor: color }]}>
        <Text style={styles.scoreText}>{Math.round(score)}</Text>
      </View>
      {showDetails && (
        <View style={styles.details}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
          <Text style={[styles.quality, { color }]}>{qualityLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  details: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    marginBottom: 2,
  },
  quality: {
    fontSize: 13,
    fontWeight: "700",
  },
});
