import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ScreenKeyboardAwareScrollView } from "@/components/ScreenKeyboardAwareScrollView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, BorderRadius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { createProductionMeasurementServiceFromEnv } from "@/app/services/ProductionMeasurementService";
import type {
  HybridMeasurementPriority,
  HybridMeasurementResult,
} from "@/app/services/HybridMeasurementService";
import { buildRoofPrecisionMeasurementSnapshot } from "@/src/roofReports/roofPrecisionMeasurement";

type Props = NativeStackScreenProps<
  ReportsStackParamList,
  "PrecisionMeasurement"
>;

const PRIORITIES: HybridMeasurementPriority[] = ["accuracy", "speed", "cost"];

function PrecisionMeasurementScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const p = route.params;

  const [address, setAddress] = useState(p?.address ?? "");
  const [city, setCity] = useState(p?.city ?? "");
  const [state, setState] = useState(p?.state ?? "");
  const [zipCode, setZipCode] = useState(p?.zipCode ?? "");
  const [latitude, setLatitude] = useState(
    p?.latitude != null ? String(p.latitude) : "",
  );
  const [longitude, setLongitude] = useState(
    p?.longitude != null ? String(p.longitude) : "",
  );
  const [priority, setPriority] =
    useState<HybridMeasurementPriority>("accuracy");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HybridMeasurementResult | null>(null);

  useEffect(() => {
    const r = route.params;
    if (!r) return;
    if (r.address !== undefined) setAddress(r.address);
    if (r.city !== undefined) setCity(r.city);
    if (r.state !== undefined) setState(r.state);
    if (r.zipCode !== undefined) setZipCode(r.zipCode);
    if (r.latitude !== undefined) setLatitude(String(r.latitude));
    if (r.longitude !== undefined) setLongitude(String(r.longitude));
  }, [route.params]);

  const inputStyle = [
    styles.textInput,
    {
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.backgroundSecondary,
    },
  ];

  const runMeasurement = useCallback(async () => {
    const lat = Number(latitude.trim());
    const lng = Number(longitude.trim());
    setResult(null);
    setLoading(true);
    try {
      const svc = createProductionMeasurementServiceFromEnv();
      const out = await svc.measure({
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim(),
        latitude: lat,
        longitude: lng,
        priority,
        referenceId: `precision-${Date.now()}`,
      });
      setResult(out);
      if (!out.success) {
        Alert.alert(
          "Measurement incomplete",
          out.errorMessage ?? "Check configuration and try again.",
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Measurement failed", msg);
      setResult({
        success: false,
        data: null,
        provider: "fallback",
        confidence: 0,
        errorMessage: msg,
        retryCount: 0,
        processingTimeMs: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [address, city, state, zipCode, latitude, longitude, priority]);

  const applyToDamageReport = useCallback(() => {
    const ret = route.params?.returnToDamageReport;
    if (!result || !ret) return;
    const lat = Number(latitude.trim());
    const lng = Number(longitude.trim());
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      Alert.alert("Coordinates", "Enter valid latitude and longitude.");
      return;
    }
    const snap = buildRoofPrecisionMeasurementSnapshot(result, {
      priority,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zipCode: zipCode.trim(),
      latitude: lat,
      longitude: lng,
    });
    navigation.navigate("CreateDamageRoofReport", {
      property: ret.property,
      mode: ret.mode ?? "full",
      autoBuildReport: ret.autoBuildReport,
      appliedPrecisionMeasurement: snap,
    });
  }, [
    result,
    route.params?.returnToDamageReport,
    navigation,
    priority,
    address,
    city,
    state,
    zipCode,
    latitude,
    longitude,
  ]);

  return (
    <ScreenKeyboardAwareScrollView
      style={[styles.screen, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Feather name="crosshair" size={20} color="#fff" />
        </View>
        <ThemedText type="h2" style={styles.headerTitle}>
          Precision measurement
        </ThemedText>
      </View>

      <ThemedText type="caption" style={styles.lead}>
        Runs Roof3D / Nearmap / EagleView orchestration via{" "}
        <ThemedText type="caption" style={{ fontWeight: "700" }}>
          ProductionMeasurementService
        </ThemedText>{" "}
        (backend proxy preferred). Configure env vars or allow client fallback
        for development.
      </ThemedText>

      <Card style={styles.card}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Property
        </ThemedText>
        <ThemedText type="small" style={styles.label}>
          Street address
        </ThemedText>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="123 Main St"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <ThemedText type="small" style={styles.label}>
              City
            </ThemedText>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={theme.textSecondary}
              style={inputStyle}
            />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={[styles.rowItem, { maxWidth: 88 }]}>
            <ThemedText type="small" style={styles.label}>
              State
            </ThemedText>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="MO"
              placeholderTextColor={theme.textSecondary}
              style={inputStyle}
              autoCapitalize="characters"
            />
          </View>
        </View>
        <ThemedText type="small" style={styles.label}>
          ZIP
        </ThemedText>
        <TextInput
          value={zipCode}
          onChangeText={setZipCode}
          placeholder="63101"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <ThemedText type="small" style={styles.label}>
              Latitude
            </ThemedText>
            <TextInput
              value={latitude}
              onChangeText={setLatitude}
              placeholder="38.6270"
              placeholderTextColor={theme.textSecondary}
              style={inputStyle}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={{ width: Spacing.sm }} />
          <View style={styles.rowItem}>
            <ThemedText type="small" style={styles.label}>
              Longitude
            </ThemedText>
            <TextInput
              value={longitude}
              onChangeText={setLongitude}
              placeholder="-90.1994"
              placeholderTextColor={theme.textSecondary}
              style={inputStyle}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Priority
        </ThemedText>
        <View style={styles.chips}>
          {PRIORITIES.map((pr) => {
            const selected = priority === pr;
            return (
              <Pressable
                key={pr}
                onPress={() => setPriority(pr)}
                style={[
                  styles.chip,
                  selected ? styles.chipSelected : styles.chipIdle,
                ]}
              >
                <ThemedText
                  type="caption"
                  style={
                    selected ? styles.chipTextSelected : styles.chipTextIdle
                  }
                >
                  {pr}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button
        onPress={runMeasurement}
        disabled={loading}
        style={styles.primaryBtn}
      >
        {loading ? "Running…" : "Run precision measurement"}
      </Button>

      {loading ? (
        <ActivityIndicator
          color={AppColors.primary}
          style={{ marginTop: Spacing.md }}
        />
      ) : null}

      {result ? (
        <Card style={styles.card}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Result
          </ThemedText>
          <ThemedText type="small" style={styles.resultLine}>
            Success: {result.success ? "yes" : "no"}
          </ThemedText>
          <ThemedText type="small" style={styles.resultLine}>
            Provider: {result.provider}
          </ThemedText>
          <ThemedText type="small" style={styles.resultLine}>
            Confidence: {(result.confidence * 100).toFixed(0)}%
          </ThemedText>
          <ThemedText type="small" style={styles.resultLine}>
            Time: {result.processingTimeMs} ms
          </ThemedText>
          {result.data ? (
            <>
              <ThemedText type="caption" style={styles.resultBlock}>
                Tile z/x/y: {result.data.tile.z} / {result.data.tile.x} /{" "}
                {result.data.tile.y}
              </ThemedText>
              {result.data.nearmapSurveyIds.length ? (
                <ThemedText type="caption" style={styles.resultBlock}>
                  Nearmap survey IDs:{" "}
                  {result.data.nearmapSurveyIds.slice(0, 5).join(", ")}
                  {result.data.nearmapSurveyIds.length > 5 ? "…" : ""}
                </ThemedText>
              ) : null}
              {result.data.eagleViewOrderId ? (
                <ThemedText type="caption" style={styles.resultBlock}>
                  EagleView order: {result.data.eagleViewOrderId}
                  {result.data.eagleViewStatus
                    ? ` (${result.data.eagleViewStatus})`
                    : ""}
                </ThemedText>
              ) : null}
              {result.data.roofAreaSqFt != null ? (
                <ThemedText type="caption" style={styles.resultBlock}>
                  Roof area: {Math.round(result.data.roofAreaSqFt).toLocaleString()} sq ft
                </ThemedText>
              ) : null}
              {result.data.roofPerimeterFt != null ? (
                <ThemedText type="caption" style={styles.resultBlock}>
                  Roof perimeter: {Math.round(result.data.roofPerimeterFt).toLocaleString()} ft
                </ThemedText>
              ) : null}
              {result.data.roofPitch ? (
                <ThemedText type="caption" style={styles.resultBlock}>
                  Roof pitch: {result.data.roofPitch}
                </ThemedText>
              ) : null}
            </>
          ) : null}
          {result.errorMessage ? (
            <ThemedText type="caption" style={styles.errorText}>
              {result.errorMessage}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {result && route.params?.returnToDamageReport ? (
        <Card style={styles.card}>
          <ThemedText type="caption" style={styles.applyLead}>
            Return merges this run into the open damage report (measurements +
            notes).
          </ThemedText>
          <Button onPress={applyToDamageReport} style={styles.primaryBtn}>
            Apply to damage report
          </Button>
        </Card>
      ) : null}
    </ScreenKeyboardAwareScrollView>
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
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { flex: 1 },
  lead: { opacity: 0.88, marginBottom: Spacing.lg, lineHeight: 20 },
  card: { marginBottom: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.sm },
  label: { opacity: 0.85, marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  row: { flexDirection: "row" },
  rowItem: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipIdle: {
    borderColor: "#64748b",
    backgroundColor: "transparent",
  },
  chipSelected: {
    borderColor: AppColors.primary,
    backgroundColor: AppColors.primary,
  },
  chipTextIdle: { color: "#334155" },
  chipTextSelected: { color: "#fff", fontWeight: "700" },
  primaryBtn: { marginTop: Spacing.xs },
  resultLine: { marginBottom: 4 },
  resultBlock: { marginTop: 8, lineHeight: 18, opacity: 0.95 },
  errorText: {
    marginTop: Spacing.sm,
    color: "#dc2626",
    fontWeight: "600",
    lineHeight: 18,
  },
  applyLead: {
    opacity: 0.88,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
});

export default PrecisionMeasurementScreen;
export { PrecisionMeasurementScreen };
