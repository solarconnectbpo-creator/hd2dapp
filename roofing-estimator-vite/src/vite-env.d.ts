/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_BATCHDATA_API_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  readonly VITE_PDL_API_KEY?: string;
  readonly VITE_USE_API_PROXY?: string;
  /** When "true", hides BatchData / Places / PDL UI (CSV-only + manual enrichment). */
  readonly VITE_PROPERTY_SCRAPER_OFFLINE?: string;
  /** Optional ArcGIS API key for authenticated Feature layer queries (overrides org-stored key). */
  readonly VITE_ARCGIS_API_KEY?: string;
  /** Default Feature layer URL for Canvassing overlay (overrides Contacts setting when set). */
  readonly VITE_ARCGIS_FEATURE_LAYER_URL?: string;
  /**
   * Optional override for EagleView TrueDesign base (default: `{VITE_INTEL_API_BASE}/api/eagleview/apicenter`).
   */
  readonly VITE_EAGLEVIEW_API_BASE?: string;
  /** Only with VITE_EAGLEVIEW_API_BASE — direct Bearer from the browser (discouraged). */
  readonly VITE_EAGLEVIEW_ACCESS_TOKEN?: string;
}
