import React from "react";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { useAIAgents } from "@/src/contexts/AIAgentsContext";

import ProgressTracker from "@/src/components/ProgressTracker";

export default function ReportGenerator() {
  const { generate, isGenerating, progress, error, resetOutput } = useAIAgents();

  return (
    <View style={styles.wrap}>
      <ThemedText type="h4" style={styles.title}>
        Generate draft
      </ThemedText>
      <ThemedText type="caption" style={styles.hint}>
        Runs the data analyzer, report agent, and builder (local heuristics).
      </ThemedText>

      <ProgressTracker
        progress={progress}
        label={isGenerating ? "Working…" : "Ready"}
        indeterminate={isGenerating && progress < 5}
      />

      {error ? (
        <ThemedText type="small" style={styles.err}>
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.row}>
        <Button onPress={() => void generate()} disabled={isGenerating}>
          {isGenerating ? "Generating…" : "Run AI pipeline"}
        </Button>
        <Button
          variant="secondary"
          onPress={resetOutput}
          disabled={isGenerating}
        >
          Clear output
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { marginBottom: 2 },
  hint: { opacity: 0.85, lineHeight: 18 },
  err: { color: "#dc2626", fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
