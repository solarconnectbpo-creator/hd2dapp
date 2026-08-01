/**
 * Statewide / metro public parcel layers outside the MO-IL and MN built-ins.
 *
 * Each entry is only queried when the map click or bbox intersects its WGS84 rectangle,
 * so a coarse statewide box is fine. Hosts must allow anonymous ArcGIS REST queries.
 * Add or override per deployment with the Worker var ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON.
 */

import type { ParcelFallbackRegion } from "./moIlParcelFallbackRegions";

export const US_PARCEL_FALLBACK_REGIONS: readonly ParcelFallbackRegion[] = [
  {
    id: "tx_statewide",
    /** Texas statewide stratmap parcels (TNRIS/TxGIO). */
    layerUrl:
      "https://services.arcgis.com/su8ic9KbA7PYVxPS/arcgis/rest/services/Stratmap_Land_Parcels/FeatureServer/0",
    west: -106.65,
    south: 25.84,
    east: -93.51,
    north: 36.5,
  },
  {
    id: "fl_statewide",
    /** Florida Department of Revenue statewide parcels. */
    layerUrl:
      "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0",
    west: -87.63,
    south: 24.4,
    east: -79.97,
    north: 31.0,
  },
  {
    id: "co_statewide",
    /** Colorado statewide parcels (DOLA). */
    layerUrl:
      "https://services1.arcgis.com/aokAqYnJbg8YXCFj/arcgis/rest/services/Colorado_Parcels/FeatureServer/0",
    west: -109.06,
    south: 36.99,
    east: -102.04,
    north: 41.0,
  },
  {
    id: "ok_statewide",
    /** Oklahoma statewide parcels. */
    layerUrl:
      "https://services5.arcgis.com/O2jUwsonyOKtVGyH/arcgis/rest/services/Oklahoma_Parcels/FeatureServer/0",
    west: -103.0,
    south: 33.62,
    east: -94.43,
    north: 37.0,
  },
  {
    id: "ks_statewide",
    /** Kansas statewide parcels (DASC). */
    layerUrl:
      "https://services2.arcgis.com/LlAXsyzuPzuJfWzq/arcgis/rest/services/Kansas_Parcels/FeatureServer/0",
    west: -102.05,
    south: 36.99,
    east: -94.59,
    north: 40.0,
  },
  {
    id: "ne_statewide",
    /** Nebraska statewide parcels (NEGIS). */
    layerUrl:
      "https://gis.ne.gov/enterprise/rest/services/Parcels/MapServer/0",
    west: -104.05,
    south: 39.99,
    east: -95.31,
    north: 43.0,
  },
  {
    id: "ia_statewide",
    /** Iowa statewide parcels. */
    layerUrl:
      "https://services.arcgis.com/8lRhdTmkPQ966eW1/arcgis/rest/services/Iowa_Parcels/FeatureServer/0",
    west: -96.64,
    south: 40.38,
    east: -90.14,
    north: 43.5,
  },
  {
    id: "ar_statewide",
    /** Arkansas GIS Office parcels. */
    layerUrl:
      "https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Parcels/MapServer/0",
    west: -94.62,
    south: 33.0,
    east: -89.64,
    north: 36.5,
  },
  {
    id: "tn_statewide",
    /** Tennessee statewide parcels (TN Comptroller). */
    layerUrl:
      "https://tnmap.tn.gov/arcgis/rest/services/CADASTRAL/Parcels/MapServer/0",
    west: -90.31,
    south: 34.98,
    east: -81.65,
    north: 36.68,
  },
  {
    id: "ga_statewide",
    /** Georgia statewide parcels. */
    layerUrl:
      "https://services1.arcgis.com/5Xkro2j9qNbmSlyx/arcgis/rest/services/Georgia_Parcels/FeatureServer/0",
    west: -85.61,
    south: 30.36,
    east: -80.84,
    north: 35.0,
  },
  {
    id: "nc_statewide",
    /** North Carolina NC OneMap parcels. */
    layerUrl:
      "https://services.nconemap.gov/secure/rest/services/NC1Map_Parcels/MapServer/0",
    west: -84.32,
    south: 33.84,
    east: -75.46,
    north: 36.59,
  },
  {
    id: "az_maricopa",
    /** Maricopa County (Phoenix metro) parcels. */
    layerUrl:
      "https://gis.maricopa.gov/arcgis/rest/services/Assessor/Parcels/MapServer/0",
    west: -113.34,
    south: 32.5,
    east: -111.03,
    north: 34.05,
  },
  {
    id: "dc_citywide",
    /** Washington DC parcels. */
    layerUrl:
      "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/MapServer/25",
    west: -77.12,
    south: 38.79,
    east: -76.91,
    north: 39.0,
  },
];
