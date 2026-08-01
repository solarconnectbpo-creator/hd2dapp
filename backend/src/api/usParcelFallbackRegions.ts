/**
 * Public parcel layers outside the MO-IL and MN built-ins.
 *
 * Each entry is only queried when the map click or bbox intersects its WGS84 rectangle.
 * Hosts must allow anonymous ArcGIS REST queries. Prefer statewide layers when available;
 * otherwise major-metro assessor layers. Dead URLs are omitted — add or override per
 * deployment with Worker var ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON.
 *
 * Nationwide owner names still come primarily from DealMachine (address search). These
 * layers fill GIS attributes (parcel id, lot size, local owner fields) where published.
 */

import type { ParcelFallbackRegion } from "./moIlParcelFallbackRegions";

export const US_PARCEL_FALLBACK_REGIONS: readonly ParcelFallbackRegion[] = [
  {
    id: "fl_statewide",
    /** Florida Department of Revenue statewide cadastral (OWN_NAME + mailing). */
    layerUrl:
      "https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0",
    west: -87.63,
    south: 24.4,
    east: -79.97,
    north: 31.0,
  },
  {
    id: "nc_wake",
    /** Wake County (Raleigh) — OWNER on polygon parcels. */
    layerUrl: "https://maps.wakegov.com/arcgis/rest/services/Property/Parcels/MapServer/0",
    west: -78.99,
    south: 35.52,
    east: -78.25,
    north: 36.07,
  },
  {
    id: "nc_onemap_pts",
    /** NC OneMap parcel points (statewide centroids; owner fields vary). */
    layerUrl: "https://services.nconemap.gov/secure/rest/services/NC1Map_Parcels/MapServer/0",
    west: -84.32,
    south: 33.84,
    east: -75.46,
    north: 36.59,
  },
  {
    id: "ar_parcel_centroids",
    /** Arkansas GIS Office parcel centroids (ownername). */
    layerUrl:
      "https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Planning_Cadastre/MapServer/0",
    west: -94.62,
    south: 33.0,
    east: -89.64,
    north: 36.5,
  },
  {
    id: "ny_mappluto",
    /** NYC MapPLUTO tax lots (OwnerName). */
    layerUrl: "https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0",
    west: -74.26,
    south: 40.49,
    east: -73.7,
    north: 40.92,
  },
  {
    id: "ca_la_county",
    /** Los Angeles County parcels. */
    layerUrl: "https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/0",
    west: -118.95,
    south: 33.7,
    east: -117.65,
    north: 34.82,
  },
  {
    id: "wa_king",
    /** King County (Seattle metro) parcels. */
    layerUrl: "https://gismaps.kingcounty.gov/arcgis/rest/services/Property/KingCo_Parcels/MapServer/0",
    west: -122.55,
    south: 47.07,
    east: -121.06,
    north: 47.78,
  },
  {
    id: "dc_residential_cama",
    /** Washington DC residential CAMA / land records layer. */
    layerUrl:
      "https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Property_and_Land_WebMercator/MapServer/25",
    west: -77.12,
    south: 38.79,
    east: -76.91,
    north: 39.0,
  },
  {
    id: "tx_harris_hcad",
    /** Harris County Appraisal District parcels (Houston metro). */
    layerUrl: "https://www.gis.hctx.net/arcgis/rest/services/HCAD/Parcels/MapServer/0",
    west: -95.95,
    south: 29.5,
    east: -94.9,
    north: 30.2,
  },
  {
    id: "mn_hennepin",
    /** Hennepin County parcels (Minneapolis metro). */
    layerUrl: "https://gis.hennepin.us/arcgis/rest/services/HennepinData/LAND_PROPERTY/MapServer/1",
    west: -93.77,
    south: 44.79,
    east: -93.15,
    north: 45.25,
  },
];
