/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BATCHDATA_API_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  readonly VITE_PDL_API_KEY?: string;
  readonly VITE_USE_API_PROXY?: string;
  /** When "true", hides BatchData / Places / PDL UI (CSV-only + manual enrichment). */
  readonly VITE_PROPERTY_SCRAPER_OFFLINE?: string;
}
