/**
 * GIS building footprint + roof estimates (web: Mapbox GL + OSM fallback).
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";

import type { ReportsStackParamList } from "@/navigation/ReportsStackNavigator";
import type { BuildingWithImagery } from "@/src/gis/gisBuildingService";
import { useGISBuildingMapData } from "@/src/gis/useGISBuildingMapData";

import {
  GISBuildingMapAerialPreview,
  GISBuildingMapScreenContent,
} from "./GISBuildingMapScreenContent";
import { gisBuildingMapScreenStyles as styles } from "./gisBuildingMapScreenStyles";

const MAP_CONTAINER_ID = "gis-building-map-container";

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

function getMapboxToken(explicit?: string): string | undefined {
  const t = explicit?.trim();
  if (t) return t;
  if (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_MAPBOX_TOKEN) {
    return String(process.env.EXPO_PUBLIC_MAPBOX_TOKEN).trim();
  }
  return undefined;
}

type Props = NativeStackScreenProps<ReportsStackParamList, "GISBuildingMap">;

function GISBuildingMapboxView({
  latitude,
  longitude,
  mapboxToken,
  building,
}: {
  latitude: number;
  longitude: number;
  mapboxToken?: string;
  building: BuildingWithImagery;
}) {
  const mapContainerRef = useRef<any>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useLayoutEffect(() => {
    if (Platform.OS !== "web") return;

    const token = getMapboxToken(mapboxToken);
    const hasMapboxToken = !!token?.trim();
    if (hasMapboxToken) {
      mapboxgl.accessToken = token!;
    }

    const maybeContainer = mapContainerRef.current;
    const container: HTMLDivElement | null =
      maybeContainer instanceof HTMLElement
        ? (maybeContainer as HTMLDivElement)
        : (document.getElementById(MAP_CONTAINER_ID) as HTMLDivElement | null);

    if (!container) return;

    let map: mapboxgl.Map;
    try {
      map = new mapboxgl.Map({
        container,
        style: hasMapboxToken
          ? "mapbox://styles/mapbox/satellite-streets-v11"
          : OSM_FALLBACK_STYLE,
        center: [longitude, latitude],
        zoom: 17,
      });
    } catch (e) {
      console.error("GIS map init failed:", e);
      return;
    }

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    const onLoad = () => setMapLoaded(true);
    map.on("load", onLoad);

    return () => {
      map.off("load", onLoad);
      try {
        markerRef.current?.remove();
      } catch {
        // ignore
      }
      markerRef.current = null;
      try {
        map.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [latitude, longitude, mapboxToken]);

  useEffect(() => {
    if (Platform.OS !== "web" || !mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const ring = building.coordinates.map(
      ([lon, lat]) => [lon, lat] as [number, number],
    );
    if (ring.length >= 3) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]]);
      }
    }

    let polyFeature: ReturnType<typeof turf.polygon>;
    try {
      polyFeature = turf.polygon([ring]);
    } catch {
      return;
    }

    const circleFeature = turf.circle(
      [building.centerPoint[0], building.centerPoint[1]],
      (building.height ?? 12) * 2,
      { steps: 64, units: "meters" },
    );

    const setOrUpdate = (id: string, data: object) => {
      const src = map.getSource(id) as mapboxgl.GeoJSONSource | undefined;
      if (src) {
        src.setData(data as any);
      } else {
        map.addSource(id, { type: "geojson", data: data as any });
      }
    };

    setOrUpdate("gis-height-circle", circleFeature);
    setOrUpdate("gis-building", polyFeature);

    if (!map.getLayer("gis-circle-fill")) {
      map.addLayer({
        id: "gis-circle-fill",
        type: "fill",
        source: "gis-height-circle",
        paint: { "fill-color": "#4CAF50", "fill-opacity": 0.1 },
      });
    }
    if (!map.getLayer("gis-circle-line")) {
      map.addLayer({
        id: "gis-circle-line",
        type: "line",
        source: "gis-height-circle",
        paint: {
          "line-color": "#4CAF50",
          "line-width": 1,
          "line-opacity": 0.5,
        },
      });
    }
    if (!map.getLayer("gis-building-fill")) {
      map.addLayer({
        id: "gis-building-fill",
        type: "fill",
        source: "gis-building",
        paint: { "fill-color": "#2196F3", "fill-opacity": 0.3 },
      });
    }
    if (!map.getLayer("gis-building-line")) {
      map.addLayer({
        id: "gis-building-line",
        type: "line",
        source: "gis-building",
        paint: { "line-color": "#2196F3", "line-width": 2 },
      });
    }

    try {
      markerRef.current?.remove();
    } catch {
      // ignore
    }
    markerRef.current = new mapboxgl.Marker({ color: "#2196F3" })
      .setLngLat([building.centerPoint[0], building.centerPoint[1]])
      .addTo(map);

    const bbox = turf.bbox(polyFeature);
    map.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 48, maxZoom: 18, duration: 0 },
    );
  }, [mapLoaded, building]);

  return (
    <View style={{ flex: 1, position: "relative" }}>
      <View
        ref={mapContainerRef}
        nativeID={MAP_CONTAINER_ID}
        style={{ flex: 1, minHeight: 280 }}
      />
    </View>
  );
}

export default function GISBuildingMapScreen({ route }: Props) {
  const { address, latitude, longitude, mapboxToken } = route.params;
  const { building, measurements, roofingOptions, loading, loadBuildingData } =
    useGISBuildingMapData({
      address,
      latitude,
      longitude,
      mapboxToken,
    });

  const [activeTab, setActiveTab] = useState<"map" | "details" | "materials">(
    "map",
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading Building Data...</Text>
      </View>
    );
  }

  if (!building || !measurements) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Building data not available</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBuildingData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GISBuildingMapScreenContent
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      building={building}
      measurements={measurements}
      roofingOptions={roofingOptions}
      mapSlot={
        <View style={{ flex: 1, position: "relative" }}>
          <GISBuildingMapboxView
            latitude={latitude}
            longitude={longitude}
            mapboxToken={mapboxToken}
            building={building}
          />
          <GISBuildingMapAerialPreview building={building} />
        </View>
      }
    />
  );
}
