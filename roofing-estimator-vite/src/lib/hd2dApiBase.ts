/**
 * Base URL for the HD2D Cloudflare Worker (intel, auth, DealMachine proxy, AI routes, etc.).
 *
 * - **Development (`vite`):** `VITE_INTEL_API_BASE` if set, else same-origin `/intel-proxy` (see `INTEL_PROXY_TARGET` in `vite.config.ts`).
 * - **Production:** same-origin `/api/*` on Cloudflare Pages (proxy to Worker) or apex cross-origin for Vercel — never browser → `*.workers.dev`.
 * - **Preview** (`*.pages.dev`, `*.vercel.app`): resolved in `siteOrigin.ts`.
 * - **Override:** Set `VITE_INTEL_API_BASE` to a full origin if the API lives elsewhere.
 */

import {
  apiOriginForHostname,
  HD2D_PUBLIC_API_ORIGIN,
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
 * On preview hosts (`*.vercel.app`, `*.pages.dev`), if the base is still the SPA origin, force the public API origin (apex `/api/*`), not `workers.dev`.
 */
function coerceWorkerIfShadowedSite(base: string): string {
  if (typeof window === "undefined") return base;
  const h = (window.location.hostname || "").trim().toLowerCase();
  if (apiOriginForHostname(h) === null) return base;

  const pub = HD2D_PUBLIC_API_ORIGIN.replace(/\/$/, "");
  if (!base.trim() || !isAbsoluteHttpUrl(base)) {
    return pub;
  }
  try {
    if (new URL(base).origin === window.location.origin) {
      return pub;
    }
  } catch {
    return pub;
  }
  return base;
}

/** Production: browsers should not use `*.workers.dev`. On Pages/HD2D zone use same-origin `/api` (proxy). */
function rewriteWorkersDevToPublicApi(base: string): string {
  if (import.meta.env.DEV) return base;
  if (typeof window === "undefined") return base;
  try {
    const u = new URL(base);
    if (!u.hostname.endsWith(".workers.dev")) return base;
    const h = (window.location.hostname || "").trim().toLowerCase();
    const onPagesOrZone = h.endsWith(".pages.dev") || isHd2dZoneHostname(h);
    if (onPagesOrZone) {
      return window.location.origin.replace(/\/$/, "");
    }
    return HD2D_PUBLIC_API_ORIGIN.replace(/\/$/, "");
  } catch {
    return base;
  }
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
        base = resolveProductionApiOrigin();
      } else if (overrideHost && apiOriginForHostname(overrideHost) !== null) {
        base = resolveProductionApiOrigin();
      } else {
        base = raw.replace(/\/$/, "");
      }
    } else {
      base = resolveProductionApiOrigin();
    }
  } else {
    base = raw ? raw.replace(/\/$/, "") : HD2D_PUBLIC_API_ORIGIN.replace(/\/$/, "");
  }
  const coerced = coerceWorkerIfShadowedSite(base);
  return rewriteWorkersDevToPublicApi(coerced);
}

/** True when intel Worker routes have a resolvable base (`/intel-proxy` in dev, or configured production base). */
export function isHd2dApiConfigured(): boolean {
  return getHd2dApiBase() !== "";
}
