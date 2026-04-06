/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected in `vite.config.ts` from `process.env.VERCEL_ENV` (`production` | `preview` | …). */
  readonly VERCEL_ENV?: string;
  /** Injected in `vite.config.ts` from `process.env.VERCEL` — truthy on Vercel so builds skip same-origin `/api`. */
  readonly VERCEL?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  readonly VITE_PDL_API_KEY?: string;
  readonly VITE_USE_API_PROXY?: string;
  /** When "true", production builds on hardcoredoortodoorclosers.com use same-origin `/api/*` (Worker zone routes, not Pages). */
  readonly VITE_HD2D_SAME_ORIGIN_API?: string;
  readonly VITE_INTEL_API_BASE?: string;
  /** When "true", hides Places / PDL UI (CSV-only + manual enrichment). */
  readonly VITE_PROPERTY_SCRAPER_OFFLINE?: string;
  /** YouTube video id (e.g. `dQw4w9WgXcQ`) for optional /courses hero "Watch trailer" embed. */
  readonly VITE_COURSES_TRAILER_ID?: string;
  /** External careers / hiring page URL (login CTA opens this in a new tab). If unset, login links to `/careers`. */
  readonly VITE_CAREERS_URL?: string;
  /** VICIdial / Gradient realtime report; `/call-center` opens this in a new tab and tries an embed. */
  readonly VITE_CALLCENTER_REALTIME_REPORT_URL?: string;
  /** Optional JSON array: `[{ "label": "…", "url": "https://…" }]` for extra report links on `/call-center`. */
  readonly VITE_CALLCENTER_EXTRA_REPORTS_JSON?: string;
  /** JSON array of lead packages for `/leads`: `[{ "key": "…", "title": "…", "description": "…", "stripePriceId": "price_…", "priceLabel": "…" }]`. */
  readonly VITE_LEAD_PACKAGES_JSON?: string;
}
