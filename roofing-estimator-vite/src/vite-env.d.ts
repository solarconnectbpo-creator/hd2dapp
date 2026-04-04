/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected in `vite.config.ts` from `process.env.VERCEL_ENV` (`production` | `preview` | …). */
  readonly VERCEL_ENV?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  readonly VITE_PDL_API_KEY?: string;
  readonly VITE_USE_API_PROXY?: string;
  /** When "true", hides Places / PDL UI (CSV-only + manual enrichment). */
  readonly VITE_PROPERTY_SCRAPER_OFFLINE?: string;
}
