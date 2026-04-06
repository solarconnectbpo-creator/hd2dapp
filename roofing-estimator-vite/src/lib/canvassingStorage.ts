import type { ContactRecord } from "./contactsCsv";
import type { PropertyImportPayload } from "./propertyScraper";
import { getScopedStorageKey } from "./userScopedStorage";

export type CanvassVisitStatus = "new" | "visited" | "skip" | "interested";

export type CanvassLeadState = {
  status: CanvassVisitStatus;
  notes: string;
  updatedAt: string;
};

/** Persisted owner/assessor enrichment from a map click for a route lead. */
export type CanvassLeadEnrichment = {
  payload: PropertyImportPayload;
  parcel: Record<string, unknown> | null;
  /** USGS/OSM building footprint at enrich — handed off to measurement when importFootprint. */
  buildingFootprint?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
  updatedAt: string;
};

const LEADS_BASE = "roofing-estimator-vite-canvassing-leads-v1";
const STATES_BASE = "roofing-estimator-vite-canvassing-states-v1";
const ENRICHMENT_BASE = "roofing-estimator-vite-canvassing-enrichment-v1";

const MAX_PARCEL_STRING_CHARS = 520;

/** Truncate long assessor strings so localStorage stays under quota. */
export function trimParcelForStorage(parcel: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!parcel) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parcel)) {
    if (v != null && typeof v === "object" && !Array.isArray(v)) continue;
    if (Array.isArray(v)) {
      const j = JSON.stringify(v);
      out[k] = j.length > MAX_PARCEL_STRING_CHARS ? "[…]" : v;
      continue;
    }
    const s = String(v);
    if (s.length > MAX_PARCEL_STRING_CHARS) {
      out[k] = `${s.slice(0, MAX_PARCEL_STRING_CHARS)}…`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function loadCanvassLeads(): ContactRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const k = getScopedStorageKey(LEADS_BASE);
    if (!k) return [];
    const raw = window.localStorage.getItem(k);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ContactRecord[];
  } catch {
    return [];
  }
}

export function saveCanvassLeads(leads: ContactRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const k = getScopedStorageKey(LEADS_BASE);
    if (!k) return;
    window.localStorage.setItem(k, JSON.stringify(leads));
  } catch {
    /* quota */
  }
}

export function loadCanvassStates(): Record<string, CanvassLeadState> {
  if (typeof window === "undefined") return {};
  try {
    const k = getScopedStorageKey(STATES_BASE);
    if (!k) return {};
    const raw = window.localStorage.getItem(k);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, CanvassLeadState>;
  } catch {
    return {};
  }
}

export function saveCanvassStates(states: Record<string, CanvassLeadState>): void {
  if (typeof window === "undefined") return;
  try {
    const k = getScopedStorageKey(STATES_BASE);
    if (!k) return;
    window.localStorage.setItem(k, JSON.stringify(states));
  } catch {
    /* quota */
  }
}

export function loadCanvassEnrichment(): Record<string, CanvassLeadEnrichment> {
  if (typeof window === "undefined") return {};
  try {
    const k = getScopedStorageKey(ENRICHMENT_BASE);
    if (!k) return {};
    const raw = window.localStorage.getItem(k);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, CanvassLeadEnrichment>;
  } catch {
    return {};
  }
}

export function saveCanvassEnrichment(data: Record<string, CanvassLeadEnrichment>): void {
  if (typeof window === "undefined") return;
  try {
    const k = getScopedStorageKey(ENRICHMENT_BASE);
    if (!k) return;
    window.localStorage.setItem(k, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function clearCanvassEnrichment(): void {
  if (typeof window === "undefined") return;
  try {
    const k = getScopedStorageKey(ENRICHMENT_BASE);
    if (k) window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** Pure merge for React setState — trims parcel for storage size. */
export function mergeCanvassEnrichment(
  prev: Record<string, CanvassLeadEnrichment>,
  leadId: string,
  partial: {
    payload: PropertyImportPayload;
    parcel: Record<string, unknown> | null;
    buildingFootprint?: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
  },
): Record<string, CanvassLeadEnrichment> {
  return {
    ...prev,
    [leadId]: {
      payload: partial.payload,
      parcel: trimParcelForStorage(partial.parcel),
      buildingFootprint: partial.buildingFootprint ?? null,
      updatedAt: new Date().toISOString(),
    },
  };
}

/** Drop enrichment rows for leads that no longer exist. Returns `prev` if nothing removed (stable ref). */
export function pruneCanvassEnrichmentToLeadIds(
  prev: Record<string, CanvassLeadEnrichment>,
  leadIds: Set<string>,
): Record<string, CanvassLeadEnrichment> {
  let removed = false;
  for (const id of Object.keys(prev)) {
    if (!leadIds.has(id)) {
      removed = true;
      break;
    }
  }
  if (!removed) return prev;
  const next: Record<string, CanvassLeadEnrichment> = {};
  for (const [id, row] of Object.entries(prev)) {
    if (leadIds.has(id)) next[id] = row;
  }
  return next;
}
