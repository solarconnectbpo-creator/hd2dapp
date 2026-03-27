import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { openEagleViewPropertyDataV2Docs } from "@/src/roofReports/eagleviewPropertyData";

export type RoofReportToolsModalMode = "report" | "mapPicker" | "preview";

export type RoofReportToolsModalProps = {
  visible: boolean;
  onClose: () => void;
  navigation: NativeStackNavigationProp<ReportsStackParamList>;
  property: { address: string; lat: number; lng: number };
  mode: RoofReportToolsModalMode;
  onPrecisionMeasurement?: () => void | Promise<void>;
  precisionNavLoading?: boolean;
  onCompanyCamPdf?: () => void;
  companyCamImporting?: boolean;
  /**
   * When set (damage report flow), shows a primary finish action above optional tools.
   */
  finishReport?: {
    onPress: () => void | Promise<void>;
    loading?: boolean;
    label?: string;
  };
};

type ToolRow = {
  key: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
};

export function RoofReportToolsModal({
  visible,
  onClose,
  navigation,
  property,
  mode,
  onPrecisionMeasurement,
  precisionNavLoading,
  onCompanyCamPdf,
  companyCamImporting,
  finishReport,
}: RoofReportToolsModalProps) {
  const { theme } = useTheme();

  const stlParams = {
    latitude: property.lat,
    longitude: property.lng,
  };

  const rows: ToolRow[] = [];

  if (mode === "mapPicker") {
    rows.push({
      key: "stl",
      label: "St. Louis GIS & storm sources",
      onPress: () => {
        onClose();
        navigation.navigate("StLouisDataSources", stlParams);
      },
    });
  } else if (mode === "preview") {
    rows.push({
      key: "stl",
      label: "St. Louis GIS & storm sources",
      onPress: () => {
        onClose();
        navigation.navigate("StLouisDataSources", stlParams);
      },
    });
  } else {
    rows.push(
      {
        key: "measure",
        label: precisionNavLoading
          ? "Opening aerial measurements…"
          : "Aerial roof measurements",
        subtitle:
          "EagleView / Nearmap-style run — order or import; aligns with Property Data API workflows.",
        onPress: () => {
          onClose();
          void onPrecisionMeasurement?.();
        },
        disabled: precisionNavLoading,
      },
      {
        key: "bulk",
        label: "Bulk CSV import → reports",
        onPress: () => {
          onClose();
          navigation.navigate("BulkCsvDamageReports");
        },
      },
      {
        key: "stl",
        label: "St. Louis GIS & storm sources",
        onPress: () => {
          onClose();
          navigation.navigate("StLouisDataSources", stlParams);
        },
      },
    );
    if (Platform.OS === "web" && onCompanyCamPdf) {
      rows.push({
        key: "companycam",
        label: companyCamImporting
          ? "Importing CompanyCam PDF…"
          : "Import CompanyCam PDF",
        onPress: () => {
          onClose();
          onCompanyCamPdf();
        },
        disabled: companyCamImporting,
      });
    }
  }

  const title =
    mode === "report" && finishReport
      ? "Finish report"
      : mode === "report"
        ? "Imports & regional data"
        : mode === "mapPicker"
          ? "Regional data"
          : "Regional data";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <ThemedText type="h4" style={{ flex: 1 }}>
              {title}
            </ThemedText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {mode === "report" && finishReport ? (
            <ThemedText type="caption" style={styles.sheetHint}>
              Save to open preview (HTML / JSON export). Trace the roof, enter
              sq ft, and set pitch on the report screen — that single flow drives
              measurements and the damage estimate.
            </ThemedText>
          ) : mode === "report" ? (
            <ThemedText type="caption" style={styles.sheetHint}>
              Optional: aerial measurement orders, bulk import, regional GIS,
              or CompanyCam. Core roof numbers and estimates are edited on the
              report screen.
            </ThemedText>
          ) : mode === "preview" ? (
            <ThemedText type="caption" style={styles.sheetHint}>
              Regional St. Louis layers for this report’s coordinates.
            </ThemedText>
          ) : (
            <ThemedText type="caption" style={styles.sheetHint}>
              Optional regional sources for the selected property.
            </ThemedText>
          )}

          {finishReport ? (
            <>
              <Button
                onPress={() => void finishReport.onPress()}
                disabled={finishReport.loading}
                style={styles.finishPrimary}
              >
                {finishReport.loading
                  ? "Saving…"
                  : (finishReport.label ?? "Save & open preview")}
              </Button>
              <ThemedText type="small" style={styles.optionalLabel}>
                Optional — same property
              </ThemedText>
            </>
          ) : null}

          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {rows.map((row) => (
              <Pressable
                key={row.key}
                disabled={row.disabled}
                onPress={row.onPress}
                style={({ pressed }) => [
                  styles.row,
                  {
                    borderColor: theme.border,
                    backgroundColor: pressed
                      ? theme.backgroundSecondary
                      : theme.backgroundRoot,
                    opacity: row.disabled ? 0.5 : 1,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {row.label}
                  </ThemedText>
                  {row.subtitle ? (
                    <ThemedText
                      type="caption"
                      style={{ opacity: 0.78, marginTop: 4, lineHeight: 16 }}
                    >
                      {row.subtitle}
                    </ThemedText>
                  ) : null}
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            ))}

            <Pressable
              onPress={() => {
                void openEagleViewPropertyDataV2Docs();
              }}
              style={({ pressed }) => [
                styles.docRow,
                {
                  borderColor: theme.border,
                  backgroundColor: pressed
                    ? theme.backgroundSecondary
                    : theme.backgroundRoot,
                },
              ]}
            >
              <Feather name="book-open" size={18} color={theme.textSecondary} />
              <ThemedText type="caption" style={{ flex: 1, marginLeft: 8 }}>
                EagleView Property Data API v2 (reference)
              </ThemedText>
              <Feather
                name="external-link"
                size={16}
                color={theme.textSecondary}
              />
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "88%",
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sheetHint: {
    opacity: 0.88,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  scroll: { maxHeight: 420 },
  finishPrimary: {
    width: "100%",
    marginBottom: Spacing.sm,
  },
  optionalLabel: {
    opacity: 0.75,
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    gap: 8,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    marginBottom: 8,
  },
});
