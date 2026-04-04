/**
 * Base URL for the HD2D Cloudflare Worker (intel, auth, DealMachine proxy, AI routes, etc.).
 *
 * - **Development (`vite`):** `VITE_INTEL_API_BASE` if set, else same-origin `/intel-proxy` (see `INTEL_PROXY_TARGET` in `vite.config.ts`).
 * - **Production:** Requests go to the deployed Worker URL (`HD2D_WORKER_API_ORIGIN` in `siteOrigin.ts`) when the SPA is on apex, www, app.*, or preview hosts — Pages often serves HTML for `/api/*` on the apex, so same-origin API is unreliable.
 * - **Override:** Set `VITE_INTEL_API_BASE` to a full origin if the API lives elsewhere.
 */

import {
  apiOriginForHostname,
  HD2D_SITE_ROOT,
  HD2D_WORKER_API_ORIGIN,
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
 * On hosts where Pages/Vercel serve the SPA for `/api/*` (HTML, not JSON), never use a relative API base
 * (`/api`, `/intel-proxy`-style) or same-origin absolute URL — force the Worker origin.
 * `apiOriginForHostname` covers apex, subdomains, *.vercel.app, *.pages.dev.
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
  /** Production: always Worker on live HD2D domain — avoids bad `VITE_INTEL_API_BASE` and HTML /api from Pages. */
  if (typeof window !== "undefined" && window.location?.hostname) {
    const h = window.location.hostname.trim().toLowerCase();
    if (h === HD2D_SITE_ROOT || h.endsWith(`.${HD2D_SITE_ROOT}`)) {
      return HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
    }
  }
  let base: string;
  if (typeof window !== "undefined" && window.location?.origin) {
    if (raw) {
      const host = viteOverrideHostname(raw);
      /** Build often sets VITE_INTEL_API_BASE to the marketing domain; Pages serves HTML for /api/* there — always use Worker routing for those hosts. */
      if (host && apiOriginForHostname(host) !== null) {
        base = resolveProductionApiOrigin();
      } else {
        base = raw.replace(/\/$/, "");
      }
    } else {
      base = resolveProductionApiOrigin();
    }
  } else {
    base = raw.replace(/\/$/, "");
  }
  return coerceWorkerIfShadowedSite(base);
}

/** True when intel Worker routes have a resolvable base (`/intel-proxy` in dev, or `VITE_INTEL_API_BASE` in production builds). */
export function isHd2dApiConfigured(): boolean {
  return getHd2dApiBase() !== "";
}
