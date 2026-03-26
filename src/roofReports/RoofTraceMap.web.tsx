import React, { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, Text } from "react-native";

import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

import * as turf from "@turf/turf";

import type { RoofTraceMapProps } from "./RoofTraceMap";
import { Feather } from "@expo/vector-icons";
import {
  addMicrosoftBuildingFootprintsToMap,
  MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID,
  MS_BUILDING_FOOTPRINTS_SOURCE_ID,
  MS_BUILDING_FOOTPRINTS_SOURCE_LAYER,
} from "./msBuildingFootprintsMapbox";
import {
  isPolyLikeFeature,
  selectBestFootprintForPin,
} from "./roofTraceFootprintSelection";
import { enhanceRoofTraceWith3D } from "./roofTrace3d";
import {
  buildPolygonDrawStyles,
  getMaterialTracePalette,
  getMaterialTheme,
  PATCHED_ROOF_LAYER_ID,
  PATCHED_ROOF_SOURCE_ID,
  syncPatchedRoofGeoJson,
  updateMapPaintForMaterial,
} from "./roofMaterialOverlay";
import { waitForHtmlElement } from "./mapDomUtils";
import {
  computePolygonFootprintAreaSqFt,
  computePolygonPerimeterFeet,
} from "./roofPolygonMetrics";

const MAP_CONTAINER_ID = "roofTraceMapContainer";
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

