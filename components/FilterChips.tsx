import React from "react";
import { ScrollView, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

interface FilterOption {
  key: string;
  label: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
}

export function FilterChips({ options, selectedKey, onSelect }: FilterChipsProps) {
  const { theme } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Pressable
        onPress={() => onSelect(null)}
        style={[
          styles.chip,
          {
            backgroundColor:
              selectedKey === null ? AppColors.primary : theme.backgroundDefault,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.chipText,
            { color: selectedKey === null ? "#FFFFFF" : theme.text },
          ]}
        >
          All
        </ThemedText>
      </Pressable>
      {options.map((option) => (
        <Pressable
          key={option.key}
          onPress={() => onSelect(option.key)}
          style={[
            styles.chip,
            {
              backgroundColor:
                selectedKey === option.key
                  ? AppColors.primary
                  : theme.backgroundDefault,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.chipText,
              { color: selectedKey === option.key ? "#FFFFFF" : theme.text },
            ]}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
