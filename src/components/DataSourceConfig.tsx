import React from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
  Pressable,
} from "react-native";

import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import type { DataSourceType } from "@/services/aiAgents";
import { useDataSourceConfig } from "@/src/hooks/useDataSourceConfig";

const types: { key: DataSourceType; label: string }[] = [
  { key: "static", label: "Static numbers" },
  { key: "api", label: "API URL" },
  { key: "database", label: "Database (placeholder)" },
];

export default function DataSourceConfig() {
  const { theme } = useTheme();
  const { form, applyForm } = useDataSourceConfig();

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.backgroundSecondary,
    },
  ];

  return (
    <Card style={styles.card}>
      <ThemedText type="h4" style={styles.title}>
        Data source
      </ThemedText>
      <ThemedText type="caption" style={styles.hint}>
        Static mode feeds sample numbers into the analyzer. API mode fetches JSON
        (array) from a URL (CORS must allow your origin on web).
      </ThemedText>

      <View style={styles.chips}>
        {types.map((t) => {
          const on = form.type === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => applyForm({ type: t.key })}
              style={[
                styles.chip,
                {
                  borderColor: on ? theme.tabIconSelected : theme.border,
                  backgroundColor: on ? theme.backgroundTertiary : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="caption"
                style={{ fontWeight: on ? "700" : "500" }}
              >
                {t.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {form.type === "static" ? (
        <View style={styles.field}>
          <ThemedText type="small" style={styles.fieldLabel}>
            Numbers (comma-separated)
          </ThemedText>
          <TextInput
            value={form.staticNumbers}
            onChangeText={(text) => applyForm({ staticNumbers: text })}
            placeholder="e.g. 12, 15, 18, 14"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
            multiline={Platform.OS === "web"}
          />
        </View>
      ) : null}

      {form.type === "api" ? (
        <View style={styles.field}>
          <ThemedText type="small" style={styles.fieldLabel}>
            Endpoint URL
          </ThemedText>
          <TextInput
            value={form.endpoint}
            onChangeText={(text) => applyForm({ endpoint: text })}
            placeholder="https://…"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            style={inputStyle}
          />
        </View>
      ) : null}

      {form.type === "database" ? (
        <View style={styles.field}>
          <ThemedText type="small" style={styles.fieldLabel}>
            Query (not executed in app — reserved)
          </ThemedText>
          <TextInput
            value={form.query}
            onChangeText={(text) => applyForm({ query: text })}
            placeholder="Future integration"
            placeholderTextColor={theme.textSecondary}
            style={inputStyle}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: 10 },
  title: { marginBottom: 4 },
  hint: { opacity: 0.85, lineHeight: 18, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  field: { marginTop: 8, gap: 6 },
  fieldLabel: { opacity: 0.9 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});
