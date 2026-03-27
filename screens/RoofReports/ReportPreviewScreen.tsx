import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/Card";
import { MeasurementAccuracyPanel } from "@/components/MeasurementAccuracyPanel";
import { RoofPitchGaugeStrip } from "@/components/RoofPitchGaugeStrip";
import { Button } from "@/components/Button";
import { RoofReportToolsModal } from "@/components/RoofReportToolsModal";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, BorderRadius, Spacing } from "@/constants/theme";
import {
  exportRoofReportToHtml,
  exportRoofReportToJson,
} from "@/src/roofReports/exportRoofReport";
import { serializeRoofReportToJsonPretty } from "@/src/roofReports/exportRoofReportSerialize";
import { saveLastFailedExportDraft } from "@/src/roofReports/roofReportOfflineDraft";
import { sumRoofEstimateLineItems } from "@/src/roofReports/roofEstimateTotals";
import { roofMeasurementsHaveContent } from "@/src/roofReports/eavemeasureIntegration";
import {
  FIELD_QA_ITEMS,
  fieldQaCompletionCount,
} from "@/src/roofReports/fieldQaChecklist";
import {
  deleteRoofReport,
  getRoofReportById,
} from "@/src/roofReports/roofReportStorage";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import {
  getCompanyLogoUrl,
  getIntroNarrative,
} from "@/src/roofReports/companyBranding";
import {
  COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_KB_TITLE,
  COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_SECTIONS,
} from "@/src/roofReports/lowSlopeCheatSheetInstructions";
import {
  PROPERTY_MEASUREMENT_KB_DESCRIPTION,
  PROPERTY_MEASUREMENT_KB_TITLE,
  PROPERTY_MEASUREMENT_REFERENCE_DOCS,
  openPropertyMeasurementPdf,
} from "@/src/roofReports/propertyMeasurementKnowledgeBase";
import {
  IBC_CHAPTER_15_KB_DISCLAIMER,
  IBC_CHAPTER_15_KB_TITLE,
  IBC_CHAPTER_15_SECTION_GROUPS,
  IBC_CHAPTER_15_TYPICAL_EDITION_NOTE,
} from "@/src/roofReports/ibcChapter15RoofKnowledgeBase";
import {
  IRC_CHAPTER_8_ABOUT,
  IRC_CHAPTER_8_KB_DISCLAIMER,
  IRC_CHAPTER_8_KB_TITLE,
  IRC_CHAPTER_8_SECTION_GROUPS,
  IRC_CHAPTER_8_TYPICAL_EDITION_NOTE,
} from "@/src/roofReports/ircChapter8RoofCeilingKnowledgeBase";
import {
  IRC_CHAPTER_9_ABOUT,
  IRC_CHAPTER_9_KB_DISCLAIMER,
  IRC_CHAPTER_9_KB_TITLE,
  IRC_CHAPTER_9_SECTION_GROUPS,
  IRC_CHAPTER_9_TYPICAL_EDITION_NOTE,
} from "@/src/roofReports/ircChapter9RoofAssembliesKnowledgeBase";
import {
  MO_IRC_INSURANCE_ABOUT,
  MO_IRC_INSURANCE_KB_DISCLAIMER,
  MO_IRC_INSURANCE_KB_TITLE,
  MO_IRC_INSURANCE_SECTION_GROUPS,
  MO_IRC_INSURANCE_TYPICAL_EDITION_NOTE,
} from "@/src/roofReports/missouriIrcInsuranceSupplementKnowledgeBase";
import {
  COMMERCIAL_ROOF_TAX_KB_DISCLAIMER,
  COMMERCIAL_ROOF_TAX_KB_EDITION_NOTE,
  COMMERCIAL_ROOF_TAX_KB_TITLE,
  COMMERCIAL_ROOF_TAX_SECTION_GROUPS,
  commercialRoofTaxNotesApplyToReport,
} from "@/src/roofReports/commercialRoofTaxIncentivesKnowledgeBase";
import { formatPropertyUseLabel } from "@/src/roofReports/propertyUseClassification";
import {
  showIbcChapter15Knowledge,
  showIrcChaptersKnowledge,
} from "@/src/roofReports/reportKnowledgeVisibility";

type Props = NativeStackScreenProps<ReportsStackParamList, "ReportPreview">;

