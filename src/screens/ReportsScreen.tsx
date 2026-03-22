import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

import DataSourceConfig from "@/src/components/DataSourceConfig";
import ReportGenerator from "@/src/components/ReportGenerator";
import ReportViewer from "@/src/components/ReportViewer";

/**
 * AI agents hub: configure a {@link DataSource}, run the pipeline, preview draft sections.
 */
export default function ReportsScreen() {
  const { theme } = useTheme();

  return (
    <ScreenKeyboardAwareScrollView
      style={[styles.screen, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="h2" style={styles.title}>
            AI report agents
          </ThemedText>
          <ThemedText type="caption" style={styles.sub}>
            Data analyzer → report narrative → builder draft. Uses local logic in
            services/aiAgents.
          </ThemedText>
        </View>

        <DataSourceConfig />
        <View style={{ height: Spacing.md }} />
        <ReportGenerator />
        <View style={{ height: Spacing.md }} />
        <ReportViewer />
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </ScreenKeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.sm,
  },
  header: { marginBottom: Spacing.md },
  title: { marginBottom: 6 },
  sub: { opacity: 0.88, lineHeight: 20 },
});
