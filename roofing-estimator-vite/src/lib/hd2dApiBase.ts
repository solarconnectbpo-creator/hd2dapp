/**
 * Base URL for the HD2D Cloudflare Worker (intel, auth, DealMachine proxy, AI routes, etc.).
 *
 * - **Development (`vite`):** `VITE_INTEL_API_BASE` if set, else same-origin `/intel-proxy` (see `INTEL_PROXY_TARGET` in `vite.config.ts`).
 * - **Production on hardcoredoortodoorclosers.com:** `window.location.origin` so the browser calls `https://hardcoredoortodoorclosers.com/api/*`
 *   (Cloudflare Pages Functions proxy to the Worker — see `functions/api/`).
 * - **Preview** (`*.pages.dev`, `*.vercel.app`): direct Worker URL from `siteOrigin.ts`.
 * - **Override:** Set `VITE_INTEL_API_BASE` to a full origin if the API lives elsewhere.
 */

import {
  apiOriginForHostname,
  HD2D_WORKER_API_ORIGIN,
  isHd2dZoneHostname,
  resolveProductionApiOrigin,
} from "../config/siteOrigin";

const RAW = import.meta.env.VITE_INTEL_API_BASE;

function viteOverrideHostname(raw: string): string | null {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAbsoluteHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * On hosts where Pages/Vercel serve the SPA but `/api/*` would be wrong without a proxy, force the Worker origin.
 * For `*.hardcoredoortodoorclosers.com`, `apiOriginForHostname` is null — same-origin base is kept.
 */
function coerceWorkerIfShadowedSite(base: string): string {
  if (typeof window === "undefined") return base;
  const h = (window.location.hostname || "").trim().toLowerCase();
  if (apiOriginForHostname(h) === null) return base;

  if (!base.trim() || !isAbsoluteHttpUrl(base)) {
    return HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
  }
  try {
    if (new URL(base).origin === window.location.origin) {
      return HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
    }
  } catch {
    return HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
  }
  return base;
}

export function getHd2dApiBase(): string {
  const raw = typeof RAW === "string" && RAW.trim() ? RAW.trim() : "";
  if (import.meta.env.DEV) {
    const devBase = raw ? raw.replace(/\/$/, "") : "/intel-proxy";
    return coerceWorkerIfShadowedSite(devBase);
  }
  let base: string;
  if (typeof window !== "undefined" && window.location?.origin) {
    if (raw) {
      const overrideHost = viteOverrideHostname(raw);
      if (overrideHost && isHd2dZoneHostname(overrideHost)) {
        base = window.location.origin.replace(/\/$/, "");
      } else if (overrideHost && apiOriginForHostname(overrideHost) !== null) {
        base = resolveProductionApiOrigin();
      } else {
        base = raw.replace(/\/$/, "");
      }
    } else {
      base = resolveProductionApiOrigin();
    }
  } else {
    base = raw ? raw.replace(/\/$/, "") : HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
  }
  return coerceWorkerIfShadowedSite(base);
}

/** True when intel Worker routes have a resolvable base (`/intel-proxy` in dev, or configured production base). */
export function isHd2dApiConfigured(): boolean {
  return getHd2dApiBase() !== "";
}
