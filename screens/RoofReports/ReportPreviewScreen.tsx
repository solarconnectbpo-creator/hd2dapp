import React from "react";
import { Alert, Image, ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, BorderRadius, Spacing } from "@/constants/theme";
import { exportRoofReportToHtml, exportRoofReportToJson } from "@/src/roofReports/exportRoofReport";
import { roofMeasurementsHaveContent } from "@/src/roofReports/eavemeasureIntegration";
import type { DamageRoofReport } from "@/src/roofReports/roofReportTypes";
import { deleteRoofReport } from "@/src/roofReports/roofReportStorage";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { getCompanyLogoUrl, getIntroNarrative } from "@/src/roofReports/companyBranding";

type Props = NativeStackScreenProps<ReportsStackParamList, "ReportPreview">;

export default function ReportPreviewScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { report } = route.params;

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

  const exportHtml = () => {
    try {
      exportRoofReportToHtml(report);
    } catch (e) {
      Alert.alert("Export failed", "Could not export HTML. Try again.");
      console.error(e);
    }
  };

  const exportJson = () => {
    try {
      exportRoofReportToJson(report);
    } catch (e) {
      Alert.alert("Export failed", "Could not export JSON. Try again.");
      console.error(e);
    }
  };

  const damageList = report.damageTypes.join(", ");
  const estimate = report.estimate;
  const nonRoof = report.nonRoofEstimate;
  const logoUrl = getCompanyLogoUrl(report);
  const intro = getIntroNarrative(report.companyName);
  const roofSquaresText =
    report.measurements?.roofAreaSqFt && Number.isFinite(report.measurements.roofAreaSqFt)
      ? `${(report.measurements.roofAreaSqFt / 100).toFixed(2)} sq`
      : "N/A";
  const areaText = report.measurements?.roofAreaSqFt ? `${report.measurements.roofAreaSqFt.toLocaleString()} sq ft` : "Not traced";
  const perimeterText = report.measurements?.roofPerimeterFt ? `${report.measurements.roofPerimeterFt.toLocaleString()} ft` : "Not traced";
  const inspectorInitials = (report.creatorName || "")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");

  return (
    <ScrollView contentContainerStyle={styles.content} style={[styles.screen, { backgroundColor: theme.backgroundRoot }]}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Feather name="file-text" size={18} color="#fff" />
        </View>
        <ThemedText type="h2" style={styles.headerTitle}>
          Preview / Export
        </ThemedText>
      </View>

      <Card style={styles.sectionCard}>
        {logoUrl ? (
          <View style={{ marginBottom: 10 }}>
            <Image source={{ uri: logoUrl }} style={styles.logoImage} />
          </View>
        ) : null}
        <ThemedText type="h4" style={styles.sectionTitle}>
          Property & Inspection
        </ThemedText>
        <ThemedText type="caption" style={[styles.mutedValue, { marginBottom: 8 }]}>
          {intro}
        </ThemedText>
        {report.propertyImageUrl ? (
          <View style={{ marginTop: 6, marginBottom: 10 }}>
            <Image source={{ uri: report.propertyImageUrl }} style={styles.propertyPhoto} />
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 6 }]}>
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
          Coordinates: {report.property.lat.toFixed(6)}, {report.property.lng.toFixed(6)}
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
      </Card>

      {roofMeasurementsHaveContent(report.measurements) ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Measurements
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
          {report.measurements?.aerialMeasurementProvider ? (
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 8 }]}>
              Aerial source: {report.measurements.aerialMeasurementProvider}
            </ThemedText>
          ) : null}
          {report.measurements?.aerialMeasurementReference ? (
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 4 }]}>
              Aerial ref: {report.measurements.aerialMeasurementReference}
            </ThemedText>
          ) : null}
          {report.measurements?.aerialMeasurementReportUrl ? (
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 4 }]}>
              Aerial link: {report.measurements.aerialMeasurementReportUrl}
            </ThemedText>
          ) : null}
          {report.measurements?.notes ? (
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}>
              Notes: {report.measurements.notes}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {report.roofDiagramImageUrl ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Area Diagram
          </ThemedText>
          <Image source={{ uri: report.roofDiagramImageUrl }} style={styles.roofDiagramImage} />
          <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 6 }]}>
            {report.roofDiagramSource || "Generated from roof measurements"}
          </ThemedText>
        </Card>
      ) : null}

      {report.roofPitchDiagramImageUrl ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Pitches Diagram
          </ThemedText>
          <Image source={{ uri: report.roofPitchDiagramImageUrl }} style={styles.roofDiagramImage} />
          <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 6 }]}>
            {report.roofPitchDiagramSource || "Generated from roof pitch"}
          </ThemedText>
        </Card>
      ) : null}

      {report.roofLengthsDiagramImageUrl ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Lengths Diagram
          </ThemedText>
          <Image source={{ uri: report.roofLengthsDiagramImageUrl }} style={styles.roofDiagramImage} />
          <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 6 }]}>
            {report.roofLengthsDiagramSource || "Generated from traced roof outline"}
          </ThemedText>
        </Card>
      ) : null}

      {report.materialRequirements ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Material Requirements
          </ThemedText>
          <ThemedText type="small" style={styles.value}>
            Roofing Material: {report.materialRequirements.mainMaterial}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Roof classification: {report.materialRequirements.roofType}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Waste factor: {report.materialRequirements.wasteFactor.toFixed(2)}
            {typeof report.materialRequirements.wastePct === "number" ? ` (${report.materialRequirements.wastePct}% )` : ""}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Unit: {report.materialRequirements.unit}
          </ThemedText>

          {report.materialRequirements.notes ? (
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}>
              Notes: {report.materialRequirements.notes}
            </ThemedText>
          ) : null}

          {report.materialRequirements.extras?.length ? (
            <>
              <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 10 }]}>
                Extras to consider:
              </ThemedText>
              {report.materialRequirements.extras.map((e, idx) => (
                <ThemedText key={`extra-${idx}`} type="caption" style={[styles.mutedValue, { marginTop: idx ? 4 : 0, lineHeight: 18 }]}>
                  • {e}
                </ThemedText>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {report.eagleViewEstimate ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            EagleView-style Breakdown
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Final Total: ${report.eagleViewEstimate.totals.final.toLocaleString()}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Subtotal: ${report.eagleViewEstimate.totals.subtotal.toLocaleString()}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Overhead: ${report.eagleViewEstimate.additional.overhead.toLocaleString()} · Profit: $
            {report.eagleViewEstimate.additional.profit.toLocaleString()}
          </ThemedText>
          <View style={{ height: 10 }} />

          <ThemedText type="caption" style={[styles.mutedValue, { marginBottom: 6 }]}>
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

      {report.aiDamageRisk ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Damage Risk (AI-style)
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Score: {report.aiDamageRisk.score}/100
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Level: {report.aiDamageRisk.level}
          </ThemedText>
          {report.aiDamageRisk.factors?.length ? (
            <>
              <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 10, lineHeight: 18 }]}>
                Factors: {report.aiDamageRisk.factors.join(" · ")}
              </ThemedText>
            </>
          ) : null}
          {report.aiDamageRisk.actionPlan?.length ? (
            <>
              <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 10 }]}>
                Action plan:
              </ThemedText>
              {report.aiDamageRisk.actionPlan.map((l, idx) => (
                <ThemedText key={`air-${idx}`} type="caption" style={[styles.mutedValue, { marginTop: idx ? 6 : 0, lineHeight: 18 }]}>
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
            Scope of Work
          </ThemedText>
          {report.scopeOfWork.map((line, idx) => (
            <ThemedText key={`sow-${idx}`} type="caption" style={[styles.mutedValue, { marginTop: idx ? 6 : 0 }]}>
              • {line}
            </ThemedText>
          ))}
        </Card>
      ) : null}

      {report.buildingCode ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Building Codes
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
              <ThemedText type="caption" style={[styles.value, { fontWeight: "600" }]}>
                • {c.label}
              </ThemedText>
              {c.details ? (
                <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 4, lineHeight: 18 }]}>
                  {c.details}
                </ThemedText>
              ) : null}
            </View>
          ))}

          <View style={{ height: 12 }} />
          <ThemedText type="small" style={[styles.value, { fontWeight: "700" }]}>
            Code Pass/Fail Checklist
          </ThemedText>
          {report.buildingCode.checks.map((c) => (
            <View key={`${c.id}_row`} style={styles.codeRow}>
              <ThemedText type="caption" style={[styles.mutedValue, { flex: 1 }]}>
                {c.label}
              </ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>☐ P</ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>☐ F</ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>☐ N/A</ThemedText>
              <ThemedText type="caption" style={styles.codeCell}>{inspectorInitials || "-"}</ThemedText>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Damage Summary
        </ThemedText>
        {logoUrl ? (
          <Image source={{ uri: logoUrl }} style={styles.smallLogoImage} />
        ) : null}
        {report.creatorName ? (
          <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 6 }]}>
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
          <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}>
            Notes: {report.notes}
          </ThemedText>
        ) : null}
      </Card>

      {estimate ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Damage Estimate
          </ThemedText>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.smallLogoImage} />
          ) : null}
          {report.creatorName ? (
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 6 }]}>
              Made by: {report.creatorName}
            </ThemedText>
          ) : null}
          <ThemedText type="small" style={styles.value}>
            Scope: {estimate.scope.toUpperCase()}
          </ThemedText>
          <ThemedText type="small" style={[styles.value, { marginTop: 8 }]}>
            Estimated Range: ${estimate.lowCostUsd.toLocaleString()} - ${estimate.highCostUsd.toLocaleString()}
          </ThemedText>
          <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 8 }]}>
            Confidence: {estimate.confidence}
          </ThemedText>
          {estimate.notes ? (
            <ThemedText type="caption" style={[styles.mutedValue, { marginTop: 8, lineHeight: 18 }]}>
              Notes: {estimate.notes}
            </ThemedText>
          ) : null}
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
            Non-Roof Range: ${nonRoof.lowCostUsd.toLocaleString()} - ${nonRoof.highCostUsd.toLocaleString()}
          </ThemedText>
        </Card>
      ) : null}

      {report.images?.length ? (
        <Card style={styles.sectionCard}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Photos ({report.images.length})
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={styles.photoRow}>
              {report.images?.map((img) => (
                <View key={img.id} style={styles.photoWrap}>
                  <Image source={{ uri: img.dataUrl }} style={styles.photoThumb} />
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

        <Button onPress={exportHtml} style={styles.exportButton}>
          Export HTML (Print to PDF)
        </Button>
        <View style={{ height: 10 }} />
        <Button variant="secondary" onPress={exportJson} style={[styles.exportButton, styles.secondaryExportButton]}>
          Export JSON
        </Button>

        <View style={{ height: 14 }} />

        <Button variant="ghost" onPress={handleDelete} style={styles.deleteButton as any}>
          Delete Report
        </Button>
      </Card>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: Spacing.lg, gap: 14 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1 },

  sectionCard: { padding: Spacing.lg },
  sectionTitle: { marginBottom: 8 },
  value: { lineHeight: 18 },
  mutedValue: { opacity: 0.8, lineHeight: 18 },

  exportButton: { width: "100%" },
  secondaryExportButton: { borderWidth: 1 },
  deleteButton: { width: "100%", borderColor: "#ef4444", backgroundColor: "transparent" } as any,

  photoRow: { flexDirection: "row", gap: 12, paddingVertical: 4 },
  photoWrap: { width: 110, height: 110, borderRadius: 10, overflow: "hidden", backgroundColor: "#0b1220" },
  photoThumb: { width: "100%", height: "100%" },
  logoImage: { width: 230, height: 58, resizeMode: "contain", alignSelf: "flex-start" },
  smallLogoImage: { width: 180, height: 45, resizeMode: "contain", alignSelf: "flex-start", marginTop: 6 },
  propertyPhoto: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#0b1220" },
  roofDiagramImage: { width: "100%", height: 220, borderRadius: 10, backgroundColor: "#f8fafc" },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  codeCell: { width: 44, textAlign: "center" },
});

