/**
 * Base URL for the HD2D Cloudflare Worker (intel, BatchData proxy, AI routes, etc.).
 *
 * - **Development (`vite`):** `VITE_INTEL_API_BASE` if set, else same-origin `/intel-proxy` (see `INTEL_PROXY_TARGET` in `vite.config.ts`).
 * - **Production / preview (`vite build` / `vite preview`):** `VITE_INTEL_API_BASE` must be set to your deployed Worker URL (e.g. `https://hd2d-backend.<account>.workers.dev` or a custom domain with `/api/*` routed to the Worker). The Atlas marketing site (e.g. hardcored2dmaps.manus.space) is not the API host unless that deployment explicitly routes `/api/*` to this Worker.
 */

const RAW = import.meta.env.VITE_INTEL_API_BASE;
const PROD_WORKER_FALLBACK = "https://hd2d-backend.solarconnectbpo.workers.dev";

export function getHd2dApiBase(): string {
  const raw = typeof RAW === "string" && RAW.trim() ? RAW.trim() : "";
  if (raw) return raw.replace(/\/$/, "");
  if (import.meta.env.DEV) return "/intel-proxy";
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, "");
    const host = window.location.hostname.toLowerCase();
    // This domain currently serves the SPA for /api paths, so force Worker host until route wiring is fixed.
    if (host === "hardcoredoortodoorclosers.com" || host === "www.hardcoredoortodoorclosers.com") {
      return PROD_WORKER_FALLBACK;
    }
    // General production fallback: same-origin host (supports custom domains routing /api to Worker).
    return origin;
  }
  return "";
}

/** True when intel/BatchData Worker routes have a resolvable base (`/intel-proxy` in dev, or `VITE_INTEL_API_BASE` in production builds). */
export function isHd2dApiConfigured(): boolean {
  return getHd2dApiBase() !== "";
}
