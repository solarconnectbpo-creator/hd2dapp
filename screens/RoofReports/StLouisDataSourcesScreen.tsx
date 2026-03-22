import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import {
  ESRI_WORLD_IMAGERY_TILES,
  NOAA_NWS_LSR_MAPSERVER,
  ST_LOUIS_DATA_SOURCE_CATALOG,
} from "@/constants/stlDataSources";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import {
  fetchIemLsrGeoJson,
  fetchNwsActiveAlertsAtPoint,
  fetchSpcDay1Outlook,
  fetchStlIntelAtPoint,
} from "@/services/stlIntelClient";

type Props = NativeStackScreenProps<
  ReportsStackParamList,
  "StLouisDataSources"
>;

const MONO_FONT = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

function geoJsonFeatureCount(data: unknown): number {
  if (
    data &&
    typeof data === "object" &&
    "features" in data &&
    Array.isArray((data as { features: unknown }).features)
  ) {
    return (data as { features: unknown[] }).features.length;
  }
  return 0;
}

export default function StLouisDataSourcesScreen({ route }: Props) {
  const { theme } = useTheme();
  const initialLat = route.params?.latitude;
  const initialLng = route.params?.longitude;
  const [lat, setLat] = useState(
    typeof initialLat === "number" && Number.isFinite(initialLat)
      ? String(initialLat)
      : "38.6270",
  );
  const [lng, setLng] = useState(
    typeof initialLng === "number" && Number.isFinite(initialLng)
      ? String(initialLng)
      : "-90.1994",
  );
  const [nearM, setNearM] = useState("75");
  const [busy, setBusy] = useState<"gis" | "wx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gisJson, setGisJson] = useState<string>("");
  const [wxJson, setWxJson] = useState<string>("");

  useEffect(() => {
    const la = route.params?.latitude;
    const ln = route.params?.longitude;
    if (typeof la === "number" && Number.isFinite(la)) setLat(String(la));
    if (typeof ln === "number" && Number.isFinite(ln)) setLng(String(ln));
  }, [route.params?.latitude, route.params?.longitude]);

  const inputStyle = useMemo(
    () => [
      styles.input,
      {
        borderColor: theme.border,
        color: theme.text,
        backgroundColor: theme.cardBackground,
      },
    ],
    [theme],
  );

  const parseCoords = useCallback(() => {
    const la = Number(lat.replace(",", ".").trim());
    const ln = Number(lng.replace(",", ".").trim());
    const nm = Math.max(10, Number(nearM) || 75);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) {
      throw new Error("Enter valid latitude and longitude.");
    }
    return { la, ln, nm };
  }, [lat, lng, nearM]);

  const loadGis = async () => {
    setError(null);
    setBusy("gis");
    try {
      const { la, ln, nm } = parseCoords();
      const bundle = await fetchStlIntelAtPoint(la, ln, { nearMeters: nm });
      setGisJson(JSON.stringify(bundle, null, 2));
    } catch (e) {
      setGisJson("");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const loadWx = async () => {
    setError(null);
    setBusy("wx");
    try {
      const { la, ln } = parseCoords();
      const [iem, nws, spc] = await Promise.all([
        fetchIemLsrGeoJson(336),
        fetchNwsActiveAlertsAtPoint(la, ln),
        fetchSpcDay1Outlook(),
      ]);
      const summary = {
        iemLsrHours: 336,
        iemLsrFeatureCount: geoJsonFeatureCount(iem),
        nwsActiveAlertFeatureCount: geoJsonFeatureCount(nws),
        spcDay1FeatureCount: geoJsonFeatureCount(spc),
        nwsAlertsSample: nws,
        spcDay1Sample: spc,
        note: "IEM response can be large; counts shown. Full IEM GeoJSON omitted here.",
      };
      setWxJson(JSON.stringify(summary, null, 2));
    } catch (e) {
      setWxJson("");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="body" style={styles.lead}>
          Public St. Louis GIS layers (maps8 / assessor) and regional storm data
          (IEM, NWS, SPC). Esri World Imagery is a tile URL for map basemaps —
          add as a raster source in your map style.
        </ThemedText>

        <ThemedText type="small" style={styles.label}>
          Latitude / longitude (WGS84)
        </ThemedText>
        <TextInput
          value={lat}
          onChangeText={setLat}
          keyboardType="numbers-and-punctuation"
          placeholder="38.6270"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
        <TextInput
          value={lng}
          onChangeText={setLng}
          keyboardType="numbers-and-punctuation"
          placeholder="-90.1994"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />
        <ThemedText type="small" style={styles.label}>
          Search radius for point layers (meters)
        </ThemedText>
        <TextInput
          value={nearM}
          onChangeText={setNearM}
          keyboardType="numeric"
          placeholder="75"
          placeholderTextColor={theme.textSecondary}
          style={inputStyle}
        />

        <View style={styles.row}>
          <Button
            onPress={() => void loadGis()}
            style={styles.half}
            disabled={busy !== null}
          >
            {busy === "gis" ? "Loading…" : "Parcel & permits at point"}
          </Button>
        </View>
        <View style={styles.row}>
          <Button
            variant="secondary"
            onPress={() => void loadWx()}
            style={styles.half}
            disabled={busy !== null}
          >
            {busy === "wx" ? "Loading…" : "Storm & alerts (summary)"}
          </Button>
        </View>

        {busy ? (
          <ActivityIndicator
            color={AppColors.primary}
            style={{ marginTop: 8 }}
          />
        ) : null}

        {error ? (
          <ThemedText type="small" style={styles.err}>
            {error}
          </ThemedText>
        ) : null}

        {gisJson ? (
          <>
            <ThemedText type="small" style={styles.sectionTitle}>
              GIS bundle (JSON)
            </ThemedText>
            <ThemedText type="caption" style={styles.mono}>
              {gisJson}
            </ThemedText>
          </>
        ) : null}

        {wxJson ? (
          <>
            <ThemedText type="small" style={styles.sectionTitle}>
              Weather bundle (summary JSON)
            </ThemedText>
            <ThemedText type="caption" style={styles.mono}>
              {wxJson}
            </ThemedText>
          </>
        ) : null}

        <ThemedText
          type="small"
          style={[styles.sectionTitle, { marginTop: 18 }]}
        >
          Source catalog
        </ThemedText>
        {ST_LOUIS_DATA_SOURCE_CATALOG.map((s) => (
          <View key={s.id} style={[styles.card, { borderColor: theme.border }]}>
            <ThemedText type="h4" style={styles.cardTitle}>
              {s.title}
            </ThemedText>
            <ThemedText type="caption" style={styles.cardDesc}>
              {s.description}
            </ThemedText>
            <ThemedText type="caption" style={styles.endpoint}>
              {s.endpoint}
            </ThemedText>
            {s.notes ? (
              <ThemedText type="caption" style={styles.notes}>
                {s.notes}
              </ThemedText>
            ) : null}
          </View>
        ))}

        <ThemedText
          type="small"
          style={[styles.sectionTitle, { marginTop: 12 }]}
        >
          Reference endpoints (not in catalog rows)
        </ThemedText>
        <ThemedText type="caption" style={styles.endpoint}>
          NOAA LSR MapServer: {NOAA_NWS_LSR_MAPSERVER}
        </ThemedText>
        <ThemedText type="caption" style={styles.endpoint}>
          Esri World Imagery tiles: {ESRI_WORLD_IMAGERY_TILES}
        </ThemedText>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: 10 },
  lead: { lineHeight: 22, marginBottom: 6, opacity: 0.95 },
  label: { marginTop: 6, opacity: 0.85 },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  row: { marginTop: 4 },
  half: { width: "100%" },
  err: { color: "#c62828", marginTop: 6 },
  sectionTitle: { marginTop: 14, fontWeight: "700" },
  mono: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.92,
  },
  card: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: 12,
    gap: 4,
  },
  cardTitle: { fontSize: 15 },
  cardDesc: { opacity: 0.88, lineHeight: 18 },
  endpoint: { opacity: 0.75, fontSize: 11, lineHeight: 16 },
  notes: { opacity: 0.8, fontStyle: "italic", marginTop: 4 },
});
