import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";
import type { PropertySelection } from "@/src/roofReports/roofReportTypes";
import PropertySelectMapComponent from "@/src/roofReports/PropertySelectMap";
import { parsePropertyLeadsCsvText } from "@/src/roofReports/parsePropertyLeadsCsv";
import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import { loadRoofLeads, saveRoofLeads } from "@/src/roofReports/roofLeadsStorage";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { forwardGeocodeNominatim } from "@/src/roofReports/reverseGeocode";
import { findBestMatchingLead, inferRoofTypeIfMissing } from "@/src/roofReports/propertyLeadMatching";

type Props = NativeStackScreenProps<ReportsStackParamList, "PropertyMapPicker">;

export default function PropertyMapPickerScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();
  const [selected, setSelected] = useState<PropertySelection | null>(null);
  const selectedRef = useRef<PropertySelection | null>(null);
  const [importedLeads, setImportedLeads] = useState<PropertySelection[]>([]);
  const [csvInfo, setCsvInfo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<{ lat: number; lng: number; displayName: string }[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [focusRequest, setFocusRequest] = useState<{ lat: number; lng: number; key: number } | undefined>(undefined);
  const [autoBuildReport, setAutoBuildReport] = useState(true);
  const tabBarHeight = useBottomTabBarHeight();

  const identifyRoofType = (p: PropertySelection): PropertySelection => {
    const roofType = p.roofType?.trim() ? p.roofType.trim() : inferRoofTypeIfMissing(p);
    return roofType ? { ...p, roofType } : p;
  };

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return importedLeads;
    return importedLeads.filter((l) => {
      const hay = [
        l.address,
        l.homeownerName,
        l.email,
        l.phone,
        l.roofType,
        l.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [importedLeads, searchQuery]);

  const mapLeads = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return importedLeads;
    return filteredLeads.length > 0 ? filteredLeads : importedLeads;
  }, [importedLeads, filteredLeads, searchQuery]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    // Load previously uploaded CSV leads so the user can continue instantly.
    (async () => {
      try {
        const leads = await loadRoofLeads();
        if (leads.length) {
          setImportedLeads(leads);
          setCsvInfo(`Loaded ${leads.length} saved properties`);
          setSelected(identifyRoofType(leads[0]));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    // Load from the backend DB when possible, but keep local cache fast.
    if (isLoading) return;
    if (!user?.id) return;

    (async () => {
      try {
        const remote = await apiClient.getLeads();

        const mapped: PropertySelection[] = (remote ?? [])
          .map((row: any) => {
            const lat = typeof row.latitude === "number" ? row.latitude : Number(row.latitude);
            const lng = typeof row.longitude === "number" ? row.longitude : Number(row.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            let roofSqFt: number | undefined;
            let roofType: string | undefined;

            const notes = typeof row.notes === "string" ? row.notes : "";
            let homeownerName: string | undefined =
              typeof row.contact_name === "string" && row.contact_name.trim() ? row.contact_name.trim() : undefined;
            let email: string | undefined = typeof row.email === "string" && row.email.trim() ? row.email.trim() : undefined;
            let phone: string | undefined = typeof row.phone === "string" && row.phone.trim() ? row.phone.trim() : undefined;
            if (notes.trim().startsWith("{")) {
              try {
                const parsed = JSON.parse(notes);
                if (typeof parsed.roofSqFt === "number" && Number.isFinite(parsed.roofSqFt)) roofSqFt = parsed.roofSqFt;
                if (typeof parsed.roofType === "string" && parsed.roofType.trim()) roofType = parsed.roofType.trim();
                if (!homeownerName && typeof parsed.homeownerName === "string" && parsed.homeownerName.trim()) {
                  homeownerName = parsed.homeownerName.trim();
                }
                if (!email && typeof parsed.email === "string" && parsed.email.trim()) {
                  email = parsed.email.trim();
                }
                if (!phone && typeof parsed.phone === "string" && parsed.phone.trim()) {
                  phone = parsed.phone.trim();
                }
              } catch {
                // ignore
              }
            }

            return {
              id: undefined,
              address:
                typeof row.location === "string" && row.location.trim()
                  ? row.location.trim()
                  : `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
              lat,
              lng,
              clickedAtIso: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
              homeownerName,
              email,
              phone,
              roofSqFt,
              roofType,
            } as any;
          })
          .filter(Boolean) as PropertySelection[];

        if (mapped.length) {
          setImportedLeads(mapped);
          setCsvInfo(`Loaded ${mapped.length} saved properties (Database)`);

          // If the user already selected something, try to preserve it.
          const current = selectedRef.current;
          if (current) {
            const match = mapped.find(
              (p) =>
                p.lat.toFixed(6) === current.lat.toFixed(6) &&
                p.lng.toFixed(6) === current.lng.toFixed(6) &&
                (p.address ?? "").trim().toLowerCase() === (current.address ?? "").trim().toLowerCase(),
            );
            setSelected(identifyRoofType(match ?? mapped[0]));
          } else {
            setSelected(identifyRoofType(mapped[0]));
          }

          await saveRoofLeads(mapped); // refresh local cache
        }
      } catch (e) {
        console.error("Lead fetch failed:", e);
      }
    })();
  }, [user?.id, isLoading]);

  const mapboxToken =
    Platform.OS === "web" &&
    typeof process !== "undefined" &&
    (process as any)?.env
      ? ((process as any).env.EXPO_PUBLIC_MAPBOX_TOKEN as string | undefined)
      : undefined;

  const handleUploadCsv = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("CSV upload", "CSV upload is supported in the web build only.");
      return;
    }

    try {
      // Create a file picker input (web-only) so we don't need extra native libraries.
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv,text/csv";

      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;

        const text = await file.text();
        const { leads, warnings } = parsePropertyLeadsCsvText(text);

        if (!leads.length) {
          Alert.alert("CSV import failed", warnings[0] || "No valid rows found.");
          return;
        }

        setImportedLeads(leads);
        setCsvInfo(`Imported ${leads.length} properties`);

        // Persist the uploaded CSV so it survives app restarts.
        try {
          await saveRoofLeads(leads);
        } catch (e) {
          console.error(e);
          Alert.alert("Save failed", "Imported leads, but couldn't save them to device storage.");
        }

        // Persist the uploaded CSV into the backend DB as well (so it survives app restarts).
        if (user?.id) {
          try {
            const rowsForBackend = leads.map((l) => ({
              contactName: l.homeownerName || "",
              phone: l.phone || "",
              email: l.email || "",
              industry: "roofing",
              location: l.address,
              leadType: "csv-import",
              // Store roof fields inside notes (so we can restore roof_sqft/roof_type later).
              notes: JSON.stringify({
                roofSqFt: l.roofSqFt ?? null,
                roofType: l.roofType ?? null,
                homeownerName: l.homeownerName ?? null,
                email: l.email ?? null,
                phone: l.phone ?? null,
              }),
              lat: l.lat,
              lng: l.lng,
            }));

            await apiClient.importLeads(rowsForBackend);
          } catch (e) {
            console.error("DB lead import failed:", e);
            Alert.alert("Database save failed", "Leads imported, but couldn't save to the database.");
          }
        }

        if (warnings.length) {
          // Keep the UI calm; show only the first warning.
          Alert.alert("CSV import finished", warnings[0]);
        }

        // Helpful: auto-select first imported lead.
        setSelected(identifyRoofType(leads[0]));
      };

      input.click();
    } catch (e) {
      console.error(e);
      Alert.alert("CSV import failed", "Could not read the CSV file.");
    }
  };

  const handleNext = () => {
    if (!selected) return;
    navigation.navigate("CreateDamageRoofReport", {
      property: selected,
      mode: "full",
      autoBuildReport,
    });
  };

  const handleEstimateOnly = () => {
    if (!selected) return;
    navigation.navigate("CreateDamageRoofReport", {
      property: selected,
      mode: "estimate",
      autoBuildReport,
    });
  };

  const handleAddressSearch = async () => {
    if (Platform.OS !== "web") {
      Alert.alert("Search", "Address search is supported in the web build.");
      return;
    }
    const q = searchQuery.trim();
    if (q.length < 3) {
      Alert.alert("Search", "Enter at least 3 characters to search.");
      return;
    }
    setGeocodeLoading(true);
    try {
      const hits = await forwardGeocodeNominatim(q);
      setGeocodeResults(hits);
      if (!hits.length) Alert.alert("Search", "No addresses found. Try a different query.");
    } catch (e) {
      console.error(e);
      Alert.alert("Search failed", "Could not search addresses. Try again.");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const selectGeocodeHit = (hit: { lat: number; lng: number; displayName: string }) => {
    const base: PropertySelection = {
      address: hit.displayName,
      lat: hit.lat,
      lng: hit.lng,
      clickedAtIso: new Date().toISOString(),
    };
    const merged = findBestMatchingLead(base, importedLeads);
    const next: PropertySelection = merged
      ? {
          ...merged,
          lat: hit.lat,
          lng: hit.lng,
          address: hit.displayName,
          clickedAtIso: new Date().toISOString(),
        }
      : base;
    setSelected(identifyRoofType(next));
    setFocusRequest({ lat: hit.lat, lng: hit.lng, key: Date.now() });
    setGeocodeResults([]);
  };

  const selectLeadFromSearch = (lead: PropertySelection) => {
    setSelected(identifyRoofType({ ...lead, clickedAtIso: new Date().toISOString() }));
    setFocusRequest({ lat: lead.lat, lng: lead.lng, key: Date.now() });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.topOverlay}>
          <Card style={styles.topOverlayCard}>
            <View style={styles.topOverlayRow}>
              <Feather name="upload" size={18} color="#fff" />
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={styles.topOverlayTitle}>
                  Import Properties (CSV)
                </ThemedText>
                <ThemedText type="caption" style={styles.topOverlayHint}>
                  CSV headers: `lat/lng` + optional `address`, `name/homeowner`, `email`, `phone`, `roof_sqft`, `roof_type`. Map needs Mapbox token.
                </ThemedText>
                    {Platform.OS === "web" ? (
                      <ThemedText type="caption" style={styles.topOverlayHint}>
                        Mapbox token: {mapboxToken ? "SET" : "MISSING"}
                      </ThemedText>
                    ) : null}
              </View>

              <View style={{ width: 16 }} />

              <Button onPress={handleUploadCsv} style={styles.uploadButton}>
                Upload CSV
              </Button>
            </View>

            {csvInfo ? (
              <ThemedText type="caption" style={styles.csvInfo}>
                {csvInfo}
              </ThemedText>
            ) : null}
          </Card>

          <View style={{ height: 10 }} />

          <Card style={styles.searchCard}>
            <ThemedText type="small" style={styles.searchTitle}>
              Find property
            </ThemedText>
            <ThemedText type="caption" style={styles.searchHint}>
              Filter imported leads by text, or search a US address (OpenStreetMap).
            </ThemedText>
            <View style={{ height: 8 }} />
            <View style={styles.searchRow}>
              <Feather name="search" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  setGeocodeResults([]);
                }}
                placeholder="Address, owner, email, phone…"
                placeholderTextColor="#64748b"
                style={[styles.searchInput, { color: "#f1f5f9" }]}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleAddressSearch}
              />
            </View>
            <View style={{ height: 8 }} />
            <Button onPress={handleAddressSearch} style={styles.searchButton} disabled={geocodeLoading}>
              {geocodeLoading ? "Searching…" : "Search address (US)"}
            </Button>
            {geocodeLoading ? (
              <View style={styles.geocodeSpinner}>
                <ActivityIndicator color={AppColors.primary} />
              </View>
            ) : null}
            {geocodeResults.length > 0 ? (
              <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {geocodeResults.map((h, i) => (
                  <Pressable
                    key={`${h.lat}_${h.lng}_${i}`}
                    onPress={() => selectGeocodeHit(h)}
                    style={({ pressed }) => [styles.resultRow, pressed ? { opacity: 0.85 } : null]}
                  >
                    <ThemedText type="caption" style={styles.resultText} numberOfLines={2}>
                      {h.displayName}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            {searchQuery.trim() && importedLeads.length > 0 ? (
              <>
                <ThemedText type="caption" style={styles.matchingLabel}>
                  {filteredLeads.length
                    ? `Matching leads (${filteredLeads.length})`
                    : "No lead matches this filter (map still shows all markers)."}
                </ThemedText>
                {filteredLeads.length > 0 ? (
                  <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {filteredLeads.slice(0, 8).map((l, i) => (
                      <Pressable
                        key={`${l.lat}_${l.lng}_${i}`}
                        onPress={() => selectLeadFromSearch(l)}
                        style={({ pressed }) => [styles.resultRow, pressed ? { opacity: 0.85 } : null]}
                      >
                        <ThemedText type="caption" style={styles.resultText} numberOfLines={2}>
                          {l.address}
                          {l.homeownerName ? ` · ${l.homeownerName}` : ""}
                          {l.email ? ` · ${l.email}` : ""}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </>
            ) : null}
          </Card>
        </View>

      <View style={styles.mapWrap}>
        <PropertySelectMapComponent
          onPropertySelected={(p) => {
            setSelected(identifyRoofType(p));
          }}
          leads={mapLeads}
          focusRequest={focusRequest}
        />
      </View>

      {selected ? (
        <View style={[styles.bottomCard, { bottom: tabBarHeight + Spacing.lg }]}>
          <Card style={styles.cardInner}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <Feather name="map-pin" size={18} color="#fff" />
              </View>
              <ThemedText type="h4" style={styles.cardTitle}>
                Selected Property
              </ThemedText>
            </View>

            <ThemedText type="small" style={styles.address}>
              {selected.address}
            </ThemedText>

            {selected.roofType ? (
              <>
                <ThemedText type="caption" style={[styles.address, { marginTop: 6, opacity: 0.75 }]}>
                  Identified roof type: {selected.roofType}
                </ThemedText>
                <View style={{ height: 6 }} />
              </>
            ) : null}

            <View style={{ height: 10 }} />

            <View style={styles.toggleRow}>
              <ThemedText type="caption" style={styles.toggleLabel}>
                Auto-open damage report / estimate after select
              </ThemedText>
              <Switch
                value={autoBuildReport}
                onValueChange={setAutoBuildReport}
                trackColor={{ false: "#94a3b8", true: AppColors.primary }}
              />
            </View>

            <View style={{ height: 10 }} />

            <Button onPress={handleNext} style={styles.nextButton}>
              Continue to Report
            </Button>

            <View style={{ height: 10 }} />

            <Button onPress={handleEstimateOnly} variant="secondary" style={[styles.secondaryButton, styles.estimateButton]}>
              Estimate Only
            </Button>

            <View style={{ height: 10 }} />

            <Button
              variant="secondary"
              onPress={() => {
                setSelected(null);
              }}
              style={styles.secondaryButton}
            >
              Select Another
            </Button>
          </Card>
        </View>
      ) : (
        <View style={[styles.bottomHint, { bottom: tabBarHeight + Spacing.lg }]}>
          <Card style={styles.cardInner}>
            <ThemedText type="small" style={styles.hintTitle}>
              {importedLeads.length
                ? "Click a marker (or anywhere) to select a property."
                : "Click anywhere on the map to select a property."}
            </ThemedText>
            <ThemedText type="caption" style={styles.hintBody}>
              Your report will use the selected address + coordinates.
            </ThemedText>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapWrap: { flex: 1 },
  topOverlay: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    top: Spacing.lg,
    zIndex: 10,
  },
  topOverlayCard: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  topOverlayRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  topOverlayTitle: { color: "#fff", fontWeight: "700" },
  topOverlayHint: { opacity: 0.8, marginTop: 2, color: "#fff" },
  uploadButton: { minWidth: 120, height: 40 },
  csvInfo: { marginTop: 10, opacity: 0.9, color: "#fff" },
  searchCard: {
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: Spacing.md,
    maxHeight: 320,
  },
  searchTitle: { color: "#fff", fontWeight: "700" },
  searchHint: { color: "#94a3b8", marginTop: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  searchInput: { flex: 1, minHeight: 44, fontSize: 15 },
  searchButton: { minHeight: 42 },
  geocodeSpinner: { marginTop: 10, alignItems: "center" },
  resultsScroll: { maxHeight: 140, marginTop: 8 },
  resultRow: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  resultText: { color: "#e2e8f0", lineHeight: 18 },
  matchingLabel: { color: "#94a3b8", marginTop: 10, fontWeight: "600" },
  bottomHint: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
  },
  bottomCard: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
  },
  cardInner: { padding: Spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { flex: 1 },
  address: { marginTop: 8, opacity: 0.9, lineHeight: 18 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  toggleLabel: { opacity: 0.85 },
  nextButton: { width: "100%" },
  secondaryButton: { width: "100%", borderWidth: 1 },
  estimateButton: { borderColor: "rgba(255,255,255,0.18)" },
  hintTitle: { textAlign: "center" },
  hintBody: { textAlign: "center", opacity: 0.8, marginTop: 6 },
});

