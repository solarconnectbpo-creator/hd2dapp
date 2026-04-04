/**
 * Cached flags from GET /api/health (DealMachine, optional ArcGIS MapServer tile overlay, etc.).
 */

import { getHd2dApiBase, isHd2dApiConfigured } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";

let healthHydrated = false;
let cachedDealMachineServerKey: boolean | null = null;
let cachedArcgisMapServerTileUrl: string | null = null;
let cachedArcgisMapServerTileAttribution = "";
let cachedArcgisMapServerTileOpacity = 0.55;
let inflight: Promise<void> | null = null;

export function getDealMachineServerKeyCached(): boolean | null {
  return cachedDealMachineServerKey;
}

export function getArcgisMapServerTileConfig(): {
  url: string | null;
  attribution: string;
  opacity: number;
} {
  return {
    url: cachedArcgisMapServerTileUrl,
    attribution: cachedArcgisMapServerTileAttribution,
    opacity: cachedArcgisMapServerTileOpacity,
  };
}

/** For Vitest only — resets module cache between tests. */
export function resetDealMachineCapabilitiesCacheForTests(): void {
  healthHydrated = false;
  cachedDealMachineServerKey = null;
  cachedArcgisMapServerTileUrl = null;
  cachedArcgisMapServerTileAttribution = "";
  cachedArcgisMapServerTileOpacity = 0.55;
  inflight = null;
}

/**
 * Fetches /api/health once and caches capability flags for the SPA.
 * Call from the app shell (e.g. Root) so all routes see updated gating after load.
 */
export async function hydrateDealMachineCapabilitiesFromHealth(): Promise<void> {
  if (!isHd2dApiConfigured()) return;
  if (healthHydrated) return;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const base = getHd2dApiBase().replace(/\/$/, "");
      const res = await fetch(`${base}/api/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        cachedDealMachineServerKey = false;
        cachedArcgisMapServerTileUrl = null;
        cachedArcgisMapServerTileAttribution = "";
        cachedArcgisMapServerTileOpacity = 0.55;
        healthHydrated = true;
        return;
      }
      const j = await readJsonResponseBody<{
        capabilities?: {
          dealmachineServerKey?: boolean;
          arcgisMapServerTileUrl?: string | null;
          arcgisMapServerTileAttribution?: string;
          arcgisMapServerTileOpacity?: number;
        };
      }>(res);
      cachedDealMachineServerKey = Boolean(j.capabilities?.dealmachineServerKey);
      const u = j.capabilities?.arcgisMapServerTileUrl;
      cachedArcgisMapServerTileUrl =
        typeof u === "string" && u.trim() && /^https?:\/\//i.test(u.trim()) ? u.trim() : null;
      const att = j.capabilities?.arcgisMapServerTileAttribution;
      cachedArcgisMapServerTileAttribution =
        typeof att === "string" ? att.trim() : "";
      const op = j.capabilities?.arcgisMapServerTileOpacity;
      cachedArcgisMapServerTileOpacity =
        typeof op === "number" && Number.isFinite(op) ? Math.min(1, Math.max(0.05, op)) : 0.55;
      healthHydrated = true;
    } catch {
      cachedDealMachineServerKey = false;
      cachedArcgisMapServerTileUrl = null;
      cachedArcgisMapServerTileAttribution = "";
      cachedArcgisMapServerTileOpacity = 0.55;
      healthHydrated = true;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
