/**
 * Canonical production origin (marketing / SPA host).
 */
export const HD2D_PRODUCTION_ORIGIN = "https://hardcoredoortodoorclosers.com";

/**
 * Stable production host for API when the SPA is not on the HD2D zone (e.g. `*.vercel.app` previews).
 * Use **www** here, not bare apex: Vercel often redirects apex → www; routing `/api/*` on www avoids redirect loops with that setting.
 */
export const HD2D_PRODUCTION_WWW_ORIGIN = "https://www.hardcoredoortodoorclosers.com";

/**
 * Legacy “public API” origin (apex). Prefer {@link HD2D_PRODUCTION_WWW_ORIGIN} for cross-origin calls off-zone when www is canonical on Vercel.
 */
export const HD2D_PUBLIC_API_ORIGIN = HD2D_PRODUCTION_ORIGIN;

/**
 * Deployed Worker `workers.dev` URL (Wrangler default hostname). Use only for diagnostics or
 * server-side tools; **do not** send production browsers here if Access may be enabled.
 */
export const HD2D_WORKER_API_ORIGIN = "https://hd2d-backend.solarconnectbpo.workers.dev";

/**
 * Primary site apex — subdomains on this zone.
 * Same-origin `/api/*`: **Vercel** → `vercel.json` rewrite to Worker; **Pages** → `functions/api/*`.
 */
export const HD2D_SITE_ROOT = "hardcoredoortodoorclosers.com";

function sameOriginApiProxyEnabled(): boolean {
  if (import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "true" || import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "1") {
    return true;
  }
  if (import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "false" || import.meta.env.VITE_HD2D_SAME_ORIGIN_API === "0") {
    return false;
  }
  // Vercel: `/api/*` is proxied via `vercel.json`; browser must call `/api` on the **current** host (see resolveProductionApiOrigin).
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
 * - **`*.vercel.app`:** {@link HD2D_PRODUCTION_WWW_ORIGIN} (`/api/*` rewrites live on that host).
 * - **HD2D zone:** same-origin when `sameOriginApiProxyEnabled()`.
 */
export function apiOriginForHostname(hostname: string): string | null {
  const h = hostname.trim().toLowerCase();
  if (!h) return null;
  if (h.endsWith(".vercel.app")) return HD2D_PRODUCTION_WWW_ORIGIN;
  if (h.endsWith(".pages.dev") && !sameOriginApiProxyEnabled()) return HD2D_PUBLIC_API_ORIGIN;
  if (isHd2dZoneHostname(h)) return null;
  return null;
}

/**
 * API base origin in production for `getHd2dApiBase()`.
 * - **Vercel + HD2D hostname (apex, www, subdomains):** `window.location.origin` + `/api/*` (rewrites on that host).
 * - **`*.vercel.app` previews:** {@link HD2D_PRODUCTION_WWW_ORIGIN}.
 * - **`*.pages.dev`:** same-origin `/api/*` when `sameOriginApiProxyEnabled()` (Pages proxy); else apex.
 * - **HD2D apex / www:** same-origin `/api/*` when `sameOriginApiProxyEnabled()`.
 */
export function resolveProductionApiOrigin(): string {
  const pub = HD2D_PUBLIC_API_ORIGIN.replace(/\/$/, "");
  const wwwStable = HD2D_PRODUCTION_WWW_ORIGIN.replace(/\/$/, "");
  if (typeof window === "undefined") return pub;
  const host = (window.location.hostname || "").trim().toLowerCase();
  const origin = window.location.origin.replace(/\/$/, "");
  if (host.endsWith(".vercel.app")) return wwwStable;
  if (import.meta.env.VERCEL && isHd2dZoneHostname(host)) return origin;
  if (host.endsWith(".pages.dev") && sameOriginApiProxyEnabled()) return origin;
  if (host.endsWith(".pages.dev")) return pub;
  if (isHd2dZoneHostname(host) && sameOriginApiProxyEnabled()) return origin;
  return pub;
}
