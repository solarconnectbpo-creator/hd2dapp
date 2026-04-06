/**
 * Canonical production origin (marketing / SPA host).
 */
export const HD2D_PRODUCTION_ORIGIN = "https://hardcoredoortodoorclosers.com";

/**
 * Apex origin used for cross-origin API calls (e.g. Vercel previews → `https://…/api/*` on Pages).
 * Same-origin Pages hosts use `window.location.origin` + `/api/*` (Functions proxy to `*.workers.dev`).
 */
export const HD2D_PUBLIC_API_ORIGIN = HD2D_PRODUCTION_ORIGIN;

/**
 * Deployed Worker `workers.dev` URL (Wrangler default hostname). Use only for diagnostics or
 * server-side tools; **do not** send production browsers here if Access may be enabled.
 */
export const HD2D_WORKER_API_ORIGIN = "https://hd2d-backend.solarconnectbpo.workers.dev";

/**
 * Primary site apex — subdomains on this zone.
 * Same-origin `/api/*` is served by **Pages Functions** (proxy to Worker `*.workers.dev`); see `functions/api/*`.
 */
export const HD2D_SITE_ROOT = "hardcoredoortodoorclosers.com";

function sameOriginApiProxyEnabled(): boolean {
  if (import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "true" || import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "1") {
    return true;
  }
  if (import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "false" || import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "0") {
    return false;
  }
  // Vercel static hosting has no `/api` proxy — call apex API (Pages on zone) cross-origin
  if (import.meta.env.VERCEL) return false;
  // Cloudflare Pages: same-origin `/api/*` (apex, www, *.pages.dev previews)
  return true;
}

export function isHd2dZoneHostname(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  return h === HD2D_SITE_ROOT || h.endsWith(`.${HD2D_SITE_ROOT}`);
}

/**
 * Hosts where the SPA must use {@link HD2D_PUBLIC_API_ORIGIN} (cross-origin) instead of the page origin.
 * - **`*.pages.dev`:** same-origin `/api/*` when `sameOriginApiProxyEnabled()`; else apex.
 * - **`*.vercel.app`:** apex API.
 * - **HD2D zone:** same-origin when `sameOriginApiProxyEnabled()`.
 */
export function apiOriginForHostname(hostname: string): string | null {
  const h = hostname.trim().toLowerCase();
  if (!h) return null;
  if (h.endsWith(".vercel.app")) return HD2D_PUBLIC_API_ORIGIN;
  if (h.endsWith(".pages.dev") && !sameOriginApiProxyEnabled()) return HD2D_PUBLIC_API_ORIGIN;
  if (isHd2dZoneHostname(h)) return null;
  return null;
}

/**
 * API base origin in production for `getHd2dApiBase()`.
 * - **Vercel builds:** {@link HD2D_PUBLIC_API_ORIGIN}.
 * - **`*.pages.dev`:** same-origin `/api/*` when `sameOriginApiProxyEnabled()` (Pages proxy); else apex.
 * - **HD2D apex / www:** same-origin `/api/*` when `sameOriginApiProxyEnabled()`.
 */
export function resolveProductionApiOrigin(): string {
  const pub = HD2D_PUBLIC_API_ORIGIN.replace(/\/$/, "");
  if (typeof window === "undefined") return pub;
  const host = (window.location.hostname || "").trim().toLowerCase();
  const origin = window.location.origin.replace(/\/$/, "");
  if (host.endsWith(".vercel.app")) return pub;
  if (host.endsWith(".pages.dev") && sameOriginApiProxyEnabled()) return origin;
  if (host.endsWith(".pages.dev")) return pub;
  if (isHd2dZoneHostname(host) && sameOriginApiProxyEnabled()) return origin;
  return pub;
}
