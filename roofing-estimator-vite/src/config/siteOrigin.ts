/**
 * Canonical production origin (marketing / SPA host).
 */
export const HD2D_PRODUCTION_ORIGIN = "https://hardcoredoortodoorclosers.com";

/**
 * Deployed Worker origin (`wrangler.toml` `name` + account `*.workers.dev`).
 * Use for `/api/*` because Cloudflare Pages on the apex often serves HTML for `/api/*` instead of this Worker.
 */
export const HD2D_WORKER_API_ORIGIN = "https://hd2d-backend.solarconnectbpo.workers.dev";

/** Primary site apex — any subdomain on this zone is served by Pages; `/api/*` must use the Worker, not same-origin. */
export const HD2D_SITE_ROOT = "hardcoredoortodoorclosers.com";

/**
 * Where `/api/*` lives for a given hostname. Never same-origin on apex when Pages shadows `/api/*` — use Worker URL.
 */
export function apiOriginForHostname(hostname: string): string | null {
  const h = hostname.trim().toLowerCase();
  if (!h) return null;
  if (h.endsWith(".vercel.app")) return HD2D_WORKER_API_ORIGIN;
  if (h.endsWith(".pages.dev")) return HD2D_WORKER_API_ORIGIN;
  if (h === HD2D_SITE_ROOT || h.endsWith(`.${HD2D_SITE_ROOT}`)) return HD2D_WORKER_API_ORIGIN;
  return null;
}

/**
 * Base URL for Worker `/api/*` in production when `VITE_INTEL_API_BASE` is unset or overridden in `getHd2dApiBase()`.
 */
export function resolveProductionApiOrigin(): string {
  if (typeof window === "undefined") return HD2D_WORKER_API_ORIGIN;
  const host = window.location.hostname || "";
  const mapped = apiOriginForHostname(host);
  if (mapped) return mapped;
  // Unknown host (e.g. extra custom domain on Pages): same-origin `/api/*` is still HTML — use deployed Worker.
  return HD2D_WORKER_API_ORIGIN;
}
