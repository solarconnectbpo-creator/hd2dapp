/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected in `vite.config.ts` from `process.env.VERCEL_ENV` (`production` | `preview` | …). */
  readonly VERCEL_ENV?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  readonly VITE_PDL_API_KEY?: string;
  readonly VITE_USE_API_PROXY?: string;
  /** When "true", production builds on hardcoredoortodoorclosers.com use same-origin `/api/*` (Cloudflare Pages Functions). */
  readonly VITE_HD2D_SAME_ORIGIN_API?: string;
  readonly VITE_INTEL_API_BASE?: string;
  /** When "true", hides Places / PDL UI (CSV-only + manual enrichment). */
  readonly VITE_PROPERTY_SCRAPER_OFFLINE?: string;
  /** YouTube video id (e.g. `dQw4w9WgXcQ`) for optional /courses hero "Watch trailer" embed. */
  readonly VITE_COURSES_TRAILER_ID?: string;
}
