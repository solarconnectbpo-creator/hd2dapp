import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

interface BadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  size?: "small" | "medium";
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  label,
  color = AppColors.primary,
  textColor = "#FFFFFF",
  size = "small",
  style,
}: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        size === "medium" && styles.badgeMedium,
        { backgroundColor: color },
        style,
      ]}
    >
      <ThemedText
        style={[
          styles.text,
          size === "medium" && styles.textMedium,
          { color: textColor },
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  badgeMedium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  textMedium: {
    fontSize: 12,
  },
});
