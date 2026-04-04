/**
 * Public parcel FeatureServer/MapServer layers for Missouri and Illinois.
 * Each entry is queried only when the map bbox or click intersects its WGS84 rectangle.
 *
 * Not every county publishes a stable, anonymous-queryable ArcGIS REST service; expand via
 * ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON on the Worker (see arcgisParcelFallbacks.ts).
 */

export type ParcelFallbackRegion = {
  id: string;
  /** Full layer URL ending in …/FeatureServer/N or …/MapServer/N */
  layerUrl: string;
  west: number;
  south: number;
  east: number;
  north: number;
};

export const MO_IL_PARCEL_FALLBACK_REGIONS: readonly ParcelFallbackRegion[] = [
  // --- Illinois ---
  {
    id: "cook_il",
    layerUrl: "https://gis.cookcountyil.gov/hosting/rest/services/Hosted/Parcel/FeatureServer/0",
    west: -88.35,
    south: 41.44,
    east: -87.52,
    north: 42.16,
  },
  {
    id: "dupage_il",
    layerUrl:
      "https://gis.dupageco.org/arcgis/rest/services/DuPage_County_IL/ParcelsWithRealEstateCC/FeatureServer/0",
    west: -88.28,
    south: 41.84,
    east: -87.9,
    north: 42.16,
  },
  {
    id: "lake_il",
    layerUrl:
      "https://services3.arcgis.com/HESxeTbDliKKvec2/arcgis/rest/services/OpenData_ParcelPolygons/FeatureServer/0",
    west: -88.42,
    south: 42.06,
    east: -87.58,
    north: 42.52,
  },
  {
    id: "will_il",
    layerUrl: "https://services1.arcgis.com/RzqA4ca3R8Re7lYp/arcgis/rest/services/Parcels/FeatureServer/6",
    west: -88.45,
    south: 41.34,
    east: -87.46,
    north: 41.84,
  },
  {
    id: "rock_island_il",
    layerUrl: "https://services9.arcgis.com/6FnscPPlUa9DXXOk/arcgis/rest/services/Parcels/FeatureServer/0",
    west: -90.92,
    south: 41.02,
    east: -90.0,
    north: 41.64,
  },
  {
    id: "st_clair_il",
    layerUrl: "https://map.stclairco.com/arcgis/rest/services/OwnerParcel_Ingen/MapServer/0",
    west: -90.2,
    south: 38.2,
    east: -89.45,
    north: 38.68,
  },
  {
    id: "madison_il",
    layerUrl: "https://maps.madisonal.gov/server/rest/services/Layers/MapServer/6",
    west: -90.55,
    south: 38.55,
    east: -89.58,
    north: 39.2,
  },
  {
    id: "macon_il",
    layerUrl: "https://maps.decaturil.gov/arcgis/rest/services/Public/parcels/FeatureServer/0",
    west: -89.42,
    south: 39.45,
    east: -88.68,
    north: 40.18,
  },
  // --- Missouri ---
  {
    id: "st_charles_mo",
    // Public parcel queries work on the county’s dev GIS host; prod maps.sccmo.org often serves HTML only.
    layerUrl:
      "https://maps-dev.sccmo.org/server/rest/services/appservices/Parcel_Property_Characteristics/MapServer/0",
    west: -90.95,
    south: 38.65,
    east: -90.25,
    north: 39.12,
  },
  {
    id: "jackson_mo",
    layerUrl: "https://gis.mijackson.org/countygis/rest/services/ParcelViewer/Parcels/FeatureServer/0",
    west: -94.92,
    south: 38.8,
    east: -94.02,
    north: 39.45,
  },
  {
    id: "clay_mo",
    layerUrl: "https://services7.arcgis.com/3c8lLdmDNevrTlaV/ArcGIS/rest/services/ClayCountyParcelService/FeatureServer/0",
    west: -94.68,
    south: 39.18,
    east: -94.05,
    north: 39.45,
  },
  {
    id: "johnson_mo",
    layerUrl:
      "https://gis.warrensburg-mo.com/arcgis/rest/services/third-party/Johnson_County_Pracels_FILTERED/FeatureServer/3",
    west: -94.12,
    south: 38.65,
    east: -93.72,
    north: 39.05,
  },
  {
    id: "platte_mo",
    layerUrl:
      "https://services2.arcgis.com/ji2hJlB9RmHn0um4/arcgis/rest/services/Platte_City_MO_Property_view/FeatureServer/1",
    west: -95.13,
    south: 39.08,
    east: -94.58,
    north: 39.65,
  },
  {
    id: "boone_mo",
    layerUrl: "https://secure.boonecountygis.com/server/rest/services/ParcelLayers/MapServer/1",
    west: -92.58,
    south: 38.68,
    east: -91.95,
    north: 39.24,
  },
  {
    id: "jefferson_mo",
    layerUrl: "https://services6.arcgis.com/rXa0aMElf2BPjgBA/arcgis/rest/services/JCBaseMap/FeatureServer/15",
    west: -90.78,
    south: 38.02,
    east: -90.1,
    north: 38.58,
  },
];
