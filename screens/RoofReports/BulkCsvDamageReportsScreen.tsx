import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { parsePropertyLeadsCsvText } from "@/src/roofReports/parsePropertyLeadsCsv";
import { persistBulkDamageReportsFromLeads } from "@/src/roofReports/bulkPersistDamageReportsFromLeads";
import { saveRoofLeads } from "@/src/roofReports/roofLeadsStorage";
import { exportBulkRoofReportsHtml } from "@/src/roofReports/exportRoofReport";
import {
  BULK_LEADS_CSV_TEMPLATE,
  bulkExportDamageReports,
  exportBulkEstimatesCsvOnly,
} from "@/src/roofReports/bulkEstimateManifestExport";
import type {
  DamageRoofReport,
  PropertySelection,
} from "@/src/roofReports/roofReportTypes";

type Props = NativeStackScreenProps<
  ReportsStackParamList,
  "BulkCsvDamageReports"
>;

export default function BulkCsvDamageReportsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [leads, setLeads] = useState<PropertySelection[]>([]);
  const [csvHint, setCsvHint] = useState("");
  const [companyFallback, setCompanyFallback] = useState("Cox Roofing");
  const [inspectorDefault, setInspectorDefault] = useState("Seth");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPackage, setExportingPackage] = useState(false);
  const [exportingEstimatesCsv, setExportingEstimatesCsv] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<DamageRoofReport[] | null>(
    null,
  );
  const [generationProgress, setGenerationProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  const createdBy = useMemo(
    () =>
      user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            userType: user.userType as "sales_rep" | "company" | "admin",
          }
        : undefined,
    [user],
  );

  const handlePickCsv = async () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "CSV upload",
        "CSV upload is supported in the web build. For mobile, use the Expo web target or transfer leads via the map picker.",
      );
      return;
    }

    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,text/csv";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const text = await file.text();
        const { leads: parsed, warnings } = parsePropertyLeadsCsvText(text);
        if (!parsed.length) {
          Alert.alert(
            "CSV import failed",
            warnings[0] || "No valid rows found.",
          );
          return;
        }
        setLeads(parsed);
        setCsvHint(`Loaded ${parsed.length} rows`);
        setLastGenerated(null);
        try {
          await saveRoofLeads(parsed);
        } catch (e) {
          console.error(e);
        }

        setGenerating(true);
        setGenerationProgress({ done: 0, total: parsed.length });
        try {
          const { reports, compact } = await persistBulkDamageReportsFromLeads(
            parsed,
            {
              companyNameFallback: companyFallback.trim() || undefined,
              inspectorName: inspectorDefault.trim() || "Seth",
              createdBy,
              onProgress: (done, total) =>
                setGenerationProgress({ done, total }),
            },
          );
          setLastGenerated(reports);
          const baseMsg = compact
            ? `Created ${reports.length} AI damage reports (compact mode: no satellite image per row to fit storage). Open Roof Reports to review.`
            : `Created ${reports.length} AI damage reports. Open Roof Reports or export HTML below.`;
          Alert.alert(
            "Contacts imported",
            warnings.length ? `${baseMsg}\n\nNote: ${warnings[0]}` : baseMsg,
          );
          setCsvHint(
            `Loaded ${parsed.length} rows · ${reports.length} reports saved`,
          );
        } catch (e) {
          console.error(e);
          const msg = e instanceof Error ? e.message : String(e);
          const quota =
            (typeof DOMException !== "undefined" &&
              e instanceof DOMException &&
              e.name === "QuotaExceededError") ||
            /quota|exceeded|5mb/i.test(msg);
          Alert.alert(
            quota ? "Storage full" : "Could not save reports",
            quota
              ? `Browser storage is often limited to ~5MB. Try fewer rows or delete old reports. ${msg}`
              : msg,
          );
          if (warnings.length) {
            Alert.alert("CSV note", warnings[0]);
          }
        } finally {
          setGenerating(false);
          setGenerationProgress(null);
        }
      };
      input.click();
    } catch (e) {
      console.error(e);
      Alert.alert("CSV import failed", "Could not read the CSV file.");
    }
  };

  const runPersistCurrentLeads = useCallback(async () => {
    if (!leads.length) return;
    setGenerating(true);
    setGenerationProgress({ done: 0, total: leads.length });
    try {
      const { reports, compact } = await persistBulkDamageReportsFromLeads(
        leads,
        {
          companyNameFallback: companyFallback.trim() || undefined,
          inspectorName: inspectorDefault.trim() || "Seth",
          createdBy,
          onProgress: (done, total) => setGenerationProgress({ done, total }),
        },
      );
      setLastGenerated(reports);
      const regMsg = compact
        ? `Generated ${reports.length} damage reports (compact mode: no satellite preview image per row to fit browser storage). Open Roof Reports to review.`
        : `Generated ${reports.length} damage reports. You can open them from Roof Reports or export below.`;
      Alert.alert(
        "Reports created",
        `${regMsg}\n\nExport now?`,
        [
          { text: "Later", style: "cancel" },
          {
            text: "Estimates CSV only",
            onPress: () => {
              void (async () => {
                setExportingEstimatesCsv(true);
                try {
                  await exportBulkEstimatesCsvOnly(reports);
                  Alert.alert(
                    "Export",
                    Platform.OS === "web"
                      ? "Downloaded bulk-estimates CSV (contacts + estimate columns). No HTML files."
                      : "Shared bulk-estimates CSV with contacts and estimate columns.",
                  );
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  Alert.alert("Export failed", msg);
                  console.error(e);
                } finally {
                  setExportingEstimatesCsv(false);
                }
              })();
            },
          },
          {
            text: "Manifest + HTML",
            onPress: () => {
              void (async () => {
                setExportingPackage(true);
                try {
                  await bulkExportDamageReports(reports);
                  Alert.alert(
                    "Bulk export",
                    Platform.OS === "web"
                      ? "Downloaded one ZIP: manifest CSV plus each HTML report."
                      : "Manifest CSV shared, then each HTML via share sheet.",
                  );
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  Alert.alert("Export failed", msg);
                  console.error(e);
                } finally {
                  setExportingPackage(false);
                }
              })();
            },
          },
        ],
      );
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      const quota =
        (typeof DOMException !== "undefined" &&
          e instanceof DOMException &&
          e.name === "QuotaExceededError") ||
        /quota|exceeded|5mb/i.test(msg);
      Alert.alert(
        quota ? "Storage full" : "Bulk generation failed",
        quota
          ? `Browser storage is usually limited to about 5MB. Try fewer rows, or use Export HTML in smaller batches. Details: ${msg}`
          : msg,
      );
    } finally {
      setGenerating(false);
      setGenerationProgress(null);
    }
  }, [leads, companyFallback, inspectorDefault, createdBy]);

  const generateReports = useCallback(async () => {
    if (!leads.length) {
      Alert.alert("No contacts", "Upload a CSV first.");
      return;
    }
    if (lastGenerated?.length) {
      Alert.alert(
        "Generate again?",
        "Reports were already created for this list (including after upload). This adds another full set of reports.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add another set",
            style: "destructive",
            onPress: () => void runPersistCurrentLeads(),
          },
        ],
      );
      return;
    }
    await runPersistCurrentLeads();
  }, [leads, lastGenerated?.length, runPersistCurrentLeads]);

  const downloadImportTemplate = () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "Template",
        "Download the template from the web build, or copy columns: lat,lng,address,homeowner_name,email,phone,company,company_phone,company_email,inspector_name,roof_sqft,roof_type",
      );
      return;
    }
    try {
      const { downloadTextFileWebSync } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("@/src/utils/shareTextFile.web") as typeof import("@/src/utils/shareTextFile.web");
      const r = downloadTextFileWebSync(
        "bulk-leads-import-template.csv",
        BULK_LEADS_CSV_TEMPLATE,
        "text/csv;charset=utf-8",
      );
      if (!r.ok) throw new Error(r.error);
      Alert.alert("Template", "Saved bulk-leads-import-template.csv");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Download failed", msg);
    }
  };

  const exportManifestAndHtml = async () => {
    const list = lastGenerated ?? [];
    if (!list.length) {
      Alert.alert("Nothing to export", "Generate reports first.");
      return;
    }
    setExportingPackage(true);
    try {
      await bulkExportDamageReports(list);
      Alert.alert(
        "Bulk export",
        Platform.OS === "web"
          ? "Downloaded one ZIP with manifest CSV + HTML reports (columns match filenames)."
          : "Manifest CSV shared, then each HTML report.",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Export failed", msg);
      console.error(e);
    } finally {
      setExportingPackage(false);
    }
  };

  const exportEstimatesCsvOnly = async () => {
    const list = lastGenerated ?? [];
    if (!list.length) {
      Alert.alert("Nothing to export", "Generate reports first.");
      return;
    }
    setExportingEstimatesCsv(true);
    try {
      await exportBulkEstimatesCsvOnly(list);
      Alert.alert(
        "Export",
        Platform.OS === "web"
          ? "Downloaded bulk-estimates CSV. Open in Excel or Sheets for sorting and filtering."
          : "Shared bulk-estimates CSV with contacts and estimate columns.",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Export failed", msg);
      console.error(e);
    } finally {
      setExportingEstimatesCsv(false);
    }
  };

  const exportAllHtml = async () => {
    const list = lastGenerated ?? [];
    if (!list.length) {
      Alert.alert("Nothing to export", "Generate reports first.");
      return;
    }
    if (Platform.OS === "web") {
      try {
        await exportBulkRoofReportsHtml(list);
        Alert.alert(
          "Export",
          "Downloaded a ZIP with all HTML reports (or a single HTML if only one). Check your Downloads folder.",
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Export failed.";
        Alert.alert("Export failed", msg);
        console.error(e);
      }
      return;
    }
    setExporting(true);
    try {
      await exportBulkRoofReportsHtml(list);
      Alert.alert(
        "Export",
        "Each report was opened in the share sheet. Save or share each file, or use Preview → Export for a single report.",
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Export failed.";
      Alert.alert("Export failed", msg);
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  const inputStyle = [
    styles.textInput,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.backgroundSecondary,
    },
  ];

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Feather name="upload-cloud" size={20} color="#fff" />
        </View>
        <ThemedText type="h2" style={styles.headerTitle}>
          Bulk CSV → estimates for contacts
        </ThemedText>
      </View>

      <ThemedText type="caption" style={styles.lead}>
        Upload a contact list (lat/lng, address, homeowner + company contact
        fields). Each row becomes a damage + estimate report with Cox Roofing
        branding (bundled logo) and inspector name (default Seth). Export a
        manifest CSV plus matching HTML files for organized outreach, or export
        a single estimates spreadsheet (CSV only) without HTML.
      </ThemedText>

      <Card style={styles.card}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Default company on report
        </ThemedText>
        <ThemedText type="caption" style={styles.helper}>
          Used when a row has no company column. CSV rows can still override
          with company or company_name columns.
        </ThemedText>
        <TextInput
          value={companyFallback}
          onChangeText={setCompanyFallback}
          placeholder="e.g. Cox Roofing"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
      </Card>

      <Card style={styles.card}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          1. Upload CSV
        </ThemedText>
        <TextInput
          value={csvHint}
          editable={false}
          placeholder="No file loaded"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
        <View style={{ height: 10 }} />
        <Button onPress={() => void handlePickCsv()} style={styles.btn}>
          Choose CSV file
        </Button>
        <ThemedText type="caption" style={styles.helper}>
          Required: lat/lng + optional address, name, company, email, phone,
          roof_sqft, roof_type (same as map picker import).
        </ThemedText>
      </Card>

      <Card style={styles.card}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          2. Preview ({leads.length} rows)
        </ThemedText>
        {leads.length === 0 ? (
          <ThemedText type="small" style={styles.muted}>
            No rows yet.
          </ThemedText>
        ) : (
          leads.slice(0, 12).map((l, idx) => (
            <View key={`${l.lat}-${l.lng}-${idx}`} style={styles.previewRow}>
              <ThemedText type="small" style={styles.previewLine}>
                {l.homeownerName || "—"} · {l.companyName || "—"}
              </ThemedText>
              <ThemedText type="caption" style={styles.previewAddr}>
                {l.address}
              </ThemedText>
            </View>
          ))
        )}
        {leads.length > 12 ? (
          <ThemedText type="caption" style={styles.muted}>
            …and {leads.length - 12} more
          </ThemedText>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          3. Generate again & export
        </ThemedText>
        <ThemedText type="caption" style={styles.helper}>
          Reports are created automatically when you upload a CSV (step 1). Use
          the button below only if you need a second copy of the same list.
        </ThemedText>
        <Button
          onPress={() => void generateReports()}
          disabled={generating || !leads.length}
          style={styles.btn}
        >
          {generating ? "Generating…" : "Generate damage reports again"}
        </Button>
        {generationProgress ? (
          <ThemedText type="caption" style={styles.progressText}>
            Saving {generationProgress.done} / {generationProgress.total}… Large
            lists use batched storage (not one row at a time).
          </ThemedText>
        ) : null}
        {generating ? (
          <ActivityIndicator
            color={AppColors.primary}
            style={{ marginTop: 10 }}
          />
        ) : null}
        <View style={{ height: 12 }} />
        <Button
          variant="secondary"
          onPress={() => void exportAllHtml()}
          disabled={
            exporting ||
            exportingEstimatesCsv ||
            exportingPackage ||
            !lastGenerated?.length
          }
          style={styles.btn}
        >
          {exporting
            ? Platform.OS === "web"
              ? "Downloading…"
              : "Exporting…"
            : "Export all as HTML"}
        </Button>
        <ThemedText type="caption" style={styles.helper}>
          On web: one ZIP with all HTML files (or one HTML if only one report).
          On mobile, the share sheet opens for each file. Reports stay saved
          under Roof Reports. Very large jobs use compact reports and batched
          saves.
        </ThemedText>
        <View style={{ height: 12 }} />
        <Button
          variant="secondary"
          onPress={() => void exportEstimatesCsvOnly()}
          disabled={
            exportingEstimatesCsv ||
            exporting ||
            exportingPackage ||
            !lastGenerated?.length
          }
          style={styles.btn}
        >
          {exportingEstimatesCsv
            ? "Exporting…"
            : "Export estimates CSV only"}
        </Button>
        <ThemedText type="caption" style={styles.helper}>
          One spreadsheet: contacts, roof area, damage estimate range, optional
          EagleView / non-roof columns, and the matching HTML filename for
          reference—no report files downloaded.
        </ThemedText>
        <View style={{ height: 12 }} />
        <Button
          variant="secondary"
          onPress={() => void exportManifestAndHtml()}
          disabled={
            exportingPackage ||
            exportingEstimatesCsv ||
            exporting ||
            !lastGenerated?.length
          }
          style={styles.btn}
        >
          {exportingPackage
            ? "Exporting package…"
            : "Export manifest CSV + all HTML (organized)"}
        </Button>
        <ThemedText type="caption" style={styles.helper}>
          Web: one ZIP containing the manifest CSV plus each HTML report (same
          filenames as the spreadsheet column). Use the manifest to match rows
          to files. Native: manifest first, then each HTML via the share sheet.
        </ThemedText>
      </Card>

      <Button
        variant="secondary"
        onPress={() => navigation.navigate("ReportsHome")}
        style={styles.btn}
      >
        Back to Roof Reports
      </Button>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: Spacing.sm,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1 },
  lead: { opacity: 0.88, marginBottom: Spacing.lg, lineHeight: 20 },
  card: { marginBottom: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.sm },
  helper: { opacity: 0.85, marginTop: 8, lineHeight: 18 },
  muted: { opacity: 0.75 },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 8,
  },
  btn: { marginTop: 4 },
  progressText: { marginTop: 10, lineHeight: 18, opacity: 0.9 },
  previewRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  previewLine: { fontWeight: "600" },
  previewAddr: { opacity: 0.85, marginTop: 4 },
});