export default function ReportPreviewScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { report: routeReport } = route.params;
  const [report, setReport] = useState(routeReport);

  useEffect(() => {
    setReport(routeReport);
  }, [routeReport]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getRoofReportById(routeReport.id).then((stored) => {
        if (cancelled || !stored) return;
        setReport(stored);
      });
      return () => {
        cancelled = true;
      };
    }, [routeReport.id]),
  );

  const [exportBusy, setExportBusy] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  /** "choose" = pick HTML vs JSON; "working" = building file (keeps user gesture on web). */
  const [exportModalStep, setExportModalStep] = useState<"choose" | "working">(
    "choose",
  );
  const [exportProgressPct, setExportProgressPct] = useState(0);
  const [exportPhase, setExportPhase] = useState("");
  const [roofToolsModalVisible, setRoofToolsModalVisible] = useState(false);
  const [redactJsonExport, setRedactJsonExport] = useState(false);
  const [showUnitsGlossary, setShowUnitsGlossary] = useState(false);

  const effectivePropertyUse =
    report.propertyUse ?? report.property.propertyUse;
  const showIbcKb = useMemo(
    () => showIbcChapter15Knowledge(effectivePropertyUse),
    [effectivePropertyUse],
  );
  const showIrcKb = useMemo(
    () => showIrcChaptersKnowledge(effectivePropertyUse),
    [effectivePropertyUse],
  );

  const handleDelete = () => {
    Alert.alert("Delete report?", "This will remove it from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRoofReport(report.id);
          navigation.navigate("ReportsHome");
        },
      },
    ]);
  };

  const showExportError = (title: string, msg: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const resetExportModal = () => {
    setExportModalVisible(false);
    setExportModalStep("choose");
    setExportProgressPct(0);
    setExportPhase("");
    setExportBusy(false);
  };

  /** Run in the same tap handler as the modal choice so web keeps download permission. */
  const runExportHtml = () => {
    if (exportBusy) return;
    setExportBusy(true);
    setExportModalStep("working");
    setExportProgressPct(0);
    setExportPhase("Starting…");
    void exportRoofReportToHtml(report, {
      onProgress: (pct, phase) => {
        setExportProgressPct(pct);
        setExportPhase(phase);
      },
    })
      .then(() => {
        setTimeout(() => resetExportModal(), 500);
      })
      .catch((e) => {
        const msg =
          e instanceof Error ? e.message : "Could not export HTML. Try again.";
        showExportError("Export failed", msg);
        console.error(e);
        void saveLastFailedExportDraft(serializeRoofReportToJsonPretty(report));
        resetExportModal();
      });
  };

  const runExportJson = () => {
    if (exportBusy) return;
    setExportBusy(true);
    setExportModalStep("working");
    setExportProgressPct(0);
    setExportPhase("Starting…");
    void exportRoofReportToJson(report, {
      redactPii: redactJsonExport,
      onProgress: (pct, phase) => {
        setExportProgressPct(pct);
        setExportPhase(phase);
      },
    })
      .then(() => {
        setTimeout(() => resetExportModal(), 500);
      })
      .catch((e) => {
        const msg =
          e instanceof Error ? e.message : "Could not export JSON. Try again.";
        showExportError("Export failed", msg);
        console.error(e);
        void saveLastFailedExportDraft(serializeRoofReportToJsonPretty(report));
        resetExportModal();
      });
  };

  const openExportModal = () => {
    if (exportBusy) return;
    setExportModalStep("choose");
    setExportProgressPct(0);
    setExportPhase("");
    setExportModalVisible(true);
  };

  const damageList = (report.damageTypes ?? []).join(", ");
  const estimate = report.estimate;
  const nonRoof = report.nonRoofEstimate;
  const logoUrl = getCompanyLogoUrl(report);
  const intro = getIntroNarrative(report.companyName);
  const roofSquaresText =
    report.measurements?.roofAreaSqFt &&
    Number.isFinite(report.measurements.roofAreaSqFt)
      ? `${(report.measurements.roofAreaSqFt / 100).toFixed(2)} sq`
      : "N/A";
  const areaText = report.measurements?.roofAreaSqFt
    ? `${report.measurements.roofAreaSqFt.toLocaleString()} sq ft`
    : "Not traced";
  const perimeterText = report.measurements?.roofPerimeterFt
    ? `${report.measurements.roofPerimeterFt.toLocaleString()} ft`
    : "Not traced";
  const areaStatDisplay =
    report.measurements?.roofAreaSqFt != null &&
    Number.isFinite(report.measurements.roofAreaSqFt)
      ? Math.round(report.measurements.roofAreaSqFt).toLocaleString()
      : "—";
  const perimStatDisplay =
    report.measurements?.roofPerimeterFt != null &&
    Number.isFinite(report.measurements.roofPerimeterFt)
      ? Math.round(report.measurements.roofPerimeterFt).toLocaleString()
      : "—";
  const inspectorInitials = (report.creatorName || "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");

  const wastePctText =
    typeof report.materialRequirements?.wastePct === "number"
      ? `${report.materialRequirements.wastePct}%`
      : "—";
  const pitchPreview = report.measurements?.roofPitch?.trim() || "—";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={[styles.screen, { backgroundColor: theme.backgroundRoot }]}
    >
      <View style={styles.coverCard}>
        <ThemedText type="caption" style={styles.coverKicker}>
          MEASUREMENT REPORT
        </ThemedText>
        <ThemedText type="h2" style={styles.coverTitle}>
          Roof measurement report
        </ThemedText>
        <ThemedText type="small" style={styles.coverAddress}>
          {report.property.address}
        </ThemedText>
        <ThemedText type="caption" style={styles.coverMeta}>
          Inspection {report.inspectionDate} · Report {report.id.slice(0, 8)}…
        </ThemedText>
      </View>

      {!roofMeasurementsHaveContent(report.measurements) &&
      report.estimate?.roofAreaSqFt ? (
        <Card
          style={[
            styles.sectionCard,
            {
              borderWidth: 1,
              borderColor: "rgba(245, 158, 11, 0.65)",
              backgroundColor: "rgba(245, 158, 11, 0.08)",
            },
          ]}
        >
          <ThemedText type="small" style={{ fontWeight: "700" }}>
            Measurements note
          </ThemedText>
          <ThemedText type="caption" style={{ marginTop: 6, lineHeight: 18 }}>
            This report has estimate area but no full measurement block in
            export. Open the damage report again, confirm roof area / trace, and
            save so HTML/JSON include complete quantities.
          </ThemedText>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        {logoUrl ? (
          <View style={{ marginBottom: 10 }}>
            <Image source={{ uri: logoUrl }} style={styles.logoImage} />
          </View>
        ) : null}
        <ThemedText type="h4" style={styles.sectionTitle}>
          Property & inspection
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.mutedValue, { marginBottom: 8 }]}
        >
          {intro}
        </ThemedText>
        {report.propertyImageUrl ? (
          <View style={{ marginTop: 6, marginBottom: 10 }}>
            <Image
              source={{ uri: report.propertyImageUrl }}
              style={styles.propertyPhoto}
            />
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 6 }]}
            >
              Property image source: {report.propertyImageSource || "Map image"}
            </ThemedText>
          </View>
        ) : null}
        {report.companyName ? (
          <ThemedText type="small" style={[styles.value, { opacity: 0.9 }]}>
            Company: {report.companyName}
          </ThemedText>
        ) : null}
        {report.creatorName ? (
          <ThemedText type="caption" style={[styles.mutedValue]}>
            Inspector: {report.creatorName}
          </ThemedText>
        ) : null}
        <ThemedText type="small" style={styles.value}>
          {report.property.address}
        </ThemedText>
        <ThemedText type="caption" style={styles.mutedValue}>
          Coordinates: {report.property.lat.toFixed(6)},{" "}
          {report.property.lng.toFixed(6)}
        </ThemedText>
        <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
          Inspection Date: {report.inspectionDate}
        </ThemedText>
        {report.homeownerName ? (
          <ThemedText type="caption" style={styles.mutedValue}>
            Homeowner: {report.homeownerName}
          </ThemedText>
        ) : null}
        {report.homeownerEmail ? (
          <ThemedText type="caption" style={styles.mutedValue}>
            Email: {report.homeownerEmail}
          </ThemedText>
        ) : null}
        {report.homeownerPhone ? (
          <ThemedText type="caption" style={styles.mutedValue}>
            Phone: {report.homeownerPhone}
          </ThemedText>
        ) : null}
        {report.roofType ? (
          <ThemedText type="caption" style={styles.mutedValue}>
            Roof Type: {report.roofType}
          </ThemedText>
        ) : null}
        {report.roofFormType ? (
          <ThemedText type="caption" style={styles.mutedValue}>
            Roof Form: {report.roofFormType}
          </ThemedText>
        ) : null}
        {report.roofSystemCategory ? (
          <ThemedText type="caption" style={styles.mutedValue}>
            Roof System: {report.roofSystemCategory}
          </ThemedText>
        ) : null}
        <ThemedText type="caption" style={styles.mutedValue}>
          Property use: {formatPropertyUseLabel(effectivePropertyUse)}
        </ThemedText>
      </Card>

      {Number.isFinite(report.property.lat) &&
      Number.isFinite(report.property.lng) &&
      report.property.address.trim().length > 0 ? (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconBadge}>
              <Feather name="layers" size={18} color="#fff" />
            </View>
            <ThemedText type="h4" style={{ flex: 1 }}>
              Roof analysis tools
            </ThemedText>
          </View>
          <ThemedText type="caption" style={styles.propCoords}>
            Same coordinates as this report — open footprint or full assessment
            from one menu.
          </ThemedText>
          <View style={{ height: 10 }} />
          <Button
            variant="secondary"
            onPress={() => setRoofToolsModalVisible(true)}
            style={styles.autoButton}
          >
            Roof tools & data
          </Button>
          <RoofReportToolsModal
            visible={roofToolsModalVisible}
            onClose={() => setRoofToolsModalVisible(false)}
            navigation={navigation}
            property={{
              address: report.property.address,
              lat: report.property.lat,
              lng: report.property.lng,
            }}
            mode="preview"
          />
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Key measurements
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.mutedValue, { marginBottom: 10 }]}
        >
          Summary figures (matches PDF-style export layout).
        </ThemedText>
        <View style={styles.statStrip}>
          <View style={styles.statTile}>
            <ThemedText type="h3" style={styles.statValue}>
              {roofSquaresText}
            </ThemedText>
            <ThemedText type="caption" style={styles.statLabel}>
              Roof squares
            </ThemedText>
          </View>
          <View style={styles.statTile}>
            <ThemedText type="h3" style={styles.statValue}>
              {areaStatDisplay}
            </ThemedText>
            <ThemedText type="caption" style={styles.statLabel}>
              Area (sq ft)
            </ThemedText>
          </View>
          <View style={styles.statTile}>
            <ThemedText type="h3" style={styles.statValue}>
              {perimStatDisplay}
            </ThemedText>
            <ThemedText type="caption" style={styles.statLabel}>
              Perimeter (ft)
            </ThemedText>
          </View>
          <View style={styles.statTile}>
            <ThemedText type="h3" style={styles.statValue}>
              {pitchPreview}
            </ThemedText>
            <ThemedText type="caption" style={styles.statLabel}>
              Pitch
            </ThemedText>
          </View>
          <View style={styles.statTile}>
            <ThemedText type="h3" style={styles.statValue}>
              {wastePctText}
            </ThemedText>
            <ThemedText type="caption" style={styles.statLabel}>
              Waste % (est.)
            </ThemedText>
          </View>
        </View>
      </Card>

      {report.measurements?.measurementValidationSummary ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Measurement accuracy
          </ThemedText>
          <MeasurementAccuracyPanel
            summary={report.measurements.measurementValidationSummary}
          />
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          {PROPERTY_MEASUREMENT_KB_TITLE}
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.mutedValue, { marginBottom: 10, lineHeight: 18 }]}
        >
          {PROPERTY_MEASUREMENT_KB_DESCRIPTION}
        </ThemedText>
        {PROPERTY_MEASUREMENT_REFERENCE_DOCS.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => {
              void openPropertyMeasurementPdf(doc.pdfModule).catch(() => {
                Alert.alert("Could not open PDF", "Try again.");
              });
            }}
            style={({ pressed }) => [
              styles.kbPdfRow,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
              },
              pressed && { opacity: 0.75 },
            ]}
          >
            <Feather name="file-text" size={16} color={AppColors.primary} />
            <ThemedText type="caption" style={{ flex: 1, marginLeft: 8 }}>
              {doc.shortLabel}
            </ThemedText>
            <Feather
              name="external-link"
              size={14}
              color={theme.textSecondary}
            />
          </Pressable>
        ))}
      </Card>

      {showIbcKb ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {IBC_CHAPTER_15_KB_TITLE}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 8, lineHeight: 18 }]}
          >
            {IBC_CHAPTER_15_KB_DISCLAIMER}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 12, opacity: 0.85 }]}
          >
            {IBC_CHAPTER_15_TYPICAL_EDITION_NOTE}
          </ThemedText>
          {IBC_CHAPTER_15_SECTION_GROUPS.map((grp) => (
            <View key={grp.id} style={{ marginBottom: 12 }}>
              <ThemedText
                type="caption"
                style={{ fontWeight: "700", opacity: 0.95, marginBottom: 6 }}
              >
                {grp.heading}
              </ThemedText>
              {grp.items.map((it) => (
                <ThemedText
                  key={`${grp.id}-${it.ref}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginBottom: 4, lineHeight: 18 },
                  ]}
                >
                  • {it.ref}: {it.summary}
                </ThemedText>
              ))}
            </View>
          ))}
        </Card>
      ) : null}

      {showIrcKb ? (
        <>
          <Card style={styles.sectionCard}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {IRC_CHAPTER_8_KB_TITLE}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 8, lineHeight: 18 }]}
            >
              {IRC_CHAPTER_8_KB_DISCLAIMER}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 10, opacity: 0.85 }]}
            >
              {IRC_CHAPTER_8_TYPICAL_EDITION_NOTE}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 12, lineHeight: 18 }]}
            >
              {IRC_CHAPTER_8_ABOUT}
            </ThemedText>
            {IRC_CHAPTER_8_SECTION_GROUPS.map((grp) => (
              <View key={grp.id} style={{ marginBottom: 12 }}>
                <ThemedText
                  type="caption"
                  style={{ fontWeight: "700", opacity: 0.95, marginBottom: 6 }}
                >
                  {grp.heading}
                </ThemedText>
                {grp.items.map((it) => (
                  <ThemedText
                    key={`${grp.id}-${it.ref}`}
                    type="caption"
                    style={[
                      styles.mutedValue,
                      { marginBottom: 4, lineHeight: 18 },
                    ]}
                  >
                    • {it.ref}: {it.summary}
                  </ThemedText>
                ))}
              </View>
            ))}
          </Card>

          <Card style={styles.sectionCard}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {IRC_CHAPTER_9_KB_TITLE}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 8, lineHeight: 18 }]}
            >
              {IRC_CHAPTER_9_KB_DISCLAIMER}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 10, opacity: 0.85 }]}
            >
              {IRC_CHAPTER_9_TYPICAL_EDITION_NOTE}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 12, lineHeight: 18 }]}
            >
              {IRC_CHAPTER_9_ABOUT}
            </ThemedText>
            {IRC_CHAPTER_9_SECTION_GROUPS.map((grp) => (
              <View key={grp.id} style={{ marginBottom: 12 }}>
                <ThemedText
                  type="caption"
                  style={{ fontWeight: "700", opacity: 0.95, marginBottom: 6 }}
                >
                  {grp.heading}
                </ThemedText>
                {grp.items.map((it) => (
                  <ThemedText
                    key={`${grp.id}-${it.ref}`}
                    type="caption"
                    style={[
                      styles.mutedValue,
                      { marginBottom: 4, lineHeight: 18 },
                    ]}
                  >
                    • {it.ref}: {it.summary}
                  </ThemedText>
                ))}
              </View>
            ))}
          </Card>

          <Card style={styles.sectionCard}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              {MO_IRC_INSURANCE_KB_TITLE}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 8, lineHeight: 18 }]}
            >
              {MO_IRC_INSURANCE_KB_DISCLAIMER}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 10, opacity: 0.85 }]}
            >
              {MO_IRC_INSURANCE_TYPICAL_EDITION_NOTE}
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginBottom: 12, lineHeight: 18 }]}
            >
              {MO_IRC_INSURANCE_ABOUT}
            </ThemedText>
            {MO_IRC_INSURANCE_SECTION_GROUPS.map((grp) => (
              <View key={grp.id} style={{ marginBottom: 12 }}>
                <ThemedText
                  type="caption"
                  style={{ fontWeight: "700", opacity: 0.95, marginBottom: 6 }}
                >
                  {grp.heading}
                </ThemedText>
                {grp.items.map((it) => (
                  <ThemedText
                    key={`${grp.id}-${it.ref}`}
                    type="caption"
                    style={[
                      styles.mutedValue,
                      { marginBottom: 4, lineHeight: 18 },
                    ]}
                  >
                    • {it.ref}: {it.summary}
                  </ThemedText>
                ))}
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {commercialRoofTaxNotesApplyToReport(report) ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {COMMERCIAL_ROOF_TAX_KB_TITLE}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 8, lineHeight: 18 }]}
          >
            {COMMERCIAL_ROOF_TAX_KB_DISCLAIMER}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 12, opacity: 0.85 }]}
          >
            {COMMERCIAL_ROOF_TAX_KB_EDITION_NOTE}
          </ThemedText>
          {COMMERCIAL_ROOF_TAX_SECTION_GROUPS.map((grp) => (
            <View key={grp.id} style={{ marginBottom: 12 }}>
              <ThemedText
                type="caption"
                style={{ fontWeight: "700", opacity: 0.95, marginBottom: 6 }}
              >
                {grp.heading}
              </ThemedText>
              {grp.items.map((it) => (
                <ThemedText
                  key={`${grp.id}-${it.ref}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginBottom: 4, lineHeight: 18 },
                  ]}
                >
                  • {it.ref}: {it.summary}
                </ThemedText>
              ))}
            </View>
          ))}
        </Card>
      ) : null}

      {roofMeasurementsHaveContent(report.measurements) ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Measurement details
          </ThemedText>
          <ThemedText type="small" style={styles.value}>
            Roof Area: {areaText}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Roof Perimeter: {perimeterText}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Roof Squares: {roofSquaresText}
          </ThemedText>
          {report.measurements?.roofPitch ? (
            <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
              Roof Pitch: {report.measurements.roofPitch}
            </ThemedText>
          ) : null}
          {report.measurements?.roofPitch?.trim() ||
          report.measurements?.roofPitchAiGauge?.estimatePitch?.trim() ? (
            <RoofPitchGaugeStrip
              pitch={
                report.measurements?.roofPitch?.trim() ||
                report.measurements?.roofPitchAiGauge?.estimatePitch?.trim() ||
                ""
              }
              label={
                report.measurements?.roofPitch?.trim()
                  ? "Slope gauge"
                  : "Slope gauge (AI)"
              }
            />
          ) : null}
          {report.measurements?.roofPitchAiGauge ? (
            <View
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: BorderRadius.md,
                backgroundColor: theme.backgroundSecondary,
              }}
            >
              <ThemedText type="small" style={styles.value}>
                AI photo (pitch):{" "}
                {report.measurements.roofPitchAiGauge.estimatePitch} (
                {report.measurements.roofPitchAiGauge.confidence} confidence)
              </ThemedText>
              {report.measurements.roofPitchAiGauge.estimateRoofAreaSqFt !=
                null ||
              report.measurements.roofPitchAiGauge.estimateRoofPerimeterFt !=
                null ? (
                <ThemedText
                  type="caption"
                  style={[styles.mutedValue, { marginTop: 6, lineHeight: 18 }]}
                >
                  AI from image:{" "}
                  {report.measurements.roofPitchAiGauge.estimateRoofAreaSqFt !=
                  null
                    ? `${report.measurements.roofPitchAiGauge.estimateRoofAreaSqFt.toLocaleString()} sq ft`
                    : "—"}
                  {", "}
                  {report.measurements.roofPitchAiGauge
                    .estimateRoofPerimeterFt != null
                    ? `${report.measurements.roofPitchAiGauge.estimateRoofPerimeterFt.toLocaleString()} ft perimeter`
                    : "—"}
                  {report.measurements.roofPitchAiGauge.measurementConfidence
                    ? ` (${report.measurements.roofPitchAiGauge.measurementConfidence} confidence)`
                    : ""}
                </ThemedText>
              ) : null}
              {report.measurements.roofPitchAiGauge.measurementRationale ? (
                <ThemedText
                  type="caption"
                  style={[styles.mutedValue, { marginTop: 6, lineHeight: 18 }]}
                >
                  {report.measurements.roofPitchAiGauge.measurementRationale}
                </ThemedText>
              ) : null}
              {report.measurements.roofPitchAiGauge.rationale ? (
                <ThemedText
                  type="caption"
                  style={[styles.mutedValue, { marginTop: 6, lineHeight: 18 }]}
                >
                  Pitch note: {report.measurements.roofPitchAiGauge.rationale}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
          {report.measurements?.notes ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
            >
              Notes: {report.measurements.notes}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {report.roofDiagramImageUrl ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Roof area diagram
          </ThemedText>
          <Image
            source={{ uri: report.roofDiagramImageUrl }}
            style={styles.roofDiagramImageTall}
          />
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 6 }]}
          >
            {report.roofDiagramSource || "Generated from roof measurements"}
          </ThemedText>
        </Card>
      ) : null}

      {report.roofPitchDiagramImageUrl ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Slope & pitch diagram
          </ThemedText>
          <Image
            source={{ uri: report.roofPitchDiagramImageUrl }}
            style={styles.roofDiagramImage}
          />
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 6 }]}
          >
            {report.roofPitchDiagramSource || "Generated from roof pitch"}
          </ThemedText>
        </Card>
      ) : null}

      {report.roofLengthsDiagramImageUrl ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Edge lengths
          </ThemedText>
          <Image
            source={{ uri: report.roofLengthsDiagramImageUrl }}
            style={styles.roofDiagramImageTall}
          />
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 6 }]}
          >
            {report.roofLengthsDiagramSource ||
              "Generated from traced roof outline"}
          </ThemedText>
        </Card>
      ) : null}

      {report.roofLidar3dDiagramImageUrl ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            3D roof projection
          </ThemedText>
          <Image
            source={{ uri: report.roofLidar3dDiagramImageUrl }}
            style={styles.roofDiagramImageTall}
          />
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 6 }]}
          >
            {report.roofLidar3dDiagramSource ||
              "Axonometric projection from trace"}
          </ThemedText>
        </Card>
      ) : null}

      {report.materialRequirements ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Material takeoff
          </ThemedText>
          <ThemedText type="small" style={styles.value}>
            Roofing Material: {report.materialRequirements.mainMaterial}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Roof classification: {report.materialRequirements.roofType}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Waste factor: {report.materialRequirements.wasteFactor.toFixed(2)}
            {typeof report.materialRequirements.wastePct === "number"
              ? ` (${report.materialRequirements.wastePct}% )`
              : ""}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Unit: {report.materialRequirements.unit}
          </ThemedText>

          {report.materialRequirements.notes ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
            >
              Notes: {report.materialRequirements.notes}
            </ThemedText>
          ) : null}

          {report.materialRequirements.extras?.length ? (
            <>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { marginTop: 10 }]}
              >
                Extras to consider:
              </ThemedText>
              {report.materialRequirements.extras.map((e, idx) => (
                <ThemedText
                  key={`extra-${idx}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginTop: idx ? 4 : 0, lineHeight: 18 },
                  ]}
                >
                  • {e}
                </ThemedText>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {report.materialSystemAnalysis ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Roof system analysis
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 8, lineHeight: 18 }]}
          >
            Resolved from roof type, material selection, pitch, and roof form.
          </ThemedText>
          <ThemedText type="small" style={styles.value}>
            {report.materialSystemAnalysis.systemLabel}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
          >
            Covering: {report.materialSystemAnalysis.coveringDescription}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[
              styles.mutedValue,
              {
                marginTop: 6,
                color:
                  report.materialSystemAnalysis.agreement === "conflict"
                    ? AppColors.warning
                    : undefined,
                fontWeight:
                  report.materialSystemAnalysis.agreement === "conflict"
                    ? "600"
                    : undefined,
              },
            ]}
          >
            Agreement: {report.materialSystemAnalysis.agreement}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 4, lineHeight: 18 }]}
          >
            Roof type field:{" "}
            {report.materialSystemAnalysis.sources.roofTypeField} · Material:{" "}
            {report.materialSystemAnalysis.sources.materialSelector}
          </ThemedText>
          {report.materialSystemFieldVerified ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 8, color: "#22c55e" }]}
            >
              Inspector confirmed roof type + material match field conditions.
            </ThemedText>
          ) : null}

          {typeof report.materialSystemAnalysis.structuralLoadLbsPerSq ===
          "number" ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 10, lineHeight: 18 }]}
            >
              Typical dead load (planning): ~
              {report.materialSystemAnalysis.structuralLoadLbsPerSq} lbs/sq —
              verify manufacturer and layers.
            </ThemedText>
          ) : null}

          {report.materialSystemAnalysis.geometryWasteNote ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
            >
              {report.materialSystemAnalysis.geometryWasteNote}
            </ThemedText>
          ) : null}

          {report.materialSystemAnalysis.reportAlerts?.length ? (
            <>
              <ThemedText
                type="caption"
                style={[
                  styles.mutedValue,
                  { marginTop: 10, fontWeight: "600" },
                ]}
              >
                Knowledge base alerts
              </ThemedText>
              {report.materialSystemAnalysis.reportAlerts.map((al, idx) => (
                <ThemedText
                  key={`kba-${idx}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginTop: idx ? 4 : 2, lineHeight: 18 },
                  ]}
                >
                  • {al}
                </ThemedText>
              ))}
            </>
          ) : null}

          {report.materialSystemAnalysis.knowledgeBaseFigureRefs?.length ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
            >
              References:{" "}
              {report.materialSystemAnalysis.knowledgeBaseFigureRefs.join(" ")}
            </ThemedText>
          ) : null}

          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 12, marginBottom: 6 }]}
          >
            Components & layers
          </ThemedText>
          {report.materialSystemAnalysis.components.map((c, idx) => (
            <View key={`comp-${idx}`} style={{ marginBottom: 10 }}>
              <ThemedText type="small" style={styles.value}>
                {c.name}
              </ThemedText>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { marginTop: 2, lineHeight: 18 }]}
              >
                {c.purpose}
                {c.notes ? `\n${c.notes}` : ""}
              </ThemedText>
            </View>
          ))}

          {report.materialSystemAnalysis.layeringNotes.length ? (
            <>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { marginTop: 8 }]}
              >
                Context
              </ThemedText>
              {report.materialSystemAnalysis.layeringNotes.map((n, idx) => (
                <ThemedText
                  key={`layer-${idx}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginTop: idx ? 4 : 2, lineHeight: 18 },
                  ]}
                >
                  • {n}
                </ThemedText>
              ))}
            </>
          ) : null}

          {report.materialSystemAnalysis.accuracyNotes.length ? (
            <>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { marginTop: 10 }]}
              >
                Report accuracy
              </ThemedText>
              {report.materialSystemAnalysis.accuracyNotes.map((n, idx) => (
                <ThemedText
                  key={`acc-${idx}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginTop: idx ? 4 : 2, lineHeight: 18, fontSize: 12 },
                  ]}
                >
                  • {n}
                </ThemedText>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {report.lowSlopeMaterialEstimate ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Low-slope material pricing (reference)
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 6 }]}
          >
            {report.lowSlopeMaterialEstimate.priceListReference} · catalog:{" "}
            {report.lowSlopeMaterialEstimate.catalogSystem} ·{" "}
            {report.lowSlopeMaterialEstimate.scopeMode === "full-replacement"
              ? "Full replacement (indicative)"
              : "Repair (indicative)"}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 10 }]}>
            Subtotal (remove + replace + tax lines): $
            {report.lowSlopeMaterialEstimate.totals.subtotalUsd.toLocaleString(
              undefined,
              { maximumFractionDigits: 0 },
            )}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
          >
            Remove: $
            {report.lowSlopeMaterialEstimate.totals.removeUsd.toLocaleString(
              undefined,
              { maximumFractionDigits: 0 },
            )}{" "}
            · Replace: $
            {report.lowSlopeMaterialEstimate.totals.replaceUsd.toLocaleString(
              undefined,
              { maximumFractionDigits: 0 },
            )}{" "}
            · Tax (line items): $
            {report.lowSlopeMaterialEstimate.totals.taxUsd.toLocaleString(
              undefined,
              { maximumFractionDigits: 0 },
            )}
          </ThemedText>
          <View style={{ height: 10 }} />
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 6 }]}
          >
            Line items (from knowledge base)
          </ThemedText>
          {report.lowSlopeMaterialEstimate.lines.map((ln, idx) => (
            <ThemedText
              key={`ls-${idx}`}
              type="caption"
              style={[styles.mutedValue, { lineHeight: 18, marginTop: 4 }]}
            >
              • {ln.quantity} {ln.unit} — {ln.description}
              {ln.lineTotalUsd > 0
                ? ` → $${ln.lineTotalUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : ""}
            </ThemedText>
          ))}
          {report.lowSlopeMaterialEstimate.notes?.length ? (
            <>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { marginTop: 10 }]}
              >
                Notes
              </ThemedText>
              {report.lowSlopeMaterialEstimate.notes.map((n, idx) => (
                <ThemedText
                  key={`lsn-${idx}`}
                  type="caption"
                  style={[styles.mutedValue, { lineHeight: 18, marginTop: 4 }]}
                >
                  • {n}
                </ThemedText>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {report.lowSlopeMaterialEstimate ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            {COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_KB_TITLE}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 6, lineHeight: 18 }]}
          >
            Workbook Tab 6 — Instructions & Notes (same rules as the Excel
            quantity template).
          </ThemedText>
          {COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_SECTIONS.map((sec) => (
            <View key={sec.heading} style={{ marginTop: 12 }}>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { fontWeight: "600" }]}
              >
                {sec.heading}
              </ThemedText>
              {sec.lines.map((line, idx) => (
                <ThemedText
                  key={`${sec.heading}-${idx}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginTop: 4, lineHeight: 18, paddingLeft: 4 },
                  ]}
                >
                  • {line}
                </ThemedText>
              ))}
            </View>
          ))}
        </Card>
      ) : null}

      {report.eagleViewEstimate ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Materials & labor breakdown
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Final Total: $
            {report.eagleViewEstimate.totals.final.toLocaleString()}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Subtotal: $
            {report.eagleViewEstimate.totals.subtotal.toLocaleString()}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Overhead: $
            {report.eagleViewEstimate.additional.overhead.toLocaleString()} ·
            Profit: $
            {report.eagleViewEstimate.additional.profit.toLocaleString()}
          </ThemedText>
          <View style={{ height: 10 }} />

          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 6 }]}
          >
            Materials + Labor (quantities & costs)
          </ThemedText>

          {Object.entries({
            shingles: `Shingles: ${report.eagleViewEstimate.materials.shingles.quantity.toFixed(2)} sq · $${report.eagleViewEstimate.materials.shingles.cost.toLocaleString()}`,
            underlayment: `Underlayment: ${report.eagleViewEstimate.materials.underlayment.quantity} roll(s) · $${report.eagleViewEstimate.materials.underlayment.cost.toLocaleString()}`,
            iceAndWater: `Ice & Water: ${report.eagleViewEstimate.materials.iceAndWater.quantity} roll(s) · $${report.eagleViewEstimate.materials.iceAndWater.cost.toLocaleString()}`,
            ridgeVent: `Ridge Vent: ${report.eagleViewEstimate.materials.ridgeVent.quantity} piece(s) · $${report.eagleViewEstimate.materials.ridgeVent.cost.toLocaleString()}`,
            ridgeCap: `Ridge Cap: ${report.eagleViewEstimate.materials.ridgeCap.quantity} bundle(s) · $${report.eagleViewEstimate.materials.ridgeCap.cost.toLocaleString()}`,
            starterStrip: `Starter Strip: ${report.eagleViewEstimate.materials.starterStrip.quantity} bundle(s) · $${report.eagleViewEstimate.materials.starterStrip.cost.toLocaleString()}`,
            nails: `Nails: ${report.eagleViewEstimate.materials.nails.quantity} lb · $${report.eagleViewEstimate.materials.nails.cost.toLocaleString()}`,
            labor: `Labor: $${report.eagleViewEstimate.labor.total.toLocaleString()} (base $${report.eagleViewEstimate.labor.base.toLocaleString()}, adjusted rate $${report.eagleViewEstimate.labor.adjustedRate.toLocaleString()})`,
          }).map(([k, v]) => (
            <ThemedText
              key={k}
              type="caption"
              style={[styles.mutedValue, { lineHeight: 18, marginTop: 4 }]}
            >
              • {v}
            </ThemedText>
          ))}
        </Card>
      ) : null}

      {report.metarWeather ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Airport weather (METAR)
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 8, lineHeight: 18 }]}
          >
            {report.metarWeather.stationIcao}
            {report.metarWeather.distanceMilesApprox != null
              ? ` · ~${report.metarWeather.distanceMilesApprox} mi from property`
              : ""}{" "}
            — airport observation, not rooftop.
          </ThemedText>
          {report.metarWeather.summaryLines.slice(0, 10).map((line, i) => (
            <ThemedText
              key={`metar-${i}`}
              type="caption"
              style={[
                styles.mutedValue,
                { marginTop: i ? 4 : 0, lineHeight: 18 },
              ]}
            >
              {line}
            </ThemedText>
          ))}
        </Card>
      ) : null}

      {report.fieldQaChecklist &&
      Object.values(report.fieldQaChecklist).some(Boolean) ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Field QA checklist
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 10 }]}
          >
            Completed {fieldQaCompletionCount(report.fieldQaChecklist)} /{" "}
            {FIELD_QA_ITEMS.length}
          </ThemedText>
          {FIELD_QA_ITEMS.map((it) =>
            report.fieldQaChecklist?.[it.id] ? (
              <ThemedText
                key={it.id}
                type="caption"
                style={[styles.mutedValue, { marginTop: 6, lineHeight: 18 }]}
              >
                ✓ {it.label}
              </ThemedText>
            ) : null,
          )}
        </Card>
      ) : null}

      {report.aiDamageRisk ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Damage risk assessment
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Score: {report.aiDamageRisk.score}/100
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Level: {report.aiDamageRisk.level}
          </ThemedText>
          {report.aiDamageRisk.factors?.length ? (
            <>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { marginTop: 10, lineHeight: 18 }]}
              >
                Factors: {report.aiDamageRisk.factors.join(" · ")}
              </ThemedText>
            </>
          ) : null}
          {report.aiDamageRisk.actionPlan?.length ? (
            <>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { marginTop: 10 }]}
              >
                Action plan:
              </ThemedText>
              {report.aiDamageRisk.actionPlan.map((l, idx) => (
                <ThemedText
                  key={`air-${idx}`}
                  type="caption"
                  style={[
                    styles.mutedValue,
                    { marginTop: idx ? 6 : 0, lineHeight: 18 },
                  ]}
                >
                  • {l}
                </ThemedText>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {report.scopeOfWork?.length ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Scope of work
          </ThemedText>
          {report.scopeOfWork.map((line, idx) => (
            <ThemedText
              key={`sow-${idx}`}
              type="caption"
              style={[styles.mutedValue, { marginTop: idx ? 6 : 0 }]}
            >
              • {line}
            </ThemedText>
          ))}
        </Card>
      ) : null}

      {report.buildingCode ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Building code & compliance
          </ThemedText>
          <ThemedText type="small" style={styles.value}>
            {report.buildingCode.codeReference || "Building code reference"}
          </ThemedText>
          {report.buildingCode.jurisdiction ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              {report.buildingCode.jurisdiction}
            </ThemedText>
          ) : null}
          <View style={{ height: 10 }} />
          {report.buildingCode.checks.map((c) => (
            <View key={c.id} style={{ marginTop: 10 }}>
              <ThemedText
                type="caption"
                style={[styles.value, { fontWeight: "600" }]}
              >
                • {c.label}
              </ThemedText>
              {c.details ? (
                <ThemedText
                  type="caption"
                  style={[styles.mutedValue, { marginTop: 4, lineHeight: 18 }]}
                >
                  {c.details}
                </ThemedText>
              ) : null}
            </View>
          ))}

          <View style={{ height: 12 }} />
          <ThemedText
            type="small"
            style={[styles.value, { fontWeight: "700" }]}
          >
            Code Pass/Fail Checklist
          </ThemedText>
          {report.buildingCode.checks.map((c) => (
            <View key={`${c.id}_row`} style={styles.codeRow}>
              <ThemedText
                type="caption"
                style={[styles.mutedValue, { flex: 1 }]}
              >
                {c.label}
              </ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>
                ☐ P
              </ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>
                ☐ F
              </ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>
                ☐ N/A
              </ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>
                {inspectorInitials || "-"}
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Damage & inspection summary
        </ThemedText>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.smallLogoImage} />
        ) : null}
        {report.creatorName ? (
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 6 }]}
          >
            Made by: {report.creatorName}
          </ThemedText>
        ) : null}
        <ThemedText type="small" style={styles.value}>
          Damage Types: {damageList || "None"}
        </ThemedText>
        <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
          Severity: {report.severity}/5
        </ThemedText>
        <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
          Recommended Action: {report.recommendedAction}
        </ThemedText>
        {report.notes ? (
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
          >
            Notes: {report.notes}
          </ThemedText>
        ) : null}
      </Card>

      {estimate ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Damage cost estimate
          </ThemedText>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.smallLogoImage} />
          ) : null}
          {report.creatorName ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 6 }]}
            >
              Made by: {report.creatorName}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={styles.value}>
            Scope: {estimate.scope.toUpperCase()}
          </ThemedText>
          {!estimate.lineItems?.length ? (
            <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
              Final total: ${estimate.lowCostUsd.toLocaleString()} – $
              {estimate.highCostUsd.toLocaleString()}
            </ThemedText>
          ) : null}
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 8 }]}
          >
            Confidence: {estimate.confidence}
          </ThemedText>
          {estimate.methodology ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
            >
              {estimate.methodology}
            </ThemedText>
          ) : null}
          {estimate.lineItems && estimate.lineItems.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <ThemedText type="small" style={{ fontWeight: "700" }}>
                Line items (trade buckets)
              </ThemedText>
              {estimate.lineItems.map((row) => (
                <View
                  key={row.id}
                  style={{
                    marginTop: 8,
                    paddingBottom: 8,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.border,
                  }}
                >
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {row.description}
                  </ThemedText>
                  <ThemedText type="caption" style={styles.mutedValue}>
                    {row.unit} × {row.quantity.toFixed(2)} → $
                    {row.lowUsd.toLocaleString()} – $
                    {row.highUsd.toLocaleString()}
                  </ThemedText>
                  {row.note ? (
                    <ThemedText type="caption" style={styles.mutedValue}>
                      {row.note}
                    </ThemedText>
                  ) : null}
                </View>
              ))}
              <View
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: theme.border,
                }}
              >
                <ThemedText type="small" style={{ fontWeight: "700" }}>
                  Final total: ${estimate.lowCostUsd.toLocaleString()} – $
                  {estimate.highCostUsd.toLocaleString()}
                </ThemedText>
                {(() => {
                  const s = sumRoofEstimateLineItems(estimate.lineItems);
                  const drift =
                    Math.abs(s.lowUsd - estimate.lowCostUsd) > 2 ||
                    Math.abs(s.highUsd - estimate.highCostUsd) > 2;
                  return drift ? (
                    <ThemedText
                      type="caption"
                      style={[styles.mutedValue, { marginTop: 6 }]}
                    >
                      Line item subtotal ($
                      {s.lowUsd.toLocaleString()} – $
                      {s.highUsd.toLocaleString()}) may differ on older
                      reports; the final total above is authoritative.
                    </ThemedText>
                  ) : (
                    <ThemedText
                      type="caption"
                      style={[styles.mutedValue, { marginTop: 6 }]}
                    >
                      Matches the sum of the line items above.
                    </ThemedText>
                  );
                })()}
              </View>
            </View>
          ) : null}
          {estimate.notes ? (
            <ThemedText
              type="caption"
              style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}
            >
              Notes: {estimate.notes}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {report.scheduleInspection ? (
        <Card
          style={[
            styles.sectionCard,
            { borderColor: AppColors.primary, borderWidth: 1 },
          ]}
        >
          <ThemedText type="h4" style={styles.sectionTitle}>
            {report.scheduleInspection.headline}
          </ThemedText>
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 8, lineHeight: 20 }]}
          >
            {report.scheduleInspection.body}
          </ThemedText>
          {report.scheduleInspection.phone ? (
            <ThemedText type="small" style={[styles.value, { marginTop: 10 }]}>
              Phone: {report.scheduleInspection.phone}
            </ThemedText>
          ) : null}
          {report.scheduleInspection.email ? (
            <ThemedText type="small" style={[styles.value, { marginTop: 6 }]}>
              Email: {report.scheduleInspection.email}
            </ThemedText>
          ) : null}
          {report.scheduleInspection.aiClientMessage ? (
            <ThemedText
              type="caption"
              style={[
                styles.mutedValue,
                { marginTop: 10, lineHeight: 20, fontStyle: "italic" },
              ]}
            >
              {report.scheduleInspection.aiClientMessage}
            </ThemedText>
          ) : null}
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginTop: 10, lineHeight: 18 }]}
          >
            {report.scheduleInspection.disclaimer}
          </ThemedText>
        </Card>
      ) : null}

      {nonRoof ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Non-Roof Items (Itemized)
          </ThemedText>

          {nonRoof.hvacUnits ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              HVAC units replaced: {nonRoof.hvacUnits}
            </ThemedText>
          ) : null}
          {nonRoof.finCombUnits ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              Condenser fin comb: {nonRoof.finCombUnits}
            </ThemedText>
          ) : null}
          {nonRoof.fenceCleanSqFt ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              Fence clean: {nonRoof.fenceCleanSqFt.toLocaleString()} sq ft
            </ThemedText>
          ) : null}
          {nonRoof.fenceStainSqFt ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              Fence stain: {nonRoof.fenceStainSqFt.toLocaleString()} sq ft
            </ThemedText>
          ) : null}
          {nonRoof.windowWrapSmallQty ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              Window wrap small: {nonRoof.windowWrapSmallQty}
            </ThemedText>
          ) : null}
          {nonRoof.windowWrapStandardQty ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              Window wrap standard: {nonRoof.windowWrapStandardQty}
            </ThemedText>
          ) : null}
          {nonRoof.houseWrapSqFt ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              House wrap: {nonRoof.houseWrapSqFt.toLocaleString()} sq ft
            </ThemedText>
          ) : null}
          {nonRoof.fanfoldSqFt ? (
            <ThemedText type="caption" style={styles.mutedValue}>
              Fanfold foam: {nonRoof.fanfoldSqFt.toLocaleString()} sq ft
            </ThemedText>
          ) : null}

          <View style={{ height: 8 }} />
          <ThemedText type="small" style={styles.value}>
            Non-Roof Range: ${nonRoof.lowCostUsd.toLocaleString()} - $
            {nonRoof.highCostUsd.toLocaleString()}
          </ThemedText>
        </Card>
      ) : null}

      {report.images?.length ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Photos ({report.images.length})
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 10 }}
          >
            <View style={styles.photoRow}>
              {report.images?.map((img) => (
                <View key={img.id} style={styles.photoWrap}>
                  <Image
                    source={{ uri: img.dataUrl }}
                    style={styles.photoThumb}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Export
        </ThemedText>
        <ThemedText
          type="caption"
          style={[styles.mutedValue, { marginBottom: 10 }]}
        >
          Roof inspection report and cost estimate export together — choose HTML
          to print or save as PDF, or JSON for data backup.
        </ThemedText>

        <Pressable
          onPress={() => setShowUnitsGlossary((v) => !v)}
          style={({ pressed }) => ({
            marginBottom: 12,
            opacity: pressed ? 0.85 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel="Units glossary: squares, sq ft, LF"
        >
          <ThemedText type="caption" style={{ fontWeight: "700" }}>
            {showUnitsGlossary ? "▼" : "▶"} Sq ft vs squares vs LF
          </ThemedText>
        </Pressable>
        {showUnitsGlossary ? (
          <ThemedText
            type="caption"
            style={[styles.mutedValue, { marginBottom: 12, lineHeight: 18 }]}
          >
            <ThemedText type="caption" style={{ fontWeight: "700" }}>
              sq ft:
            </ThemedText>{" "}
            plan area of the roof surface.{" "}
            <ThemedText type="caption" style={{ fontWeight: "700" }}>
              Square (sq):
            </ThemedText>{" "}
            100 sq ft (roofing trade unit).{" "}
            <ThemedText type="caption" style={{ fontWeight: "700" }}>
              LF:
            </ThemedText>{" "}
            lineal feet along an edge (eaves, ridges, etc.).
          </ThemedText>
        ) : null}

        <Button
          onPress={openExportModal}
          disabled={exportBusy}
          style={styles.exportButton}
          accessibilityLabel="Open export options for HTML or JSON"
        >
          {exportBusy ? "Exporting…" : "Export report"}
        </Button>

        <View style={{ height: 14 }} />

        <Button
          variant="ghost"
          onPress={handleDelete}
          style={styles.deleteButton as any}
        >
          Delete Report
        </Button>
      </Card>

      <View style={{ height: 24 }} />

      <Modal
        visible={exportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (exportModalStep !== "working") setExportModalVisible(false);
        }}
      >
        <Pressable
          style={styles.exportModalBackdrop}
          onPress={() => {
            if (exportModalStep !== "working") setExportModalVisible(false);
          }}
        >
          <Pressable
            style={[
              styles.exportModalCard,
              {
                backgroundColor: theme.backgroundSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {exportModalStep === "choose" ? (
              <>
                <ThemedText type="h4" style={{ marginBottom: 8 }}>
                  Export report
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ marginBottom: 14, opacity: 0.9, lineHeight: 20 }}
                >
                  HTML includes the printable report and cost estimate. JSON is
                  raw data for backup or tools.
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    gap: 12,
                  }}
                >
                  <ThemedText type="caption" style={{ flex: 1 }}>
                    Redact homeowner & schedule contacts in JSON
                  </ThemedText>
                  <Switch
                    value={redactJsonExport}
                    onValueChange={setRedactJsonExport}
                    trackColor={{ false: "#94a3b8", true: AppColors.primary }}
                  />
                </View>
                <Button
                  onPress={runExportHtml}
                  style={styles.exportModalButton}
                  accessibilityLabel="Export as HTML for print or PDF"
                >
                  HTML (print / PDF)
                </Button>
                <View style={{ height: 10 }} />
                <Button
                  variant="secondary"
                  onPress={runExportJson}
                  style={styles.exportModalButton}
                  accessibilityLabel="Export as JSON file"
                >
                  JSON{redactJsonExport ? " (redacted)" : ""}
                </Button>
                <View style={{ height: 10 }} />
                <Button
                  variant="ghost"
                  onPress={() => setExportModalVisible(false)}
                  style={styles.exportModalButton}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <ThemedText type="h4" style={{ marginBottom: 8 }}>
                  Exporting…
                </ThemedText>
                <ThemedText
                  type="caption"
                  style={{ marginBottom: 12, lineHeight: 20 }}
                >
                  {exportPhase || "Working…"}{" "}
                  <ThemedText type="caption" style={{ fontWeight: "700" }}>
                    {Math.round(exportProgressPct)}%
                  </ThemedText>
                </ThemedText>
                <View
                  style={[
                    styles.exportProgressTrack,
                    { backgroundColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.exportProgressFill,
                      {
                        width: `${Math.min(100, Math.max(0, exportProgressPct))}%`,
                      },
                    ]}
                  />
                </View>
                <ActivityIndicator
                  style={{ marginTop: 16 }}
                  color={AppColors.primary}
                />
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const ROOFR_BLUE = "#1e40af";

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, gap: 14 },

  coverCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    backgroundColor: "#1e3a8a",
  },
  coverKicker: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  coverTitle: { color: "#fff", marginBottom: 8 },
  coverAddress: { color: "rgba(255,255,255,0.95)", lineHeight: 20 },
  coverMeta: { color: "rgba(255,255,255,0.8)", marginTop: 8 },

  statStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  statTile: {
    minWidth: 100,
    flexGrow: 1,
    maxWidth: 160,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  statValue: { color: ROOFR_BLUE, fontWeight: "800" },
  statLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    opacity: 0.75,
    textTransform: "uppercase",
  },

  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  sectionCard: { padding: Spacing.lg },
  sectionTitle: { marginBottom: 8 },
  propCoords: { marginTop: 6, opacity: 0.75 },
  autoButton: { width: "100%", marginTop: 2 },
  value: { lineHeight: 18 },
  mutedValue: { opacity: 0.8, lineHeight: 18 },

  exportButton: { width: "100%" },
  exportModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  exportModalCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    maxWidth: 420,
    alignSelf: "center",
    width: "100%",
  },
  exportModalButton: { width: "100%" },
  exportProgressTrack: {
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
  },
  exportProgressFill: {
    height: "100%",
    backgroundColor: AppColors.primary,
    borderRadius: 6,
  },
  deleteButton: {
    width: "100%",
    borderColor: "#ef4444",
    backgroundColor: "transparent",
  } as any,

  photoRow: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  photoWrap: {
    width: 110,
    height: 110,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#0b1220",
  },
  photoThumb: { width: "100%", height: "100%" },
  logoImage: {
    width: 230,
    height: 58,
    resizeMode: "contain",
    alignSelf: "flex-start",
  },
  smallLogoImage: {
    width: 180,
    height: 45,
    resizeMode: "contain",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  propertyPhoto: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#0b1220",
  },
  roofDiagramImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  roofDiagramImageTall: {
    width: "100%",
    height: 280,
    borderRadius: 10,
    backgroundColor: "#f8fafc",
  },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  codeCell: { width: 44, textAlign: "center" },

  kbPdfRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
