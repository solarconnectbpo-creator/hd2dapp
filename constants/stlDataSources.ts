/**
 * St. Louis public GIS & weather endpoints (read-only; no API keys).
 * Parcel assessor host differs from SLDC/BUILDING_DIVISION (maps8).
 */

/** Approximate Missouri state bounding box (WGS84) for IEM / in-state checks. */
export const MISSOURI_BBOX = {
  west: -95.78,
  east: -89.09,
  north: 40.62,
  south: 35.99,
} as const;

/** City of St. Louis — Assessor parcels (FeatureServer layer 0; accepts inSR=4326). */
export const STL_ASSESSOR_PARCEL_LAYER =
  "https://services6.arcgis.com/evmyRZRrsopdeog7/arcgis/rest/services/AssessorsParcels/FeatureServer/0";

/** SLDC — Building permits (points). Layer id is 1 on this service. */
export const STL_SLDC_BUILDING_PERMITS_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/Building_Permits/FeatureServer/1";

/** SLDC — Trades permits (plumbing / electrical, etc.). */
export const STL_SLDC_TRADES_PERMITS_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/Trades_Permits/FeatureServer/0";

/** SLDC — Tax sales (polygons). */
export const STL_SLDC_TAX_SALES_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/Tax_Sales/FeatureServer/0";

/** Building Division — Demolitions (polygons). */
export const STL_BUILDING_DEMOLITIONS_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/BUILDING_DIVISION/Demolitions/FeatureServer/0";

/** SLDC — LRA “in path” parcels (polygons). */
export const STL_SLDC_LRA_IN_PATH_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/LRA_in_Path/FeatureServer/0";

/** MapServer for identify/export (parcels + zoning on one map). */
export const STL_ASSESSOR_PUBLIC_PARCELS_MAPSERVER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/ASSESSOR/Assessor_Public_Parcels/MapServer";

/** NOAA — Local Storm Reports vector service. */
export const NOAA_NWS_LSR_MAPSERVER =
  "https://mapservices.weather.noaa.gov/vector/rest/services/obs/nws_local_storm_reports/MapServer";

/** IEM — Local Storm Reports GeoJSON (states, hours, bbox). */
export const IEM_LSR_GEOJSON =
  "https://mesonet.agron.iastate.edu/geojson/lsr.geojson";

/** SPC — Day 1 convective outlook (latest GeoJSON). */
export const SPC_DAY1_OUTLOOK_GEOJSON =
  "https://www.spc.noaa.gov/products/outlook/day1otlk_latest.geojson";

/** NWS API v1 — active alerts (GeoJSON). Use User-Agent per https://www.weather.gov/documentation/services-web-api */
export const NWS_API_BASE = "https://api.weather.gov";

/** Esri World Imagery XYZ (use as raster tiles; attribute Esri + contributors). */
export const ESRI_WORLD_IMAGERY_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

export type StLouisDataSourceId =
  | "assessor_parcel"
  | "sldc_building_permits"
  | "sldc_trades_permits"
  | "lra_in_path"
  | "tax_sales"
  | "demolition"
  | "noaa_lsr_mapserver"
  | "spc_day1"
  | "nws_alerts"
  | "iem_lsr_geojson"
  | "esri_world_imagery";

export type StLouisDataSourceMeta = {
  id: StLouisDataSourceId;
  title: string;
  description: string;
  endpoint: string;
  notes?: string;
};

export const ST_LOUIS_DATA_SOURCE_CATALOG: StLouisDataSourceMeta[] = [
  {
    id: "assessor_parcel",
    title: "St. Louis City Assessor — Parcels",
    description: "Parcel polygons & assessment attributes (ArcGIS REST).",
    endpoint: STL_ASSESSOR_PARCEL_LAYER,
  },
  {
    id: "sldc_building_permits",
    title: "SLDC — Building permits",
    description: "Issued building permits (points).",
    endpoint: STL_SLDC_BUILDING_PERMITS_LAYER,
  },
  {
    id: "sldc_trades_permits",
    title: "SLDC — Trades permits",
    description: "Plumbing, electrical, and other trade permits (points).",
    endpoint: STL_SLDC_TRADES_PERMITS_LAYER,
  },
  {
    id: "lra_in_path",
    title: "LRA — Parcels in path",
    description: "LRA-related parcel polygons (SLDC layer).",
    endpoint: STL_SLDC_LRA_IN_PATH_LAYER,
  },
  {
    id: "tax_sales",
    title: "SLDC — Tax sales",
    description: "Tax sale / foreclosure suit related parcels (polygons).",
    endpoint: STL_SLDC_TAX_SALES_LAYER,
  },
  {
    id: "demolition",
    title: "Building Division — Demolitions",
    description: "Demolition permits / demolition areas (polygons).",
    endpoint: STL_BUILDING_DEMOLITIONS_LAYER,
  },
  {
    id: "noaa_lsr_mapserver",
    title: "NOAA / NWS — Local Storm Reports (MapServer)",
    description: "Official LSR vector layers (time windows vary).",
    endpoint: NOAA_NWS_LSR_MAPSERVER,
    notes: "Use layer list endpoint or prefer IEM GeoJSON for simple GeoJSON.",
  },
  {
    id: "iem_lsr_geojson",
    title: "IEM — Local Storm Reports (GeoJSON)",
    description: "LSR points with flexible filters (~14 days via hours=336).",
    endpoint: IEM_LSR_GEOJSON,
  },
  {
    id: "spc_day1",
    title: "SPC — Day 1 outlook",
    description: "Latest convective outlook (hail / wind / tornado contours).",
    endpoint: SPC_DAY1_OUTLOOK_GEOJSON,
  },
  {
    id: "nws_alerts",
    title: "NWS — Active alerts",
    description: "Active warnings/watches for a lat/lon (GeoJSON).",
    endpoint: `${NWS_API_BASE}/alerts/active`,
  },
  {
    id: "esri_world_imagery",
    title: "Esri World Imagery",
    description: "Satellite basemap tiles for Mapbox / Leaflet raster source.",
    endpoint: ESRI_WORLD_IMAGERY_TILES,
    notes: "Not queried as JSON — use as tile URL in map style.",
  },
];
