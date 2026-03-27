import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { AppColors, BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import PropertySelectMap from "@/src/roofReports/PropertySelectMap";
import type { PropertySelection } from "@/src/roofReports/roofReportTypes";
import { useRoofReportGeneration } from "@/src/hooks/useRoofReportGeneration";
import ProgressTracker from "@/src/components/ProgressTracker";

const roofTypeOptions = [
  "Asphalt Shingle",
  "Metal",
  "Tile",
  "Wood Shake",
  "Flat/Rubber",
  "Slate",
];

export function RoofReportScreen() {
  const { theme } = useTheme();
  const {
    report,
    isLoading,
    progress,
    progressMessage,
    error,
    generateReport,
    exportReportFile,
    clearReport,
  } = useRoofReportGeneration();

  const [address, setAddress] = useState("");
  const [roofAge, setRoofAge] = useState("");
  const [roofType, setRoofType] = useState("Asphalt Shingle");
  const [squareFootage, setSquareFootage] = useState("");
  const [roofPerimeterFt, setRoofPerimeterFt] = useState("");
  const [roofPitch, setRoofPitch] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [carrierScopeText, setCarrierScopeText] = useState("");
  const [deductibleUsd, setDeductibleUsd] = useState("");
  const [nonRecoverableDepreciationUsd, setNonRecoverableDepreciationUsd] =
    useState("");
  const [visibleIssues, setVisibleIssues] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(true);
  const [selectedProperty, setSelectedProperty] =
    useState<PropertySelection | null>(null);
  const [entryMode, setEntryMode] = useState<"builder" | "map">("builder");

  const handleGenerateReport = async () => {
    if (!address.trim()) {
      Alert.alert("Error", "Please enter address");
      return;
    }

    if (!roofAge.trim()) {
      Alert.alert("Error", "Please enter roof age");
      return;
    }

    if (!squareFootage.trim()) {
      Alert.alert("Error", "Please enter square footage");
      return;
    }

    const age = Number.parseInt(roofAge, 10);
    const sqft = Number.parseInt(squareFootage, 10);
    const perimeter = roofPerimeterFt.trim()
      ? Number.parseFloat(roofPerimeterFt)
      : undefined;
    const deductible = deductibleUsd.trim()
      ? Number.parseFloat(deductibleUsd)
      : undefined;
    const nonRecoverableDepreciation = nonRecoverableDepreciationUsd.trim()
      ? Number.parseFloat(nonRecoverableDepreciationUsd)
      : undefined;
    if (!Number.isFinite(age) || age < 0) {
      Alert.alert("Error", "Please enter a valid roof age");
      return;
    }
    if (!Number.isFinite(sqft) || sqft <= 0) {
      Alert.alert("Error", "Please enter valid square footage");
      return;
    }
    if (perimeter != null && (!Number.isFinite(perimeter) || perimeter <= 0)) {
      Alert.alert("Error", "Please enter a valid roof perimeter");
      return;
    }
    if (
      deductible != null &&
      (!Number.isFinite(deductible) || deductible < 0)
    ) {
      Alert.alert("Error", "Please enter a valid deductible amount");
      return;
    }
    if (
      nonRecoverableDepreciation != null &&
      (!Number.isFinite(nonRecoverableDepreciation) ||
        nonRecoverableDepreciation < 0)
    ) {
      Alert.alert("Error", "Please enter a valid non-recoverable depreciation");
      return;
    }

    const issues = visibleIssues
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    if (issues.length === 0) {
      Alert.alert("Error", "Please enter at least one visible issue");
      return;
    }

    const data = {
      address: address.trim(),
      latitude: selectedProperty?.lat,
      longitude: selectedProperty?.lng,
      roofAge: age,
      roofType,
      squareFootage: sqft,
      roofPerimeterFt: perimeter,
      roofPitch: roofPitch.trim() || undefined,
      stateCode: stateCode.trim().toUpperCase() || undefined,
      carrierScopeText: carrierScopeText.trim() || undefined,
      deductibleUsd: deductible,
      nonRecoverableDepreciationUsd: nonRecoverableDepreciation,
      visibleIssues: issues,
      notes: notes.trim() || undefined,
    };

    const result = await generateReport(data);
    if (result) setShowForm(false);
  };

  const handleExportPDF = async () => {
    const result = await exportReportFile();
    if (result === null) {
      Alert.alert("Export", error ?? "No report to export.");
      return;
    }
    if (result.ok) {
      Alert.alert(
        "Export",
        Platform.OS === "web"
          ? "Download should start in your browser. Check your Downloads folder."
          : "Use the share sheet to save the file, send it by email, or open it in another app.",
      );
    } else {
      Alert.alert("Export failed", result.error);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[styles.loadingWrap, { backgroundColor: theme.backgroundRoot }]}
      >
        <ActivityIndicator size="large" color={AppColors.primary} />
        <ProgressTracker progress={progress} label={progressMessage} />
        {error ? (
          <ThemedText type="caption" style={styles.errorInline}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  if (report && !showForm) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        contentContainerStyle={styles.contentPad}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.reportTitle, { color: theme.text }]}>
            Roof Inspection Report
          </Text>

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Address
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              {report.address}
            </Text>
            {typeof report.measurements.latitude === "number" &&
            typeof report.measurements.longitude === "number" ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Coordinates: {report.measurements.latitude.toFixed(6)},{" "}
                {report.measurements.longitude.toFixed(6)}
              </Text>
            ) : null}
          </View>

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Executive Summary
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              {report.executiveSummary}
            </Text>
          </View>

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Roof Condition
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              Overall: {report.condition.overall}
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              Material: {report.condition.material}
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              Age: {report.condition.age} years
            </Text>
          </View>

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Identified Issues
            </Text>
            {report.issues.identified.map((issue, index) => (
              <Text
                key={index}
                style={[styles.listItem, { color: theme.textSecondary }]}
              >
                • {issue}
              </Text>
            ))}
          </View>

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Recommendations
            </Text>

            <Text style={[styles.subTitle, { color: theme.text }]}>
              Repairs:
            </Text>
            {report.recommendations.repairs.map((repair, index) => (
              <Text
                key={index}
                style={[styles.listItem, { color: theme.textSecondary }]}
              >
                • {repair}
              </Text>
            ))}

            <Text
              style={[
                styles.subTitle,
                { color: theme.text, marginTop: Spacing.md },
              ]}
            >
              Maintenance:
            </Text>
            {report.recommendations.maintenance.map((maint, index) => (
              <Text
                key={index}
                style={[styles.listItem, { color: theme.textSecondary }]}
              >
                • {maint}
              </Text>
            ))}

            <Text
              style={[
                styles.subTitle,
                { color: theme.text, marginTop: Spacing.md },
              ]}
            >
              Preventative:
            </Text>
            {report.recommendations.preventative.map((prev, index) => (
              <Text
                key={index}
                style={[styles.listItem, { color: theme.textSecondary }]}
              >
                • {prev}
              </Text>
            ))}
          </View>

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Cost Estimate
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              Range: {report.costEstimate.lowRange} -{" "}
              {report.costEstimate.highRange}
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              Urgency: {report.costEstimate.urgency}
            </Text>
            {report.costEstimate.scope ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Scope: {report.costEstimate.scope}
              </Text>
            ) : null}
            {report.costEstimate.confidence ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Confidence: {report.costEstimate.confidence}
              </Text>
            ) : null}
            {report.costEstimate.basis ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                {report.costEstimate.basis}
              </Text>
            ) : null}
            {report.costEstimate.lineItems?.length ? (
              <>
                <Text
                  style={[
                    styles.subTitle,
                    { color: theme.text, marginTop: Spacing.md },
                  ]}
                >
                  Key Line Items
                </Text>
                {report.costEstimate.lineItems.map((line, index) => (
                  <Text
                    key={index}
                    style={[styles.listItem, { color: theme.textSecondary }]}
                  >
                    • {line}
                  </Text>
                ))}
              </>
            ) : null}
            {report.costEstimate.codeUpgrades?.length ? (
              <>
                <Text
                  style={[
                    styles.subTitle,
                    { color: theme.text, marginTop: Spacing.md },
                  ]}
                >
                  Code Upgrade Checks
                </Text>
                {report.costEstimate.codeUpgrades.map((line, index) => (
                  <Text
                    key={index}
                    style={[styles.listItem, { color: theme.textSecondary }]}
                  >
                    • {line}
                  </Text>
                ))}
              </>
            ) : null}
            {report.costEstimate.recoveryDeltaRange ? (
              <>
                <Text
                  style={[
                    styles.subTitle,
                    { color: theme.text, marginTop: Spacing.md },
                  ]}
                >
                  Claim Audit & Recovery
                </Text>
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  Potential Recovery Delta:{" "}
                  {report.costEstimate.recoveryDeltaRange}
                </Text>
                {report.costEstimate.auditSummary ? (
                  <Text
                    style={[
                      styles.sectionContent,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {report.costEstimate.auditSummary}
                  </Text>
                ) : null}
                {report.costEstimate.auditFindings?.map((line, index) => (
                  <Text
                    key={index}
                    style={[styles.listItem, { color: theme.textSecondary }]}
                  >
                    • {line}
                  </Text>
                ))}
                {report.costEstimate.auditTimeline?.length ? (
                  <>
                    <Text
                      style={[
                        styles.subTitle,
                        { color: theme.text, marginTop: Spacing.md },
                      ]}
                    >
                      Audit Workflow
                    </Text>
                    {report.costEstimate.auditTimeline.map((step, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.listItem,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {index + 1}. {step}
                      </Text>
                    ))}
                  </>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Measurement Intelligence
            </Text>
            <Text
              style={[styles.sectionContent, { color: theme.textSecondary }]}
            >
              Plan Area:{" "}
              {Math.round(report.measurements.areaSqFt).toLocaleString()} sq ft
            </Text>
            {typeof report.measurements.perimeterFt === "number" ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Perimeter:{" "}
                {Math.round(report.measurements.perimeterFt).toLocaleString()}{" "}
                ft
              </Text>
            ) : null}
            {report.measurements.pitch ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Pitch: {report.measurements.pitch}
              </Text>
            ) : null}
            {typeof report.measurements.effectiveSquares === "number" ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Effective Squares (with waste):{" "}
                {report.measurements.effectiveSquares.toFixed(2)}
              </Text>
            ) : null}
            {typeof report.measurements.wasteFactorPct === "number" ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Waste Factor: {report.measurements.wasteFactorPct}%
              </Text>
            ) : null}
            {report.measurements.roofSystemCategory ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Roof System Category: {report.measurements.roofSystemCategory}
              </Text>
            ) : null}
            {typeof report.measurements.qualityScore === "number" ? (
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Measurement Quality Score: {report.measurements.qualityScore}
                /100
              </Text>
            ) : null}
            {report.measurements.qualityWarnings?.length ? (
              <>
                <Text
                  style={[
                    styles.subTitle,
                    { color: theme.text, marginTop: Spacing.md },
                  ]}
                >
                  Measurement Warnings
                </Text>
                {report.measurements.qualityWarnings.map((line, index) => (
                  <Text
                    key={index}
                    style={[styles.listItem, { color: theme.textSecondary }]}
                  >
                    • {line}
                  </Text>
                ))}
              </>
            ) : null}
            {report.measurements.guidance?.length ? (
              <>
                <Text
                  style={[
                    styles.subTitle,
                    { color: theme.text, marginTop: Spacing.md },
                  ]}
                >
                  Guidance Notes
                </Text>
                {report.measurements.guidance.map((line, index) => (
                  <Text
                    key={index}
                    style={[styles.listItem, { color: theme.textSecondary }]}
                  >
                    • {line}
                  </Text>
                ))}
              </>
            ) : null}
          </View>

          {report.carrierComparison ? (
            <View style={styles.reportSection}>
              <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
                Carrier Scope Comparison
              </Text>
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Valuation basis: {report.carrierComparison.valuationBasis}
              </Text>
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Parser confidence: {report.carrierComparison.parserConfidence}
              </Text>
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Parsed from line math total: $
                {report.carrierComparison.parsedFromLineMathTotalUsd.toLocaleString()}
              </Text>
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Line math mismatch count:{" "}
                {report.carrierComparison.lineMathMismatchCount}
              </Text>
              {typeof report.carrierComparison.parsedRcvUsd === "number" ? (
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  Parsed RCV: $
                  {report.carrierComparison.parsedRcvUsd.toLocaleString()}
                </Text>
              ) : null}
              {typeof report.carrierComparison.parsedAcvUsd === "number" ? (
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  Parsed ACV: $
                  {report.carrierComparison.parsedAcvUsd.toLocaleString()}
                </Text>
              ) : null}
              {typeof report.carrierComparison.parsedDepreciationUsd ===
              "number" ? (
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  Parsed Depreciation: $
                  {report.carrierComparison.parsedDepreciationUsd.toLocaleString()}
                </Text>
              ) : null}
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Carrier parsed items:{" "}
                {report.carrierComparison.carrierItemsCount}
              </Text>
              {report.carrierComparison.detectedLineCodes.length > 0 ? (
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  Detected line codes:{" "}
                  {report.carrierComparison.detectedLineCodes.join(", ")}
                </Text>
              ) : null}
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Carrier parsed total: $
                {report.carrierComparison.parsedCarrierTotalUsd.toLocaleString()}
              </Text>
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Estimator midpoint: $
                {report.carrierComparison.estimatedMidUsd.toLocaleString()}
              </Text>
              <Text
                style={[styles.sectionContent, { color: theme.textSecondary }]}
              >
                Delta ({report.carrierComparison.deltaDirection}): $
                {report.carrierComparison.deltaUsd.toLocaleString()}
              </Text>
              {report.carrierComparison.settlementProjection ? (
                <>
                  <Text
                    style={[
                      styles.subTitle,
                      { color: theme.text, marginTop: Spacing.md },
                    ]}
                  >
                    Settlement Projection
                  </Text>
                  <Text
                    style={[
                      styles.sectionContent,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Deductible: $
                    {report.carrierComparison.settlementProjection.deductibleUsd.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.sectionContent,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Recoverable depreciation: $
                    {report.carrierComparison.settlementProjection.recoverableDepreciationUsd.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.sectionContent,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Initial ACV payment (est): $
                    {report.carrierComparison.settlementProjection.initialPaymentUsd.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.sectionContent,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Final total payment after recoverable dep (est): $
                    {report.carrierComparison.settlementProjection.projectedFinalPaymentUsd.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.sectionContent,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Estimated out-of-pocket vs estimator midpoint: $
                    {report.carrierComparison.settlementProjection.estimatedOutOfPocketUsd.toLocaleString()}
                  </Text>
                </>
              ) : null}
              {report.carrierComparison.likelyMissingItems.length > 0 ? (
                <>
                  <Text
                    style={[
                      styles.subTitle,
                      { color: theme.text, marginTop: Spacing.md },
                    ]}
                  >
                    Likely Missing Scope
                  </Text>
                  {report.carrierComparison.likelyMissingItems.map(
                    (line, index) => (
                      <Text
                        key={index}
                        style={[
                          styles.listItem,
                          { color: theme.textSecondary },
                        ]}
                      >
                        • {line}
                      </Text>
                    ),
                  )}
                </>
              ) : null}
              {report.carrierComparison.note ? (
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  {report.carrierComparison.note}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.reportSection}>
            <Text style={[styles.sectionTitle, { color: AppColors.primary }]}>
              Maintenance Schedule
            </Text>

            <Text style={[styles.subTitle, { color: theme.text }]}>
              Monthly Tasks:
            </Text>
            {report.maintenanceSchedule.monthly.map((task, index) => (
              <Text
                key={index}
                style={[styles.listItem, { color: theme.textSecondary }]}
              >
                • {task}
              </Text>
            ))}

            <Text
              style={[
                styles.subTitle,
                { color: theme.text, marginTop: Spacing.md },
              ]}
            >
              Seasonal Tasks:
            </Text>
            {report.maintenanceSchedule.seasonal.map((task, index) => (
              <Text
                key={index}
                style={[styles.listItem, { color: theme.textSecondary }]}
              >
                • {task}
              </Text>
            ))}

            <Text
              style={[
                styles.subTitle,
                { color: theme.text, marginTop: Spacing.md },
              ]}
            >
              Annual Tasks:
            </Text>
            {report.maintenanceSchedule.annual.map((task, index) => (
              <Text
                key={index}
                style={[styles.listItem, { color: theme.textSecondary }]}
              >
                • {task}
              </Text>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportPDF}
            >
              <Text style={styles.buttonText}>Export report (.txt)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newReportButton}
              onPress={() => {
                clearReport();
                setShowForm(true);
                setAddress("");
                setRoofAge("");
                setSquareFootage("");
                setRoofPerimeterFt("");
                setRoofPitch("");
                setStateCode("");
                setCarrierScopeText("");
                setDeductibleUsd("");
                setNonRecoverableDepreciationUsd("");
                setSelectedProperty(null);
                setEntryMode("builder");
                setVisibleIssues("");
                setNotes("");
              }}
            >
              <Text style={styles.buttonText}>New Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={styles.contentPad}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: theme.cardBackground, borderColor: theme.border },
        ]}
      >
        <Text style={[styles.formTitle, { color: theme.text }]}>
          Roof Inspection Report Generator
        </Text>
        <Text style={[styles.formDescription, { color: theme.textSecondary }]}>
          New roof intelligence interface with map-driven property intake and
          estimator workflow.
        </Text>

        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[
              styles.modeTabButton,
              entryMode === "builder" && styles.modeTabButtonActive,
            ]}
            onPress={() => setEntryMode("builder")}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.modeTabText,
                entryMode === "builder" && styles.modeTabTextActive,
              ]}
            >
              Estimate Builder
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeTabButton,
              entryMode === "map" && styles.modeTabButtonActive,
            ]}
            onPress={() => setEntryMode("map")}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.modeTabText,
                entryMode === "map" && styles.modeTabTextActive,
              ]}
            >
              Map Intake
            </Text>
          </TouchableOpacity>
        </View>

        {entryMode === "map" ? (
          <View style={styles.formSection}>
            <Text style={[styles.label, { color: theme.text }]}>
              Mapping Data Intake
            </Text>
            <View style={[styles.mapPanel, { borderColor: theme.border }]}>
              <PropertySelectMap
                onPropertySelected={(property) => {
                  setSelectedProperty(property);
                  if (!address.trim()) setAddress(property.address);
                }}
              />
            </View>
            {selectedProperty ? (
              <View
                style={[
                  styles.mapSelectionCard,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.subTitle, { color: theme.text }]}>
                  Selected Property
                </Text>
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  {selectedProperty.address}
                </Text>
                <Text
                  style={[
                    styles.sectionContent,
                    { color: theme.textSecondary },
                  ]}
                >
                  {selectedProperty.lat.toFixed(6)},{" "}
                  {selectedProperty.lng.toFixed(6)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>Address *</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="Enter property address"
            placeholderTextColor={theme.textSecondary}
            value={address}
            onChangeText={setAddress}
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Roof Age (Years) *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., 10"
            placeholderTextColor={theme.textSecondary}
            value={roofAge}
            onChangeText={setRoofAge}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>Roof Type *</Text>
          <View style={styles.typeOptions}>
            {roofTypeOptions.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.backgroundSecondary,
                  },
                  roofType === type && styles.typeButtonActive,
                ]}
                onPress={() => setRoofType(type)}
                disabled={isLoading}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    { color: theme.textSecondary },
                    roofType === type && styles.typeButtonTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Square Footage *
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., 2500"
            placeholderTextColor={theme.textSecondary}
            value={squareFootage}
            onChangeText={setSquareFootage}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Roof Perimeter (ft)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., 220"
            placeholderTextColor={theme.textSecondary}
            value={roofPerimeterFt}
            onChangeText={setRoofPerimeterFt}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Roof Pitch (rise/12)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., 6/12"
            placeholderTextColor={theme.textSecondary}
            value={roofPitch}
            onChangeText={setRoofPitch}
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            State Code (for code upgrades)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., TX, MO, CO"
            placeholderTextColor={theme.textSecondary}
            value={stateCode}
            onChangeText={setStateCode}
            autoCapitalize="characters"
            maxLength={2}
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Carrier Scope Line Items (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder={`Paste carrier lines, one per row (Xactimate-style supported)\nRFG250 Tear Off 42.00 SQ $4,200\nRFGDRP Drip Edge 220.00 LF $680\nRCV: $16,480  ACV: $13,900  Depreciation: $2,580`}
            placeholderTextColor={theme.textSecondary}
            value={carrierScopeText}
            onChangeText={setCarrierScopeText}
            multiline
            numberOfLines={5}
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Policy Deductible (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., 2500"
            placeholderTextColor={theme.textSecondary}
            value={deductibleUsd}
            onChangeText={setDeductibleUsd}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Non-recoverable depreciation (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., 500"
            placeholderTextColor={theme.textSecondary}
            value={nonRecoverableDepreciationUsd}
            onChangeText={setNonRecoverableDepreciationUsd}
            keyboardType="numeric"
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Visible Issues (comma-separated) *
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="e.g., Missing shingles, Water stains, Sagging areas"
            placeholderTextColor={theme.textSecondary}
            value={visibleIssues}
            onChangeText={setVisibleIssues}
            multiline
            numberOfLines={4}
            editable={!isLoading}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.label, { color: theme.text }]}>
            Additional Notes
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              {
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
                color: theme.text,
              },
            ]}
            placeholder="Any additional information..."
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            editable={!isLoading}
          />
        </View>

        {error ? (
          <View style={[styles.errorBox, { borderColor: AppColors.error }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.generateButton, isLoading && styles.disabledButton]}
          onPress={handleGenerateReport}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <Text
              style={[styles.generateButtonText, { color: theme.buttonText }]}
            >
              Generate AI Report
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentPad: {
    padding: Spacing.lg,
    paddingBottom: Spacing["4xl"],
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing["2xl"],
    gap: Spacing.lg,
  },
  errorInline: {
    color: AppColors.error,
    textAlign: "center",
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  formDescription: {
    fontSize: 14,
    marginBottom: Spacing.xl,
  },
  modeTabs: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  modeTabButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(128,128,128,0.35)",
    borderRadius: BorderRadius.xs,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    backgroundColor: "rgba(128,128,128,0.08)",
  },
  modeTabButtonActive: {
    borderColor: AppColors.primary,
    backgroundColor: "rgba(212, 175, 55, 0.16)",
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  modeTabTextActive: {
    color: AppColors.primary,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  mapPanel: {
    minHeight: 260,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    overflow: "hidden",
    marginTop: Spacing.sm,
  },
  mapSelectionCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    fontSize: 14,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 100,
  },
  typeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  typeButton: {
    width: "48%",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  typeButtonActive: {
    borderColor: AppColors.primary,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  typeButtonTextActive: {
    color: AppColors.primary,
  },
  generateButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
  generateButtonText: {
    fontWeight: "600",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderRadius: BorderRadius.xs,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: AppColors.error,
    fontSize: 13,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: Spacing.xl,
  },
  reportSection: {
    marginBottom: Spacing["2xl"],
    paddingBottom: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(128,128,128,0.35)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: Spacing["2xl"],
    gap: Spacing.md,
  },
  exportButton: {
    flex: 1,
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  newReportButton: {
    flex: 1,
    backgroundColor: AppColors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xs,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
});

export default RoofReportScreen;
