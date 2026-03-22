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
  const [visibleIssues, setVisibleIssues] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(true);

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
    if (!Number.isFinite(age) || age < 0) {
      Alert.alert("Error", "Please enter a valid roof age");
      return;
    }
    if (!Number.isFinite(sqft) || sqft <= 0) {
      Alert.alert("Error", "Please enter valid square footage");
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
      roofAge: age,
      roofType,
      squareFootage: sqft,
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
          </View>

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
          Enter roof details to generate a comprehensive AI-powered inspection
          report
        </Text>

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
  formSection: {
    marginBottom: Spacing.xl,
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
