import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, Text, Platform, ActivityIndicator } from "react-native";

import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import type { PropertySelection } from "./roofReportTypes";
import { reverseGeocodeNominatim } from "./reverseGeocode";
import { addMicrosoftBuildingFootprintsToMap } from "./msBuildingFootprintsMapbox";
import { waitForHtmlElement } from "./mapDomUtils";

export interface PropertySelectMapProps {
  onPropertySelected: (property: PropertySelection) => void;
  leads?: PropertySelection[];
  focusRequest?: { lat: number; lng: number; key: number };
}

const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283]; // US-ish
const MAP_CONTAINER_ID = "roofReportsMapContainer";
const OSM_FALLBACK_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
} as any;

/** ~20 m in degrees (lat/lng rough threshold) — merge CSV lead onto map click when close. */
function findNearbyLead(lat: number, lng: number, leads: PropertySelection[] | undefined): PropertySelection | null {
  if (!leads?.length) return null;
  const thresh = 0.00018;
  for (const l of leads) {
    if (Math.abs(l.lat - lat) < thresh && Math.abs(l.lng - lng) < thresh) {
      return l;
    }
  }
  return null;
}

export default function PropertySelectMap({
  onPropertySelected,
  leads,
  focusRequest,
}: PropertySelectMapProps) {
  const mapContainerRef = useRef<any>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const leadsRef = useRef<PropertySelection[] | undefined>(leads);
  const onPropertySelectedRef = useRef(onPropertySelected);
  const focusRequestRef = useRef(focusRequest);

  const [status, setStatus] = useState<string>("Click on a property on the map");
  const [isGeocoding, setIsGeocoding] = useState(false);

  onPropertySelectedRef.current = onPropertySelected;
  focusRequestRef.current = focusRequest;

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    let cancelled = false;
    let cleanupMap: (() => void) | undefined;

    const token =
      typeof process !== "undefined" && process.env
        ? (process.env.EXPO_PUBLIC_MAPBOX_TOKEN as string | undefined)
        : undefined;
    const hasMapboxToken = !!token?.trim();
    if (hasMapboxToken) {
      mapboxgl.accessToken = token!.trim();
    }

    const cancelWait = waitForHtmlElement(
      () => {
        const r = mapContainerRef.current as any;
        if (r instanceof HTMLElement) return r;
        return document.getElementById(MAP_CONTAINER_ID);
      },
      (containerEl) => {
        if (cancelled) return;

        let map: mapboxgl.Map | null = null;
        try {
          map = new mapboxgl.Map({
            container: containerEl as HTMLDivElement,
            style: hasMapboxToken ? "mapbox://styles/mapbox/satellite-streets-v11" : OSM_FALLBACK_STYLE,
            center: DEFAULT_CENTER,
            zoom: 10,
          });
        } catch (e) {
          console.error("Mapbox init exception:", e);
          setStatus(
            `Mapbox init failed: ${e instanceof Error ? e.message : String(e)}`,
          );
          return;
        }

        mapRef.current = map;

        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        map.on("load", () => {
          if (hasMapboxToken) {
            addMicrosoftBuildingFootprintsToMap(map);
            setStatus("Click on a property on the map (cyan = Microsoft building footprints)");
          } else {
            setStatus("Mapbox token missing — using OpenStreetMap fallback. Click a property to select it.");
          }
        });

        map.on("error", (e) => {
          console.error("Mapbox error:", e);
          setStatus("Mapbox failed to load. Check token/network in browser console.");
        });

        let requestSeq = 0;
        map.on("click", async (e) => {
          const seq = ++requestSeq;
          const { lng, lat } = e.lngLat;

          setIsGeocoding(true);
          setStatus("Finding property address...");

          try {
            markerRef.current?.remove();
            markerRef.current = new mapboxgl.Marker({ color: "#fbbf24" })
              .setLngLat([lng, lat])
              .addTo(map);

            const rawAddress = await reverseGeocodeNominatim(lat, lng);
            if (seq !== requestSeq) return;

            const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            const addressLine = rawAddress.trim() ? rawAddress.trim() : fallbackAddress;

            const leadMatch = findNearbyLead(lat, lng, leadsRef.current);
            const property: PropertySelection = leadMatch
              ? {
                  ...leadMatch,
                  address: addressLine || leadMatch.address?.trim() || fallbackAddress,
                  lat,
                  lng,
                  clickedAtIso: new Date().toISOString(),
                }
              : {
                  address: addressLine,
                  lat,
                  lng,
                  clickedAtIso: new Date().toISOString(),
                };

            map.easeTo({ center: [lng, lat], zoom: 17, duration: 600 });
            setStatus(`Selected: ${addressLine}`);
            onPropertySelectedRef.current(property);
          } finally {
            if (seq === requestSeq) setIsGeocoding(false);
          }
        });

        cleanupMap = () => {
          try {
            markerRef.current?.remove();
          } catch {
            // ignore
          }
          try {
            markersRef.current.forEach((m) => m.remove());
            markersRef.current = [];
          } catch {
            // ignore
          }
          try {
            mapRef.current?.remove();
          } catch {
            // ignore
          }
        };
      },
      {
        maxFrames: 90,
        onTimeout: () => {
          if (!cancelled) {
            setStatus("Map container not found (DOM id mismatch).");
          }
        },
      },
    );

    return () => {
      cancelled = true;
      cancelWait();
      cleanupMap?.();
      mapRef.current = null;
    };
    // Map is created once; parent handlers read via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFocusFromRef = () => {
    const map = mapRef.current;
    const fr = focusRequestRef.current;
    if (!map || !fr) return;
    const { lat, lng } = fr;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const run = () => {
      try {
        map.flyTo({ center: [lng, lat], zoom: 17, duration: 900 });
        markerRef.current?.remove();
        markerRef.current = new mapboxgl.Marker({ color: "#fbbf24" })
          .setLngLat([lng, lat])
          .addTo(map);
        setStatus("Location from search — tap map to refine or pick a lead marker.");
      } catch {
        // ignore
      }
    };

    if (map.isStyleLoaded()) run();
    else map.once("load", run);
  };

  // Render markers when imported leads change.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {
        // ignore
      }
    });
    markersRef.current = [];

    if (!leads?.length) return;

    leads.forEach((lead) => {
      const marker = new mapboxgl.Marker({ color: "#fbbf24" })
        .setLngLat([lead.lng, lead.lat])
        .addTo(map);

      const el = marker.getElement();
      el.style.cursor = "pointer";
      el.title = lead.address;

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        // Pass full lead (contact, roof_sqft, roof_type) — same shape as CSV import.
        const selected: PropertySelection = { ...lead, clickedAtIso: new Date().toISOString() };

        setStatus(`Selected: ${lead.address}`);
        onPropertySelectedRef.current(selected);

        try {
          map.easeTo({ center: [lead.lng, lead.lat], zoom: 17, duration: 400 });
        } catch {
          // ignore
        }
      });

      markersRef.current.push(marker);
    });
  }, [leads]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!focusRequest) return;
    const { lat, lng } = focusRequest;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let cancelled = false;
    let frames = 0;
    const maxFrames = 90;

    const tick = () => {
      if (cancelled) return;
      if (mapRef.current) {
        applyFocusFromRef();
        return;
      }
      frames += 1;
      if (frames >= maxFrames) return;
      requestAnimationFrame(tick);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [focusRequest?.key, focusRequest?.lat, focusRequest?.lng]);

  return (
    <View style={styles.container}>
      <View
        ref={mapContainerRef}
        nativeID={MAP_CONTAINER_ID}
        style={styles.map}
      />

      <View style={styles.overlay}>
        {isGeocoding ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.statusText}>Geocoding...</Text>
          </View>
        ) : null}
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1220" },
  map: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 92,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.78)",
    zIndex: 5,
    elevation: 5,
    pointerEvents: "none" as any,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusText: { color: "#fff", fontSize: 13, fontWeight: "700", marginTop: 4 },
});
