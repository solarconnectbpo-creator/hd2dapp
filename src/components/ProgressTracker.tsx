import React from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, BorderRadius } from "@/constants/theme";

type Props = {
  /** 0–100 */
  progress: number;
  label?: string;
  indeterminate?: boolean;
};

export default function ProgressTracker({
  progress,
  label,
  indeterminate = false,
}: Props) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, progress));
  const widthPct = indeterminate ? 40 : pct;

  return (
    <View style={styles.wrap}>
      {label ? (
        <ThemedText type="caption" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.backgroundTertiary,
            borderColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${widthPct}%`,
              backgroundColor: AppColors.primary,
              opacity: indeterminate ? 0.65 : 1,
            },
          ]}
        />
      </View>
      {!indeterminate ? (
        <ThemedText type="caption" style={styles.pct}>
          {pct.toFixed(0)}%
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { opacity: 0.85 },
  track: {
    height: 8,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: BorderRadius.sm,
  },
  pct: { alignSelf: "flex-end", opacity: 0.8 },
});
