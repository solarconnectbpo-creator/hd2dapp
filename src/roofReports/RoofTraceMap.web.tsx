import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, Text } from "react-native";

import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import * as turf from "@turf/turf";

import type { RoofTraceMetrics, RoofTraceMapProps } from "./RoofTraceMap";
import { Feather } from "@expo/vector-icons";
import {
  addMicrosoftBuildingFootprintsToMap,
  MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID,
} from "./msBuildingFootprintsMapbox";

const MAP_CONTAINER_ID = "roofTraceMapContainer";

const polygonDrawStyles = [
  {
    id: "gl-draw-polygon-border",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#FFFFFF", "line-width": 6 },
  },
  {
    id: "gl-draw-polygon-yellow",
    type: "line",
    filter: ["all", ["==", "$type", "Polygon"]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#FFD400", "line-width": 3, "line-opacity": 0.95 },
  },
  {
    id: "gl-draw-points",
    type: "circle",
    filter: ["all", ["==", "$type", "Point"]],
    paint: {
      "circle-color": "#FFD400",
      "circle-radius": 5,
      "circle-stroke-color": "#FFFFFF",
      "circle-stroke-width": 2,
    },
  },
];

function isPolyLike(feature: any): boolean {
  const t = feature?.geometry?.type;
  return t === "Polygon" || t === "MultiPolygon";
}

function getLargestPolyLikeFeature(features: any[]): any | null {
  const polys = (features ?? []).filter(isPolyLike);
  if (!polys.length) return null;

  let best = polys[0];
  let bestArea = -Infinity;
  for (const f of polys) {
    try {
      const a = turf.area(f);
      if (a > bestArea) {
        bestArea = a;
        best = f;
      }
    } catch {
      // ignore invalid geometry
    }
  }

  return best ?? null;
}

/** Single Polygon Feature for MapboxDraw from footprint query. */
function normalizeFootprintForDraw(raw: any): GeoJSON.Feature<GeoJSON.Polygon> | null {
  const g = raw?.geometry;
  if (!g) return null;
  if (g.type === "Polygon" && Array.isArray(g.coordinates)) {
    return { type: "Feature", properties: {}, geometry: g };
  }
  if (g.type === "MultiPolygon" && Array.isArray(g.coordinates)) {
    const mp = g.coordinates as GeoJSON.Position[][][];
    let bestCoords: GeoJSON.Position[][] | null = null;
    let bestA = -1;
    for (const rings of mp) {
      try {
        const poly = turf.polygon(rings);
        const a = turf.area(poly);
        if (a > bestA) {
          bestA = a;
          bestCoords = rings;
        }
      } catch {
        // skip
      }
    }
    if (!bestCoords) return null;
    return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: bestCoords } };
  }
  return null;
}

