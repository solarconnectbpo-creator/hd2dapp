/**
 * Canonical production origin (marketing / SPA host).
 */
export const HD2D_PRODUCTION_ORIGIN = "https://hardcoredoortodoorclosers.com";

/**
 * Deployed Worker origin (`wrangler.toml` `name` + account `*.workers.dev`).
 * Used for:
 * - Pages Functions proxy target (`functions/lib/hd2dWorkerOrigin.ts` — keep in sync)
 * - Preview hosts (`*.pages.dev`, `*.vercel.app`) where the SPA has no same-origin `/api` proxy
 */
export const HD2D_WORKER_API_ORIGIN = "https://hd2d-backend.solarconnectbpo.workers.dev";

/** Primary site apex — subdomains on this zone use same-origin `/api/*` when served by this Pages project. */
export const HD2D_SITE_ROOT = "hardcoredoortodoorclosers.com";

export function isHd2dZoneHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === HD2D_SITE_ROOT || h.endsWith(`.${HD2D_SITE_ROOT}`);
}

/**
 * Hosts where the SPA must call the Worker URL directly (no same-origin `/api` bundle).
 * Returns null for the HD2D zone — those use `window.location.origin` + `/api/*` (Pages Functions or zone routes).
 */
export function apiOriginForHostname(hostname: string): string | null {
  const h = hostname.trim().toLowerCase();
  if (!h) return null;
  if (h.endsWith(".vercel.app")) return HD2D_WORKER_API_ORIGIN;
  if (h.endsWith(".pages.dev")) return HD2D_WORKER_API_ORIGIN;
  if (isHd2dZoneHostname(h)) return null;
  return null;
}

/**
 * API base origin in production for `getHd2dApiBase()`.
 * - hardcoredoortodoorclosers.com (and subdomains): same origin so all traffic is under your domain.
 * - Cloudflare / Vercel preview URLs: direct Worker origin.
 */
export function resolveProductionApiOrigin(): string {
  if (typeof window === "undefined") return HD2D_WORKER_API_ORIGIN;
  const host = (window.location.hostname || "").trim().toLowerCase();
  const origin = window.location.origin.replace(/\/$/, "");
  if (isHd2dZoneHostname(host)) return origin;
  if (host.endsWith(".vercel.app") || host.endsWith(".pages.dev")) return HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
  return HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
}
