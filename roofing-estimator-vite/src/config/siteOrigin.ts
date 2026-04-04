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

/**
 * Primary site apex — subdomains on this zone.
 * Same-origin `/api/*` only when `VITE_HD2D_SAME_ORIGIN_API` is set (Cloudflare Pages Functions). Vercel SPA uses the Worker URL.
 */
export const HD2D_SITE_ROOT = "hardcoredoortodoorclosers.com";

function sameOriginApiProxyEnabled(): boolean {
  return (
    import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "true" || import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "1"
  );
}

export function isHd2dZoneHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === HD2D_SITE_ROOT || h.endsWith(`.${HD2D_SITE_ROOT}`);
}

/**
 * Hosts where the SPA must call the Worker URL directly (no same-origin `/api` bundle).
 * Returns null for the HD2D zone when same-origin `/api` is configured (`VITE_HD2D_SAME_ORIGIN_API`); else treat like direct Worker.
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
 * - **Default:** `HD2D_WORKER_API_ORIGIN` (Vercel / any host where `/api/*` is not the Worker proxy).
 * - **Cloudflare Pages** with `functions/api/*` → set `VITE_HD2D_SAME_ORIGIN_API=true` so calls use same-origin `/api/*`.
 * - `*.vercel.app` / `*.pages.dev`: always Worker (no same-origin API bundle).
 */
export function resolveProductionApiOrigin(): string {
  const worker = HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
  if (typeof window === "undefined") return worker;
  const host = (window.location.hostname || "").trim().toLowerCase();
  const origin = window.location.origin.replace(/\/$/, "");
  if (host.endsWith(".vercel.app") || host.endsWith(".pages.dev")) return worker;
  if (isHd2dZoneHostname(host) && sameOriginApiProxyEnabled()) return origin;
  return worker;
}
