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
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
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
import {
  loadRoofLeads,
  saveRoofLeads,
} from "@/src/roofReports/roofLeadsStorage";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { forwardGeocodeNominatim } from "@/src/roofReports/reverseGeocode";
import {
  findBestMatchingLead,
  inferRoofTypeIfMissing,
} from "@/src/roofReports/propertyLeadMatching";
import { inferPropertyUseType } from "@/src/roofReports/propertyUseClassification";
import { persistBulkDamageReportsFromLeads } from "@/src/roofReports/bulkPersistDamageReportsFromLeads";
import { MISSOURI_BBOX } from "@/constants/stlDataSources";
import {
  fetchStlIntelAtPoint,
  type StlIntelBundle,
} from "@/services/stlIntelClient";

type Props = NativeStackScreenProps<ReportsStackParamList, "PropertyMapPicker">;

function isInMissouriBbox(lat: number, lng: number): boolean {
  return (
    lat >= MISSOURI_BBOX.south &&
    lat <= MISSOURI_BBOX.north &&
    lng >= MISSOURI_BBOX.west &&
    lng <= MISSOURI_BBOX.east
  );
}

function summarizeStlIntel(b: StlIntelBundle): string[] {
  const lines: string[] = [];
  lines.push(
    b.parcel
      ? "City assessor parcel: match"
      : "City assessor parcel: none at this point",
  );
  lines.push(`Building permits (≈75 m): ${b.buildingPermits.length}`);
  lines.push(`Trades permits (≈75 m): ${b.tradesPermits.length}`);
  if (b.lraParcel) lines.push("LRA (in path): parcel flagged");
  if (b.taxSaleParcel) lines.push("Tax sale layer: parcel flagged");
  if (b.demolitionParcel) lines.push("Demolition layer: parcel flagged");
  return lines;
}

