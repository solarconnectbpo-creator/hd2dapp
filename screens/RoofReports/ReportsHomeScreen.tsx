import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

import {
  deleteRoofReport,
  loadRoofReports,
} from "@/src/roofReports/roofReportStorage";
import type { DamageRoofReport } from "@/src/roofReports/roofReportTypes";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";

type Props = NativeStackScreenProps<ReportsStackParamList, "ReportsHome">;

export default function ReportsHomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [reports, setReports] = useState<DamageRoofReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await loadRoofReports();
      setReports(data);
    } catch (e) {
      console.error("Failed to load roof reports:", e);
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    Alert.alert("Delete report?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRoofReport(id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Feather name="file-text" size={20} color="#fff" />
          </View>
          <ThemedText type="h2" style={styles.headerTitle}>
            Roof Reports
          </ThemedText>
        </View>

        <View style={styles.ctaRow}>
          <Button onPress={() => navigation.navigate("PropertyMapPicker")} style={styles.ctaButton}>
            Create New Damage Report
          </Button>
        </View>

        {isLoading ? (
          <ActivityIndicator color={AppColors.primary} />
        ) : reports.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="body" style={styles.emptyTitle}>
              No reports yet.
            </ThemedText>
            <ThemedText type="small" style={styles.emptyBody}>
              Select a property on the map, fill in the damage details, then export the report.
            </ThemedText>
          </View>
        ) : (
          reports.map((r) => (
            <Card key={r.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportIcon}>
                  <Feather name="map-pin" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4" style={styles.reportAddress}>
                    {r.property.address}
                  </ThemedText>
                  <ThemedText type="small" style={styles.reportMeta}>
                    Inspection: {r.inspectionDate}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.reportButtons}>
                <Button onPress={() => navigation.navigate("ReportPreview", { report: r })} style={styles.smallButton}>
                  Preview / Export
                </Button>
                <View style={{ height: 10 }} />
                <Button
                  variant="secondary"
                  onPress={() => handleDelete(r.id)}
                  style={[styles.smallButton, styles.secondaryButton]}
                >
                  Delete
                </Button>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: 14 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: Spacing.xs },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1 },

  ctaRow: { marginTop: 6 },
  ctaButton: { width: "100%" },

  emptyState: { paddingVertical: 24, alignItems: "center", gap: 8 },
  emptyTitle: { textAlign: "center" },
  emptyBody: { textAlign: "center", opacity: 0.8, lineHeight: 18 },

  reportCard: { padding: Spacing.lg },
  reportHeader: { flexDirection: "row", gap: 10, alignItems: "center" },
  reportIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  reportAddress: { marginBottom: 4 },
  reportMeta: { opacity: 0.8 },

  reportButtons: { marginTop: 12 },
  smallButton: { width: "100%" },
  secondaryButton: { borderWidth: 1 },
});

