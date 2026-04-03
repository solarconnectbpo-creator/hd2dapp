/**
 * EagleView TrueDesign API (hybrid with Mapbox).
 *
 * **Default:** same HD2D Worker as intel — `{VITE_INTEL_API_BASE or /intel-proxy}/api/eagleview/apicenter`.
 * The Worker holds OAuth client credentials, obtains Bearer tokens, and proxies to API Center (CORS-safe).
 *
 * **Override:** set `VITE_EAGLEVIEW_API_BASE` to another origin; optional `VITE_EAGLEVIEW_ACCESS_TOKEN` for direct Bearer (not recommended).
 */

import { getHd2dApiBase, isHd2dApiConfigured } from "./hd2dApiBase";

export function getTrueDesignApiBase(): string {
  const raw = import.meta.env.VITE_EAGLEVIEW_API_BASE;
  if (typeof raw === "string" && raw.trim()) return raw.trim().replace(/\/$/, "");
  if (isHd2dApiConfigured()) return `${getHd2dApiBase()}/api/eagleview/apicenter`;
  return "";
}

export function isTrueDesignApiConfigured(): boolean {
  return getTrueDesignApiBase() !== "";
}

export async function trueDesignFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getTrueDesignApiBase();
  if (!base) {
    throw new Error(
      "EagleView API is not configured. Set VITE_INTEL_API_BASE for production, or run the HD2D Worker locally (wrangler dev) so /intel-proxy reaches /api/eagleview/apicenter. Optional: VITE_EAGLEVIEW_API_BASE for a custom proxy.",
    );
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  const dedicated =
    typeof import.meta.env.VITE_EAGLEVIEW_API_BASE === "string" &&
    import.meta.env.VITE_EAGLEVIEW_API_BASE.trim();
  if (dedicated) {
    const token =
      typeof import.meta.env.VITE_EAGLEVIEW_ACCESS_TOKEN === "string"
        ? import.meta.env.VITE_EAGLEVIEW_ACCESS_TOKEN.trim()
        : "";
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}

/** EagleView `GET /solar/v1/truedesign/systemRoof` payload (subset; API may return more). */
export interface EagleViewSystemRoofData {
  totalArea?: number;
  totalFacets?: number;
  pitchPerFacets?: Record<string, number>;
  azimuthPerFacets?: Record<string, number>;
  [key: string]: unknown;
}

/**
 * Map TrueDesign roof summary into estimator intake fields.
 * `totalArea` is treated as **roofing squares** (100 SF surface) when in a typical range.
 */
export function mapEagleViewSystemRoofToFormPatch(data: EagleViewSystemRoofData): {
  measuredSquares?: string;
  areaSqFt?: string;
  roofPitch?: string;
} {
  const out: {
    measuredSquares?: string;
    areaSqFt?: string;
    roofPitch?: string;
  } = {};

  const totalArea = data.totalArea;
  if (typeof totalArea === "number" && Number.isFinite(totalArea) && totalArea > 0 && totalArea < 500) {
    const squares = round2(totalArea);
    out.measuredSquares = String(squares);
  }

  const pitches = data.pitchPerFacets;
  if (pitches && typeof pitches === "object") {
    const values = Object.values(pitches).filter((v) => typeof v === "number" && Number.isFinite(v)) as number[];
    if (values.length) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      if (avg > 4 && avg <= 60) {
        const rise = 12 * Math.tan((avg * Math.PI) / 180);
        if (Number.isFinite(rise) && rise > 0 && rise < 24) {
          out.roofPitch = `${Math.round(rise)}/12`;
        }
      }
    }
  }

  if (out.measuredSquares && out.roofPitch) {
    const rise = parsePitchRiseFromString(out.roofPitch);
    if (rise != null) {
      const factor = Math.sqrt(1 + (rise / 12) ** 2);
      const sq = Number.parseFloat(out.measuredSquares);
      if (Number.isFinite(sq)) {
        const plan = (sq * 100) / factor;
        if (Number.isFinite(plan) && plan > 0) out.areaSqFt = plan.toFixed(2);
      }
    }
  }

  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parsePitchRiseFromString(pitch: string): number | null {
  const m = pitch.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/);
  if (!m) return null;
  const rise = Number.parseFloat(m[1]!);
  return Number.isFinite(rise) ? rise : null;
}