function getLargestPolyLikeFeature(features: any[]): any | null {
  const polys = (features ?? []).filter(isPolyLikeFeature);
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

/** Footprints near the pin from loaded vector tiles (fallback when rendered query is empty). */
function queryFootprintsFromSourceNearPin(
  map: mapboxgl.Map,
  lng: number,
  lat: number,
): GeoJSON.Feature[] {
  if (!map.getSource(MS_BUILDING_FOOTPRINTS_SOURCE_ID)) return [];
  try {
    const all = map.querySourceFeatures(MS_BUILDING_FOOTPRINTS_SOURCE_ID, {
      sourceLayer: MS_BUILDING_FOOTPRINTS_SOURCE_LAYER,
    });
    const pt = turf.point([lng, lat]);
    const buffered = turf.buffer(pt, 0.06, { units: "kilometers" });
    if (!buffered) return [];
    const bbox = turf.bbox(buffered);
    return all.filter((f) => {
      if (!isPolyLikeFeature(f)) return false;
      try {
        const fb = turf.bbox(f as GeoJSON.Feature);
        return !(
          fb[0] > bbox[2] ||
          fb[2] < bbox[0] ||
          fb[1] > bbox[3] ||
          fb[3] < bbox[1]
        );
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}

/** Single Polygon Feature for MapboxDraw from footprint query. */
function normalizeFootprintForDraw(
  raw: any,
): GeoJSON.Feature<GeoJSON.Polygon> | null {
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
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: bestCoords },
    };
  }
  return null;
}

export default function RoofTraceMap({
  initialCenter,
  onTraceChange,
  autoTraceFromFootprint = true,
  traceMaterialType,
}: RoofTraceMapProps) {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const onTraceChangeRef = useRef(onTraceChange);
  const lastMetricsRef = useRef<{
    roofAreaSqFt?: number;
    roofPerimeterFt?: number;
    hasGeoJson: boolean;
  } | null>(null);
  const traceGenerationRef = useRef(0);
  const centerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const updateFromDrawRef = useRef<() => void>(() => {});
  const autoTraceKeyRef = useRef<string>("");
  const autoTraceFromFootprintRef = useRef(autoTraceFromFootprint);
  const initialCenterRef = useRef(initialCenter);
  const runFlyToPropertyRef = useRef<
    (m: mapboxgl.Map, lng: number, lat: number) => void
  >(() => {});
  const [status, setStatus] = useState("Draw your roof polygon");
  const mapContainerRef = useRef<any>(null);
  const traceMaterialTypeRef = useRef(traceMaterialType);
  const appliedTraceMaterialRef = useRef<string | null>(null);
  const materialLabel = getMaterialTracePalette(traceMaterialType).label;

  useEffect(() => {
    traceMaterialTypeRef.current = traceMaterialType;
  }, [traceMaterialType]);

  /** Keep `patched-roof-layer` paint in sync when material changes (same idea as setPaintProperty). */
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = mapRef.current;
    if (!map?.getLayer(PATCHED_ROOF_LAYER_ID)) return;
    updateMapPaintForMaterial(map, traceMaterialType);
  }, [traceMaterialType]);

  /** Swap MapboxDraw styles when material changes (keeps traced geometry). */
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw || !map.isStyleLoaded()) return;

    const next = String(traceMaterialType ?? "shingle").toLowerCase();
    if (appliedTraceMaterialRef.current === next) return;

    let fc: GeoJSON.FeatureCollection | null = null;
    try {
      fc = draw.getAll();
    } catch {
      fc = null;
    }

    const newDraw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
      styles: buildPolygonDrawStyles(next) as any,
    });

    try {
      map.removeControl(draw);
    } catch {
      // ignore
    }
    map.addControl(newDraw, "top-left");
    drawRef.current = newDraw;
    appliedTraceMaterialRef.current = next;

    if (fc?.features?.length) {
      try {
        newDraw.add(fc);
      } catch {
        // ignore
      }
    }
    updateFromDrawRef.current();
  }, [traceMaterialType]);

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

  const tryAutoTraceFootprint = (lng: number, lat: number, attempt = 0) => {
    if (!autoTraceFromFootprintRef.current) return;
    const map = mapRef.current;
    const draw = drawRef.current;
    if (!map || !draw || !Number.isFinite(lng) || !Number.isFinite(lat)) return;

    const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    if (autoTraceKeyRef.current === key) return;

    const maxAttempts = 4;
    const retryDelaysMs = [0, 280, 600, 1100];

    try {
      if (!map.getLayer(MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID)) {
        if (attempt < maxAttempts - 1) {
          setStatus("Footprints loading — retrying auto-trace…");
          window.setTimeout(
            () => tryAutoTraceFootprint(lng, lat, attempt + 1),
            retryDelaysMs[attempt + 1] ?? 500,
          );
        } else {
          setStatus("Footprints not ready — draw the roof polygon manually.");
        }
        return;
      }

      const pt = map.project([lng, lat]);
      const zoom = map.getZoom();
      const pad = Math.max(48, Math.min(110, 130 - zoom * 3.2));

      const rendered = map.queryRenderedFeatures(
        [
          [pt.x - pad, pt.y - pad],
          [pt.x + pad, pt.y + pad],
        ] as [mapboxgl.PointLike, mapboxgl.PointLike],
        { layers: [MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID] },
      );

      let candidates = rendered.filter(isPolyLikeFeature) as GeoJSON.Feature[];
      if (!candidates.length) {
        candidates = queryFootprintsFromSourceNearPin(map, lng, lat);
      }

      const chosenRaw = selectBestFootprintForPin(candidates, lng, lat, {
        maxEdgeDistanceMeters: 56,
      });

      const normalized = chosenRaw
        ? normalizeFootprintForDraw(chosenRaw)
        : null;
      if (!normalized) {
        if (attempt < maxAttempts - 1) {
          setStatus("Aligning footprint tiles — retrying…");
          window.setTimeout(
            () => tryAutoTraceFootprint(lng, lat, attempt + 1),
            retryDelaysMs[attempt + 1] ?? 500,
          );
        } else {
          setStatus(
            "No footprint matched the pin within ~55m — move the pin onto the roof or draw manually.",
          );
        }
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
      setStatus(
        "Auto-traced from Microsoft building footprint — verify edges for measurement accuracy.",
      );
      updateFromDrawRef.current();
    } catch (e) {
      console.warn("tryAutoTraceFootprint:", e);
      setStatus("Footprint auto-trace failed — draw manually.");
    }
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;

    let cancelled = false;
    let cleanupMap: (() => void) | undefined;

    const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN as string | undefined;
    const hasMapboxToken = !!token?.trim();
    if (hasMapboxToken) {
      mapboxgl.accessToken = token!.trim();
    }

    const cancelWait = waitForHtmlElement(
      () => {
        const maybeContainer = mapContainerRef.current as any;
        if (maybeContainer instanceof HTMLElement) {
          return maybeContainer as HTMLElement;
        }
        return document.getElementById(MAP_CONTAINER_ID);
      },
      (containerEl) => {
        if (cancelled) return;

        const ic = initialCenterRef.current;
        const lat0 = ic?.lat ?? 39.8283;
        const lng0 = ic?.lng ?? -98.5795;

        const map = new mapboxgl.Map({
          container: containerEl as HTMLDivElement,
          style: hasMapboxToken
            ? "mapbox://styles/mapbox/satellite-streets-v11"
            : OSM_FALLBACK_STYLE,
          center: [lng0, lat0],
          zoom: 17,
          pitch: 45,
          bearing: 0,
          antialias: true,
        });
        mapRef.current = map;

        const updateFromDraw = () => {
          try {
            const drawInst = drawRef.current;
            if (!drawInst) return;
            const all = drawInst.getAll();
            const feature = getLargestPolyLikeFeature(all.features ?? []);

            const mapInstance = mapRef.current;
            if (mapInstance) {
              syncPatchedRoofGeoJson(mapInstance, feature ?? null);
              updateMapPaintForMaterial(
                mapInstance,
                traceMaterialTypeRef.current,
              );
            }

            if (!feature) {
              traceGenerationRef.current += 1;
              onTraceChangeRef.current(null);
              lastMetricsRef.current = null;
              setStatus("Draw your roof polygon");
              return;
            }

            const areaSqFt = computePolygonFootprintAreaSqFt(
              feature as GeoJSON.Feature<
                GeoJSON.Polygon | GeoJSON.MultiPolygon
              >,
            );
            const perimeterFt =
              feature.geometry?.type === "Polygon"
                ? computePolygonPerimeterFeet(
                    feature as GeoJSON.Feature<GeoJSON.Polygon>,
                  )
                : undefined;

            const roundedArea =
              areaSqFt && Number.isFinite(areaSqFt)
                ? Math.round(areaSqFt)
                : undefined;
            const roundedPerimeter =
              perimeterFt && Number.isFinite(perimeterFt)
                ? Math.round(perimeterFt)
                : undefined;
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
              const gen = ++traceGenerationRef.current;
              onTraceChangeRef.current({
                roofAreaSqFt: areaSqFt,
                roofPerimeterFt: perimeterFt,
                geoJson: feature,
                roofTracePoints3D: undefined,
                avgTerrainElevationM: undefined,
                terrainPitchEstimate: undefined,
              });
              lastMetricsRef.current = nextFingerprint;

              const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN as
                | string
                | undefined;
              const map = mapRef.current;
              if (token && map && feature.geometry?.type === "Polygon") {
                setStatus("Roof traced — sampling terrain…");
                void (async () => {
                  try {
                    const t3 = await enhanceRoofTraceWith3D(
                      feature as GeoJSON.Feature<GeoJSON.Polygon>,
                      token,
                      map,
                    );
                    if (gen !== traceGenerationRef.current || !t3) return;
                    onTraceChangeRef.current({
                      roofAreaSqFt: areaSqFt,
                      roofPerimeterFt: perimeterFt,
                      geoJson: feature,
                      roofTracePoints3D: t3.points3D,
                      avgTerrainElevationM: t3.avgElevationM,
                      terrainPitchEstimate: t3.estimatedPitch,
                    });
                  } catch (e) {
                    console.warn("enhanceRoofTraceWith3D:", e);
                  } finally {
                    if (gen === traceGenerationRef.current) {
                      setStatus("Roof traced. Measurements updated.");
                    }
                  }
                })();
              } else {
                setStatus("Roof traced. Measurements updated.");
              }
            } else {
              setStatus("Roof traced. Measurements updated.");
            }
          } catch (e) {
            console.error("updateFromDraw failed:", e);
            setStatus("Trace found but metrics failed to compute.");
          }
        };

        updateFromDrawRef.current = updateFromDraw;

        map.on("load", () => {
          if (hasMapboxToken) {
            addMicrosoftBuildingFootprintsToMap(map);
          }

          const mat0 = traceMaterialTypeRef.current ?? "shingle";
          const theme0 = getMaterialTheme(mat0);
          const emptyFc: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: [],
          };
          map.addSource(PATCHED_ROOF_SOURCE_ID, {
            type: "geojson",
            data: emptyFc,
          });
          map.addLayer({
            id: PATCHED_ROOF_LAYER_ID,
            type: "fill",
            source: PATCHED_ROOF_SOURCE_ID,
            paint: {
              "fill-color": theme0.color,
              "fill-opacity": theme0.opacity,
            },
          });

          const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true },
            styles: buildPolygonDrawStyles(
              traceMaterialTypeRef.current ?? "shingle",
            ) as any,
          });
          drawRef.current = draw;
          appliedTraceMaterialRef.current = String(
            traceMaterialTypeRef.current ?? "shingle",
          ).toLowerCase();

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

          if (!hasMapboxToken) {
            setStatus(
              "Mapbox token missing — using OpenStreetMap fallback. Draw roof polygon manually.",
            );
          }

          updateFromDraw();

          runFlyToPropertyRef.current = (m, lng, lat) => {
            if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
            try {
              m.flyTo({
                center: [lng, lat],
                zoom: 19,
                pitch: 45,
                bearing: 0,
                duration: 1000,
              });
              centerMarkerRef.current?.remove();
              centerMarkerRef.current = new mapboxgl.Marker({
                color: "#22c55e",
              })
                .setLngLat([lng, lat])
                .addTo(m);
              setStatus(
                "Locating property — auto-trace runs when the map settles.",
              );
              m.once("moveend", () => {
                m.once("idle", () => {
                  window.setTimeout(
                    () => tryAutoTraceFootprint(lng, lat, 0),
                    520,
                  );
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

        cleanupMap = () => {
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
          appliedTraceMaterialRef.current = null;
        };
      },
      {
        maxFrames: 90,
        onTimeout: () => {
          if (!cancelled) setStatus("Map container not found.");
        },
      },
    );

    return () => {
      cancelled = true;
      cancelWait();
      cleanupMap?.();
    };
    // Map + Draw are created once; callbacks use refs for latest handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (
      !initialCenter ||
      !Number.isFinite(initialCenter.lat) ||
      !Number.isFinite(initialCenter.lng)
    )
      return;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    runFlyToPropertyRef.current(map, initialCenter.lng, initialCenter.lat);
    // Only re-fly when coordinates change, not when the parent object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCenter?.lat, initialCenter?.lng]);

  return (
    <View style={styles.container}>
      <View
        style={styles.map}
        ref={mapContainerRef}
        nativeID={MAP_CONTAINER_ID}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.overlayRow}>
          <Feather name="edit-3" size={16} color="#fff" />
          <Text style={styles.overlayText}>{status}</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.bottomHint}>
          Trace color: {materialLabel}. Tip: center the pin on the roof for the
          best footprint match; edit vertices with the polygon tool to lock
          measurements.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
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
  bottomHint: {
    color: "#fff",
    opacity: 0.9,
    fontSize: 12,
    textAlign: "center",
  },
});
