import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
} from "react-native";
import Geolocation from "@react-native-community/geolocation";

import type { PropertySelection } from "./roofReportTypes";
import { reverseGeocodeNominatim } from "./reverseGeocode";

export interface PropertySelectMapProps {
  onPropertySelected: (property: PropertySelection) => void;
  leads?: PropertySelection[];
  /** When `key` changes, web map flies to this point (picker search). */
  focusRequest?: { lat: number; lng: number; key: number };
}

async function ensureAndroidLocationPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const fine = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarse = PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;
  const check = (p: (typeof PermissionsAndroid.PERMISSIONS)[keyof typeof PermissionsAndroid.PERMISSIONS]) =>
    PermissionsAndroid.check(p);
  const has =
    (await check(fine).catch(() => false)) || (await check(coarse).catch(() => false));
  if (has) return true;
  const result = await PermissionsAndroid.request(fine);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => {
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  });
}

// Non-web: no Mapbox GL in this build — offer GPS selection with OSM reverse geocode.
export default function PropertySelectMap({
  onPropertySelected,
}: PropertySelectMapProps) {
  const [busy, setBusy] = useState(false);

  const useMyLocation = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await ensureAndroidLocationPermission();
      if (!ok) {
        Alert.alert(
          "Location needed",
          "Allow location access in Settings to use your current position.",
        );
        return;
      }
      const { lat, lng } = await getCurrentPosition();
      const address = (await reverseGeocodeNominatim(lat, lng)).trim();
      onPropertySelected({
        address: address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        lat,
        lng,
        clickedAtIso: new Date().toISOString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert("Location error", msg || "Could not read GPS position.");
    } finally {
      setBusy(false);
    }
  }, [onPropertySelected]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Property map (native)</Text>
      <Text style={styles.body}>
        The interactive Mapbox map runs on web. On this device you can select the
        property you are at using GPS, or enter an address from the search field
        above when available.
      </Text>
      <Pressable
        style={[styles.primaryBtn, busy && styles.primaryBtnDisabled]}
        onPress={() => void useMyLocation()}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryBtnText}>Use my current location</Text>
        )}
      </Pressable>
      <Text
        style={styles.link}
        onPress={() =>
          onPropertySelected({
            address: "Demo property (not geocoded)",
            lat: 0,
            lng: 0,
            clickedAtIso: new Date().toISOString(),
          })
        }
      >
        Use demo property
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  body: { fontSize: 13, color: "#555", textAlign: "center", marginBottom: 16 },
  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  link: { color: "#2563EB", fontWeight: "700", textAlign: "center", marginTop: 20 },
});