export default function PropertyMapPickerScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();

  const bulkCreatedBy = useMemo(
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
  const [selected, setSelected] = useState<PropertySelection | null>(null);
  const selectedRef = useRef<PropertySelection | null>(null);
  const [importedLeads, setImportedLeads] = useState<PropertySelection[]>([]);
  const [csvInfo, setCsvInfo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [geocodeResults, setGeocodeResults] = useState<
    { lat: number; lng: number; displayName: string }[]
  >([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [focusRequest, setFocusRequest] = useState<
    { lat: number; lng: number; key: number } | undefined
  >(undefined);
  const [autoBuildReport, setAutoBuildReport] = useState(true);
  const [bulkReportsBusy, setBulkReportsBusy] = useState(false);
  const [leadApiHint, setLeadApiHint] = useState<string | null>(null);
  const [stlIntel, setStlIntel] = useState<StlIntelBundle | null>(null);
  const [stlIntelLoading, setStlIntelLoading] = useState(false);
  const [stlIntelError, setStlIntelError] = useState<string | null>(null);
  const [stlIntelOutsideMissouri, setStlIntelOutsideMissouri] =
    useState(false);
  const tabBarHeight = React.useContext(BottomTabBarHeightContext) ?? 70;

  const identifyRoofType = (p: PropertySelection): PropertySelection => {
    const roofType = p.roofType?.trim()
      ? p.roofType.trim()
      : inferRoofTypeIfMissing(p);
    let next = roofType ? { ...p, roofType } : p;
    if (next.propertyUse) return next;
    const { use } = inferPropertyUseType({
      address: next.address,
      roofType: next.roofType,
    });
    return { ...next, propertyUse: use };
  };

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return importedLeads;
    return importedLeads.filter((l) => {
      const hay = [
        l.address,
        l.homeownerName,
        l.companyName,
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
    if (!selected) {
      setStlIntel(null);
      setStlIntelLoading(false);
      setStlIntelError(null);
      setStlIntelOutsideMissouri(false);
      return;
    }
    if (!isInMissouriBbox(selected.lat, selected.lng)) {
      setStlIntel(null);
      setStlIntelLoading(false);
      setStlIntelError(null);
      setStlIntelOutsideMissouri(true);
      return;
    }
    setStlIntelOutsideMissouri(false);
    const ac = new AbortController();
    setStlIntelLoading(true);
    setStlIntelError(null);
    void fetchStlIntelAtPoint(selected.lat, selected.lng, { signal: ac.signal })
      .then((bundle) => {
        setStlIntel(bundle);
      })
      .catch((e: Error & { name?: string }) => {
        if (e?.name === "AbortError") return;
        setStlIntel(null);
        setStlIntelError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setStlIntelLoading(false);
      });
    return () => ac.abort();
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
          setLeadApiHint(null);
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
        const remote: unknown = await apiClient.getLeads();
        const rows = Array.isArray(remote)
          ? remote
          : remote &&
              typeof remote === "object" &&
              "data" in remote &&
              Array.isArray((remote as { data: unknown }).data)
            ? (remote as { data: unknown[] }).data
            : [];

        const mapped: PropertySelection[] = rows
          .map((row: any) => {
            const lat =
              typeof row.latitude === "number"
                ? row.latitude
                : Number(row.latitude);
            const lng =
              typeof row.longitude === "number"
                ? row.longitude
                : Number(row.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            let roofSqFt: number | undefined;
            let roofType: string | undefined;

            const notes = typeof row.notes === "string" ? row.notes : "";
            let homeownerName: string | undefined =
              typeof row.contact_name === "string" && row.contact_name.trim()
                ? row.contact_name.trim()
                : undefined;
            let email: string | undefined =
              typeof row.email === "string" && row.email.trim()
                ? row.email.trim()
                : undefined;
            let phone: string | undefined =
              typeof row.phone === "string" && row.phone.trim()
                ? row.phone.trim()
                : undefined;
            let companyName: string | undefined =
              typeof row.company_name === "string" && row.company_name.trim()
                ? row.company_name.trim()
                : undefined;
            if (notes.trim().startsWith("{")) {
              try {
                const parsed = JSON.parse(notes);
                if (
                  typeof parsed.roofSqFt === "number" &&
                  Number.isFinite(parsed.roofSqFt)
                )
                  roofSqFt = parsed.roofSqFt;
                if (
                  typeof parsed.roofType === "string" &&
                  parsed.roofType.trim()
                )
                  roofType = parsed.roofType.trim();
                if (
                  !homeownerName &&
                  typeof parsed.homeownerName === "string" &&
                  parsed.homeownerName.trim()
                ) {
                  homeownerName = parsed.homeownerName.trim();
                }
                if (
                  !companyName &&
                  typeof parsed.companyName === "string" &&
                  parsed.companyName.trim()
                ) {
                  companyName = parsed.companyName.trim();
                }
                if (
                  !email &&
                  typeof parsed.email === "string" &&
                  parsed.email.trim()
                ) {
                  email = parsed.email.trim();
                }
                if (
                  !phone &&
                  typeof parsed.phone === "string" &&
                  parsed.phone.trim()
                ) {
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
              clickedAtIso:
                typeof row.created_at === "string"
                  ? row.created_at
                  : new Date().toISOString(),
              homeownerName,
              companyName,
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
          setLeadApiHint(null);

          // If the user already selected something, try to preserve it.
          const current = selectedRef.current;
          if (current) {
            const match = mapped.find(
              (p) =>
                p.lat.toFixed(6) === current.lat.toFixed(6) &&
                p.lng.toFixed(6) === current.lng.toFixed(6) &&
                (p.address ?? "").trim().toLowerCase() ===
                  (current.address ?? "").trim().toLowerCase(),
            );
            setSelected(identifyRoofType(match ?? mapped[0]));
          } else {
            setSelected(identifyRoofType(mapped[0]));
          }

          await saveRoofLeads(mapped); // refresh local cache
        }
      } catch (e) {
        console.error("Lead fetch failed:", e);
        const apiUrl =
          process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";
        setLeadApiHint(
          `Could not load leads from the API (${apiUrl}). Start the backend, upload a CSV, or click the map to choose a property.`,
        );
      }
    })();
  }, [user?.id, isLoading]);

  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

  const handleUploadCsv = async () => {
    if (Platform.OS !== "web") {
      Alert.alert(
        "CSV upload",
        "CSV upload is supported in the web build only.",
      );
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
          Alert.alert(
            "CSV import failed",
            warnings[0] || "No valid rows found.",
          );
          return;
        }

        setImportedLeads(leads);
        setCsvInfo(`Imported ${leads.length} properties`);
        setLeadApiHint(null);

        // Persist the uploaded CSV so it survives app restarts.
        try {
          await saveRoofLeads(leads);
        } catch (e) {
          console.error(e);
          Alert.alert(
            "Save failed",
            "Imported leads, but couldn't save them to device storage.",
          );
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
                companyName: l.companyName ?? null,
                email: l.email ?? null,
                phone: l.phone ?? null,
              }),
              lat: l.lat,
              lng: l.lng,
            }));

            await apiClient.importLeads(rowsForBackend);
          } catch (e) {
            console.error("DB lead import failed:", e);
            Alert.alert(
              "Database save failed",
              "Leads imported, but couldn't save to the database.",
            );
          }
        }

        // One AI-assisted damage report per contact row (same engine as Bulk CSV screen).
        setBulkReportsBusy(true);
        setCsvInfo(`Imported ${leads.length} properties — saving AI reports…`);
        try {
          const { reports } = await persistBulkDamageReportsFromLeads(leads, {
            companyNameFallback: "Cox Roofing",
            createdBy: bulkCreatedBy,
          });
          setCsvInfo(
            `Imported ${leads.length} properties · ${reports.length} AI reports saved`,
          );
          const body =
            `Created ${reports.length} AI damage reports from this upload. Open Roof Reports to review or export.` +
            (warnings.length ? `\n\nNote: ${warnings[0]}` : "");
          Alert.alert("CSV imported", body);
        } catch (e) {
          console.error(e);
          const msg = e instanceof Error ? e.message : String(e);
          const quota =
            (typeof DOMException !== "undefined" &&
              e instanceof DOMException &&
              e.name === "QuotaExceededError") ||
            /quota|exceeded|5mb/i.test(msg);
          Alert.alert(
            quota ? "Storage full" : "Reports not saved",
            quota
              ? `Could not save all reports (browser storage ~5MB limit). Try fewer rows, delete old reports under Roof Reports, or use Bulk CSV → export in batches. ${msg}`
              : `Leads are on the map, but reports failed to save: ${msg}`,
          );
          if (warnings.length) {
            Alert.alert("CSV note", warnings[0]);
          }
        } finally {
          setBulkReportsBusy(false);
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

  const handleStartReport = () => {
    if (!selected) return;
    navigation.navigate("CreateDamageRoofReport", {
      property: selected,
      mode: "full",
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
      if (!hits.length)
        Alert.alert("Search", "No addresses found. Try a different query.");
    } catch (e) {
      console.error(e);
      Alert.alert("Search failed", "Could not search addresses. Try again.");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const selectGeocodeHit = (hit: {
    lat: number;
    lng: number;
    displayName: string;
  }) => {
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
    setSelected(
      identifyRoofType({ ...lead, clickedAtIso: new Date().toISOString() }),
    );
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
                CSV headers: lat/lng + optional address, name/homeowner, company,
                email, phone, roof_sqft, roof_type. Each row gets an AI damage
                report saved under Roof Reports. Map needs Mapbox token.
              </ThemedText>
              {Platform.OS === "web" ? (
                <ThemedText type="caption" style={styles.topOverlayHint}>
                  Mapbox token: {mapboxToken ? "SET" : "MISSING"}
                </ThemedText>
              ) : null}
            </View>

            <View style={{ width: 16 }} />

            <Button
              onPress={handleUploadCsv}
              disabled={bulkReportsBusy}
              style={styles.uploadButton}
            >
              {bulkReportsBusy ? "Saving reports…" : "Upload CSV"}
            </Button>
          </View>

          {csvInfo ? (
            <ThemedText type="caption" style={styles.csvInfo}>
              {csvInfo}
            </ThemedText>
          ) : null}
          {leadApiHint ? (
            <ThemedText
              type="caption"
              style={[styles.csvInfo, { marginTop: 8, color: "#fbbf24" }]}
            >
              {leadApiHint}
            </ThemedText>
          ) : null}
        </Card>

        <View style={{ height: 10 }} />

        <Card style={styles.searchCard}>
          <ThemedText type="small" style={styles.searchTitle}>
            Find property
          </ThemedText>
          <ThemedText type="caption" style={styles.searchHint}>
            Filter imported leads by text, or search a US address
            (OpenStreetMap).
          </ThemedText>
          <View style={{ height: 8 }} />
          <View style={styles.searchRow}>
            <Feather
              name="search"
              size={18}
              color="#94a3b8"
              style={{ marginRight: 8 }}
            />
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
          <Button
            onPress={handleAddressSearch}
            style={styles.searchButton}
            disabled={geocodeLoading}
          >
            {geocodeLoading ? "Searching…" : "Search address (US)"}
          </Button>
          {geocodeLoading ? (
            <View style={styles.geocodeSpinner}>
              <ActivityIndicator color={AppColors.primary} />
            </View>
          ) : null}
          {geocodeResults.length > 0 ? (
            <ScrollView
              style={styles.resultsScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {geocodeResults.map((h, i) => (
                <Pressable
                  key={`${h.lat}_${h.lng}_${i}`}
                  onPress={() => selectGeocodeHit(h)}
                  style={({ pressed }) => [
                    styles.resultRow,
                    pressed ? { opacity: 0.85 } : null,
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={styles.resultText}
                    numberOfLines={2}
                  >
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
                <ScrollView
                  style={styles.resultsScroll}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {filteredLeads.slice(0, 8).map((l, i) => (
                    <Pressable
                      key={`${l.lat}_${l.lng}_${i}`}
                      onPress={() => selectLeadFromSearch(l)}
                      style={({ pressed }) => [
                        styles.resultRow,
                        pressed ? { opacity: 0.85 } : null,
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={styles.resultText}
                        numberOfLines={2}
                      >
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
        <View
          style={[styles.bottomCard, { bottom: tabBarHeight + Spacing.lg }]}
        >
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
                <ThemedText
                  type="caption"
                  style={[styles.address, { marginTop: 6, opacity: 0.75 }]}
                >
                  Identified roof type: {selected.roofType}
                </ThemedText>
                <View style={{ height: 6 }} />
              </>
            ) : null}

            <View style={{ height: 10 }} />

            <View style={styles.toggleRow}>
              <ThemedText type="caption" style={styles.toggleLabel}>
                Auto-open report after select
              </ThemedText>
              <Switch
                value={autoBuildReport}
                onValueChange={setAutoBuildReport}
                trackColor={{ false: "#94a3b8", true: AppColors.primary }}
              />
            </View>

            <View style={{ height: 10 }} />

            <Button onPress={handleStartReport} style={styles.nextButton}>
              Start roof report & estimate
            </Button>

            <View style={{ height: 14 }} />

            <ThemedText
              type="caption"
              style={{ opacity: 0.85, marginBottom: 8 }}
            >
              Roof analysis (this property)
            </ThemedText>

            <ThemedText
              type="caption"
              style={{ opacity: 0.85, marginBottom: 6, marginTop: 4 }}
            >
              St. Louis city GIS (auto)
            </ThemedText>
            {stlIntelOutsideMissouri ? (
              <ThemedText type="caption" style={styles.stlHint}>
                Selection is outside Missouri — St. Louis city GIS fetch skipped.
                You can still open the STL tools screen with these coordinates.
              </ThemedText>
            ) : null}
            {stlIntelLoading ? (
              <View style={styles.stlRow}>
                <ActivityIndicator color={AppColors.primary} />
                <ThemedText type="caption" style={styles.stlHint}>
                  Loading parcel & permits…
                </ThemedText>
              </View>
            ) : null}
            {stlIntelError ? (
              <ThemedText type="caption" style={styles.stlErr}>
                {stlIntelError}
              </ThemedText>
            ) : null}
            {!stlIntelLoading &&
            !stlIntelError &&
            stlIntel &&
            !stlIntelOutsideMissouri ? (
              <View style={{ marginBottom: 10 }}>
                {summarizeStlIntel(stlIntel).map((line, idx) => (
                  <ThemedText
                    key={`stl-${idx}`}
                    type="caption"
                    style={styles.stlHint}
                  >
                    {line}
                  </ThemedText>
                ))}
              </View>
            ) : null}

            <Button
              variant="secondary"
              onPress={() =>
                navigation.navigate("StLouisDataSources", {
                  latitude: selected.lat,
                  longitude: selected.lng,
                })
              }
              style={styles.secondaryButton}
            >
              Full STL GIS & storm sources
            </Button>

            <View style={{ height: 8 }} />

            <Button
              variant="secondary"
              onPress={() =>
                navigation.navigate("GISBuildingMap", {
                  address: selected.address,
                  latitude: selected.lat,
                  longitude: selected.lng,
                })
              }
              style={styles.secondaryButton}
            >
              OSM building footprint
            </Button>
            <View style={{ height: 8 }} />
            <Button
              variant="secondary"
              onPress={() =>
                navigation.navigate("ComprehensiveRoof3DAssessment", {
                  address: selected.address,
                  latitude: selected.lat,
                  longitude: selected.lng,
                })
              }
              style={styles.secondaryButton}
            >
              Full roof assessment
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
        <View
          style={[styles.bottomHint, { bottom: tabBarHeight + Spacing.lg }]}
        >
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  toggleLabel: { opacity: 0.85 },
  nextButton: { width: "100%" },
  secondaryButton: { width: "100%", borderWidth: 1 },
  hintTitle: { textAlign: "center" },
  hintBody: { textAlign: "center", opacity: 0.8, marginTop: 6 },
  stlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  stlHint: { opacity: 0.82, lineHeight: 18, marginBottom: 2 },
  stlErr: { color: "#fca5a5", marginBottom: 8, lineHeight: 18 },
});
