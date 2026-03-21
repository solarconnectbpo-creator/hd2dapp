/**
 * Map trace visuals by roofing material — fill + draw stroke driven by MATERIAL_THEMES.
 */

import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import type { RoofMaterialType } from "@/src/roofReports/roofLogicEngine";

export const PATCHED_ROOF_SOURCE_ID = "patched-roof-source";
export const PATCHED_ROOF_LAYER_ID = "patched-roof-layer";

export const MATERIAL_THEMES = {
  shingle: { color: "#4A4A4A", opacity: 0.6, lineWeight: 2 },
  tile: { color: "#D35400", opacity: 0.7, lineWeight: 4 },
  slate: { color: "#2C3E50", opacity: 0.8, lineWeight: 3 },
  tpo: { color: "#ffffff", opacity: 0.4, lineWeight: 1 },
  metal: { color: "#7F8C8D", opacity: 0.6, lineWeight: 2 },
} as const;

export type MaterialThemeKey = keyof typeof MATERIAL_THEMES;

export type MaterialTheme = (typeof MATERIAL_THEMES)[MaterialThemeKey];

const TRACE_LABELS: Record<string, string> = {
  shingle: "Charcoal grey (shingle)",
  tile: "Terracotta orange (tile)",
  slate: "Deep blue-grey (slate)",
  tpo: "Reflective white (TPO)",
  metal: "Cool silver (metal)",
};

export function getMaterialTheme(material?: RoofMaterialType | string): MaterialTheme {
  const k = String(material ?? "shingle").toLowerCase();
  return (MATERIAL_THEMES as Record<string, MaterialTheme>)[k] ?? MATERIAL_THEMES.shingle;
}

/** Same pattern as your snippet: set fill paint on `patched-roof-layer`. */
export function updateMapPaintForMaterial(
  map: MapboxMap,
  selectedMaterial?: RoofMaterialType | string,
): void {
  const theme = getMaterialTheme(selectedMaterial);
  if (!map.getLayer(PATCHED_ROOF_LAYER_ID)) return;
  map.setPaintProperty(PATCHED_ROOF_LAYER_ID, "fill-color", theme.color);
  map.setPaintProperty(PATCHED_ROOF_LAYER_ID, "fill-opacity", theme.opacity);
}

/** Alias for `updateMapPaintForMaterial` (matches common naming). */
export const updateMapVisuals = updateMapPaintForMaterial;

export function syncPatchedRoofGeoJson(
  map: MapboxMap,
  feature: GeoJSON.Feature | GeoJSON.FeatureCollection | null,
): void {
  const src = map.getSource(PATCHED_ROOF_SOURCE_ID) as GeoJSONSource | undefined;
  if (!src) return;
  const data: GeoJSON.FeatureCollection =
    feature == null
      ? { type: "FeatureCollection", features: [] }
      : feature.type === "FeatureCollection"
        ? feature
        : { type: "FeatureCollection", features: [feature as GeoJSON.Feature] };
  src.setData(data);
}

export type MaterialTracePalette = {
  accent: string;
  halo: string;
  vertexFill: string;
  vertexStroke: string;
  label: string;
};

export function getMaterialTracePalette(material?: RoofMaterialType | string): MaterialTracePalette {
  const t = getMaterialTheme(material);
  const k = String(material ?? "shingle").toLowerCase();
  const halo = t.color.toLowerCase() === "#ffffff" ? "#0F172A" : "#FFFFFF";
  return {
    accent: t.color,
    halo,
    vertexFill: t.color,
    vertexStroke: halo,
    label: TRACE_LABELS[k] ?? TRACE_LABELS.shingle,
  };
}

/** Mapbox GL Draw style objects for the active roof trace polygon (stroke matches theme lineWeight). */
export function buildPolygonDrawStyles(material?: RoofMaterialType | string) {
  const t = getMaterialTheme(material);
  const p = getMaterialTracePalette(material);
  const outerW = Math.max(4, t.lineWeight + 4);
  const innerW = Math.max(2, t.lineWeight);
  return [
    {
      id: "gl-draw-polygon-border",
      type: "line",
      filter: ["all", ["==", "$type", "Polygon"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": p.halo, "line-width": outerW },
    },
    {
      id: "gl-draw-polygon-yellow",
      type: "line",
      filter: ["all", ["==", "$type", "Polygon"]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": t.color,
        "line-width": innerW,
        "line-opacity": 0.95,
      },
    },
    {
      id: "gl-draw-points",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"]],
      paint: {
        "circle-color": t.color,
        "circle-radius": 5,
        "circle-stroke-color": p.vertexStroke,
        "circle-stroke-width": 2,
      },
    },
  ];
}