export default function RoofTraceMap({
  initialCenter,
  onTraceChange,
  autoTraceFromFootprint = true,
}: RoofTraceMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onTraceChangeRef = useRef(onTraceChange);
  const lastMetricsRef = useRef<{ roofAreaSqFt?: number; roofPerimeterFt?: number; hasGeoJson: boolean } | null>(null);
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const updateFromDrawRef = useRef<() => void>(() => {});
  const autoTraceKeyRef = useRef<string>("");
  const autoTraceFromFootprintRef = useRef(autoTraceFromFootprint);
  const initialCenterRef = useRef(initialCenter);
  const runFlyToPropertyRef = useRef<(m: mapboxgl.Map, lng: number, lat: number) => void>(() => {});
  const [status, setStatus] = useState("Draw your roof polygon");
  const mapContainerRef = useRef<any>(null);

  useEffect(() => {
    onTraceChangeRef.current = onTraceChange;
  }, [onTraceChange]);

  useEffect(() => {
    autoTraceFromFootprintRef.current = autoTraceFromFootprint;
  }, [autoTraceFromFootprint]);

  useEffect(() => {
    initialCenterRef.current = initialCenter;
  }, [initialCenter]);

  useEffect(() => {
    autoTraceKeyRef.current = "";
  }, [initialCenter?.lat, initialCenter?.lng]);

  const tryAutoTraceFootprint = (lng: number, lat: number) => {
    if (!autoTraceFromFootprintRef.current) return;
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw || !Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (autoTraceKeyRef.current === key) return;

    try {
      if (!map.getLayer(MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID)) {
        setStatus("Footprints loading — draw manually or wait and refresh.");
        return;
      }

      const pt = map.project([lng, lat]);
      const pad = 28;
      const features = map.queryRenderedFeatures(
        [
          [pt.x - pad, pt.y - pad],
          [pt.x + pad, pt.y + pad],
        ] as [mapboxgl.PointLike, mapboxgl.PointLike],
        { layers: [MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID] },
      );

      const centerPt = turf.point([lng, lat]);
      const polys = features.filter(isPolyLike);
      const containing = polys.filter((f) => {
        try {
          return turf.booleanPointInPolygon(centerPt, f as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>);
        } catch {
          return false;
        }
      });

      const chosenRaw =
        containing.length > 0
          ? getLargestPolyLikeFeature(containing)
          : polys.length > 0
            ? polys.reduce(
                (best: { f: (typeof polys)[0]; d: number } | null, f) => {
                  try {
                    const c = turf.centroid(f);
                    const d = turf.distance(centerPt, c, { units: "miles" });
                    if (!best || d < best.d) return { f, d };
                    return best;
                  } catch {
                    return best;
                  }
                },
                null as { f: (typeof polys)[0]; d: number } | null,
              )?.f ?? null
            : null;

      const normalized = chosenRaw ? normalizeFootprintForDraw(chosenRaw) : null;
      if (!normalized) {
        setStatus("No building footprint under pin — draw the roof polygon.");
        return;
      }

      try {
        draw.deleteAll();
        draw.add(normalized);
      } catch (e) {
        console.warn("MapboxDraw.add footprint failed:", e);
        setStatus("Could not load footprint into editor — draw manually.");
        return;
      }

      autoTraceKeyRef.current = key;
      setStatus("Auto-traced from Microsoft building footprint — verify and adjust if needed.");
      updateFromDrawRef.current();
    } catch (e) {
      console.warn("tryAutoTraceFootprint:", e);
      setStatus("Footprint auto-trace failed — draw manually.");
    }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN as string | undefined;
    if (!token) {
      setStatus("Missing Mapbox token. Set EXPO_PUBLIC_MAPBOX_TOKEN.");
      return;
    }
    mapboxgl.accessToken = token;

    const maybeContainer = mapContainerRef.current as any;
    const container: HTMLDivElement | null =
      maybeContainer instanceof HTMLElement
        ? (maybeContainer as HTMLDivElement)
        : (document.getElementById(MAP_CONTAINER_ID) as HTMLDivElement | null);

    if (!container) {
      setStatus("Map container not found.");
      return;
    }

    const lat0 = initialCenter?.lat ?? 39.8283;
    const lng0 = initialCenter?.lng ?? -98.5795;

    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/satellite-streets-v11",
      center: [lng0, lat0],
      zoom: 17,
      pitch: 45,
      bearing: 0,
      antialias: true,
    });
    mapRef.current = map;

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      styles: polygonDrawStyles as any,
    });
    drawRef.current = draw;

    const updateFromDraw = () => {
      try {
        const all = draw.getAll();
        const feature = getLargestPolyLikeFeature(all.features ?? []);

        if (!feature) {
          onTraceChangeRef.current(null);
          lastMetricsRef.current = null;
          setStatus("Draw your roof polygon");
          return;
        }

        let areaSqFt: number | undefined;
        let perimeterFt: number | undefined;

        try {
          areaSqFt = turf.area(feature) * 10.7639104167;
        } catch {
          // ignore
        }

        try {
          const line = turf.polygonToLine(feature);
          perimeterFt = turf.length(line, { units: "kilometers" }) * 3280.839895;
        } catch {
          // ignore
        }

        const roundedArea = areaSqFt && Number.isFinite(areaSqFt) ? Math.round(areaSqFt) : undefined;
        const roundedPerimeter = perimeterFt && Number.isFinite(perimeterFt) ? Math.round(perimeterFt) : undefined;
        const nextFingerprint = {
          roofAreaSqFt: roundedArea,
          roofPerimeterFt: roundedPerimeter,
          hasGeoJson: true,
        };
        const prev = lastMetricsRef.current;
        const changed =
          !prev ||
          prev.roofAreaSqFt !== nextFingerprint.roofAreaSqFt ||
          prev.roofPerimeterFt !== nextFingerprint.roofPerimeterFt ||
          prev.hasGeoJson !== nextFingerprint.hasGeoJson;

        if (changed) {
          onTraceChangeRef.current({
            roofAreaSqFt: areaSqFt,
            roofPerimeterFt: perimeterFt,
            geoJson: feature,
          });
          lastMetricsRef.current = nextFingerprint;
        }

        setStatus("Roof traced. Measurements updated.");
      } catch (e) {
        console.error("updateFromDraw failed:", e);
        setStatus("Trace found but metrics failed to compute.");
      }
    };

    updateFromDrawRef.current = updateFromDraw;

    map.on("load", () => {
      addMicrosoftBuildingFootprintsToMap(map);

      map.addControl(draw, "top-left");

      try {
        map.addSource("terrain", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb",
          tileSize: 512,
          maxzoom: 14,
        });
        map.setTerrain({ source: "terrain", exaggeration: 1.2 });

        map.addLayer({
          id: "sky",
          type: "sky",
          paint: {
            "sky-type": "atmosphere",
            "sky-atmosphere-sun-intensity": 10,
          },
        });
      } catch {
        // optional
      }

      map.on("draw.create", updateFromDraw);
      map.on("draw.update", updateFromDraw);
      map.on("draw.delete", updateFromDraw);

      updateFromDraw();

      runFlyToPropertyRef.current = (m, lng, lat) => {
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
        try {
          m.flyTo({
            center: [lng, lat],
            zoom: 18,
            pitch: 45,
            bearing: 0,
            duration: 1000,
          });
          centerMarkerRef.current?.remove();
          centerMarkerRef.current = new mapboxgl.Marker({ color: "#22c55e" })
            .setLngLat([lng, lat])
            .addTo(m);
          setStatus("Locating property — auto-trace runs when the map settles.");
          m.once("moveend", () => {
            m.once("idle", () => {
              window.setTimeout(() => tryAutoTraceFootprint(lng, lat), 400);
            });
          });
        } catch (e) {
          console.error("RoofTraceMap flyTo failed:", e);
        }
      };

      const ic = initialCenterRef.current;
      if (ic && Number.isFinite(ic.lat) && Number.isFinite(ic.lng)) {
        runFlyToPropertyRef.current(map, ic.lng, ic.lat);
      }
    });

    return () => {
      try {
        centerMarkerRef.current?.remove();
      } catch {
        // ignore
      }
      centerMarkerRef.current = null;
      try {
        mapRef.current?.remove();
      } catch {
        // ignore
      }
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!initialCenter || !Number.isFinite(initialCenter.lat) || !Number.isFinite(initialCenter.lng)) return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    runFlyToPropertyRef.current(map, initialCenter.lng, initialCenter.lat);
  }, [initialCenter?.lat, initialCenter?.lng]);

  return (
    <View style={styles.container}>
      <View style={styles.map} ref={mapContainerRef} nativeID={MAP_CONTAINER_ID} />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayRow}>
          <Feather name="edit-3" size={16} color="#fff" />
          <Text style={styles.overlayText}>{status}</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.bottomHint}>Tip: footprint auto-fill is best-effort; refine with the polygon tool.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 320, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#1f2937" },
  map: { flex: 1 },
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
  },
  overlayRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  overlayText: { color: "#fff", fontWeight: "700", fontSize: 13, marginTop: 0 },
  bottomRow: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
  },
  bottomHint: { color: "#fff", opacity: 0.9, fontSize: 12, textAlign: "center" },
});
