import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Card } from "@/components/Card";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useAIAgents } from "@/src/contexts/AIAgentsContext";

export default function ReportViewer() {
  const { theme } = useTheme();
  const { draft, analysisError } = useAIAgents();

  if (!draft && !analysisError) {
    return (
      <Card style={styles.card}>
        <ThemedText type="caption" style={{ opacity: 0.75 }}>
          No draft yet. Configure a data source and tap “Run AI pipeline”.
        </ThemedText>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        {analysisError ? (
          <View style={[styles.banner, { borderColor: "#fbbf24" }]}>
            <ThemedText type="small" style={{ color: theme.text }}>
              Analyzer note: {analysisError}
            </ThemedText>
          </View>
        ) : null}

        {draft ? (
          <>
            <ThemedText type="h4" style={styles.title}>
              {draft.title}
            </ThemedText>
            {draft.metricsSummary ? (
              <ThemedText type="caption" style={styles.metrics}>
                {draft.metricsSummary}
              </ThemedText>
            ) : null}
            <View style={{ height: Spacing.md }} />
            {draft.sections.map((s, i) => (
              <View key={`${s.title}-${i}`} style={styles.section}>
                <ThemedText type="small" style={styles.secTitle}>
                  {s.title}
                </ThemedText>
                <ThemedText type="caption" style={{ lineHeight: 20 }}>
                  {s.body}
                </ThemedText>
              </View>
            ))}
          </>
        ) : null}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  card: { padding: Spacing.lg, gap: 10 },
  banner: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  title: { marginBottom: 4 },
  metrics: { opacity: 0.85 },
  section: { marginBottom: 12 },
  secTitle: { fontWeight: "700", marginBottom: 4 },
});
