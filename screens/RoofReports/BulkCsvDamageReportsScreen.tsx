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
import { createBulkDamageReportFromLead } from "@/src/roofReports/createBulkDamageReportFromLead";
import { appendRoofReportsBatch } from "@/src/roofReports/roofReportStorage";
import { saveRoofLeads } from "@/src/roofReports/roofLeadsStorage";
import { exportBulkRoofReportsHtml } from "@/src/roofReports/exportRoofReport";
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
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
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
        if (warnings.length) {
          Alert.alert("CSV import finished", warnings[0]);
        }
      };
      input.click();
    } catch (e) {
      console.error(e);
      Alert.alert("CSV import failed", "Could not read the CSV file.");
    }
  };

  const generateReports = useCallback(async () => {
    if (!leads.length) {
      Alert.alert("No contacts", "Upload a CSV first.");
      return;
    }
    setGenerating(true);
    setGenerationProgress({ done: 0, total: leads.length });
    const base = Date.now();
    const out: DamageRoofReport[] = [];
    /** Fewer storage round-trips; avoids O(n²) reload+rewrite per row. */
    const BATCH_SIZE = 50;
    /** Omit per-report Mapbox + embedded logo URLs so large jobs stay under ~5MB browser quota. */
    const compact = leads.length >= 80;
    try {
      for (let start = 0; start < leads.length; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, leads.length);
        const batch: DamageRoofReport[] = [];
        for (let i = start; i < end; i++) {
          batch.push(
            createBulkDamageReportFromLead(leads[i], {
              idSeed: base + i,
              companyNameFallback: companyFallback.trim() || undefined,
              createdBy,
              compact,
            }),
          );
        }
        await appendRoofReportsBatch(batch);
        out.push(...batch);
        setGenerationProgress({ done: end, total: leads.length });
      }
      setLastGenerated(out);
      Alert.alert(
        "Reports created",
        compact
          ? `Generated ${out.length} damage reports (compact mode: no satellite preview image per row to fit browser storage). Open Roof Reports to review.`
          : `Generated ${out.length} damage reports. You can open them from Roof Reports or export HTML below.`,
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
          ? `Browser storage is usually limited to about 5MB. ${out.length} reports were saved before the error. Try fewer rows, or use Export HTML in smaller batches. Details: ${msg}`
          : `${out.length} reports saved before the error: ${msg}`,
      );
    } finally {
      setGenerating(false);
      setGenerationProgress(null);
    }
  }, [leads, companyFallback, createdBy]);

  const exportAllHtml = async () => {
    const list = lastGenerated ?? [];
    if (!list.length) {
      Alert.alert("Nothing to export", "Generate reports first.");
      return;
    }
    if (Platform.OS !== "web") {
      Alert.alert(
        "Export",
        "Bulk HTML download is available on web. On mobile, open each report from Roof Reports → Preview / Export.",
      );
      return;
    }
    setExporting(true);
    try {
      await exportBulkRoofReportsHtml(list);
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
          Bulk CSV → damage reports
        </ThemedText>
      </View>

      <ThemedText type="caption" style={styles.lead}>
        Upload a contact list with columns: latitude, longitude, address,
        contact name, company (optional), and optional roof fields. One damage
        report is created per row with default hail / severity 3 — open any
        report to edit before export.
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
          3. Generate & export
        </ThemedText>
        <Button
          onPress={() => void generateReports()}
          disabled={generating || !leads.length}
          style={styles.btn}
        >
          {generating ? "Generating…" : "Generate damage reports"}
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
          disabled={exporting || !lastGenerated?.length}
          style={styles.btn}
        >
          {exporting ? "Downloading…" : "Export all as HTML (web)"}
        </Button>
        <ThemedText type="caption" style={styles.helper}>
          Export downloads one HTML file per report (browser may ask to allow
          multiple downloads). Reports are also saved under Roof Reports. Very
          large jobs (1000+ rows) use compact reports and batched saves so they
          fit typical browser storage (~5MB).
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
