import type mapboxgl from "mapbox-gl";

/**
 * Microsoft US Building Footprints on the map (web / Mapbox GL).
 *
 * Raw state GeoJSON from the GitHub release is hundreds of MB–GB per state
 * ([microsoft/USBuildingFootprints](https://github.com/microsoft/USBuildingFootprints)),
 * so we use Esri's vector tile mirror of the same dataset:
 * [Microsoft Building Footprints – Tiles](https://www.arcgis.com/home/item.html?id=f40326b0dea54330ae39584012807126)
 *
 * License: ODbL (see repo LICENSE-DATA).
 */

export const MS_BUILDING_FOOTPRINTS_SOURCE_ID = "microsoft-building-footprints";
export const MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID =
  "microsoft-building-footprints-fill";
export const MS_BUILDING_FOOTPRINTS_LINE_LAYER_ID =
  "microsoft-building-footprints-line";

/** ArcGIS VectorTileServer; template uses `{z}/{y}/{x}` per service metadata. */
export const MS_BUILDING_FOOTPRINTS_TILES_URL =
  "https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/Microsoft_Building_Footprints/VectorTileServer/tile/{z}/{y}/{x}.pbf";

/** Layer name inside the PMTiles / MVT (from Esri `root.json`). */
export const MS_BUILDING_FOOTPRINTS_SOURCE_LAYER = "MSBFLow";

function getFirstSymbolLayerId(map: mapboxgl.Map): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  for (const layer of layers) {
    if (layer.type === "symbol") return layer.id;
  }
  return undefined;
}

/**
 * Adds semi-transparent footprint polygons (zoom 13–16 matches tile LOD; keeps tile load reasonable).
 * Inserts below symbol layers so labels stay readable on `satellite-streets`.
 */
export function addMicrosoftBuildingFootprintsToMap(map: mapboxgl.Map): void {
  if (map.getSource(MS_BUILDING_FOOTPRINTS_SOURCE_ID)) return;

  try {
    map.addSource(MS_BUILDING_FOOTPRINTS_SOURCE_ID, {
      type: "vector",
      tiles: [MS_BUILDING_FOOTPRINTS_TILES_URL],
      minzoom: 13,
      maxzoom: 16,
      attribution:
        '<a href="https://github.com/microsoft/USBuildingFootprints" target="_blank" rel="noreferrer">Microsoft footprints</a>',
    });
  } catch (e) {
    console.warn("Microsoft building footprints: failed to add source", e);
    return;
  }

  const beforeId = getFirstSymbolLayerId(map);

  const fillLayer: mapboxgl.AnyLayer = {
    id: MS_BUILDING_FOOTPRINTS_FILL_LAYER_ID,
    type: "fill",
    source: MS_BUILDING_FOOTPRINTS_SOURCE_ID,
    "source-layer": MS_BUILDING_FOOTPRINTS_SOURCE_LAYER,
    minzoom: 13,
    maxzoom: 22,
    paint: {
      "fill-color": "#38bdf8",
      "fill-opacity": 0.22,
    },
  };

  const lineLayer: mapboxgl.AnyLayer = {
    id: MS_BUILDING_FOOTPRINTS_LINE_LAYER_ID,
    type: "line",
    source: MS_BUILDING_FOOTPRINTS_SOURCE_ID,
    "source-layer": MS_BUILDING_FOOTPRINTS_SOURCE_LAYER,
    minzoom: 13,
    maxzoom: 22,
    paint: {
      "line-color": "#7dd3fc",
      "line-width": 1,
      "line-opacity": 0.85,
    },
  };

  try {
    if (beforeId) {
      map.addLayer(fillLayer, beforeId);
      map.addLayer(lineLayer, beforeId);
    } else {
      map.addLayer(fillLayer);
      map.addLayer(lineLayer);
    }
  } catch (e) {
    console.warn("Microsoft building footprints: failed to add layers", e);
  }
}
