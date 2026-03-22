import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, BorderRadius } from "@/constants/theme";

const AVATAR_COLORS = [
  "#FF6B35",
  "#004E89",
  "#1AA260",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
];

interface AvatarProps {
  name?: string;
  index?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, index = 0, size = 40, style }: AvatarProps) {
  const backgroundColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initial = name ? name.charAt(0).toUpperCase() : "";
  const fontSize = size * 0.4;

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        style,
      ]}
    >
      {name ? (
        <ThemedText style={[styles.initial, { fontSize }]}>
          {initial}
        </ThemedText>
      ) : (
        <Feather name="user" size={size * 0.5} color="#FFFFFF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
