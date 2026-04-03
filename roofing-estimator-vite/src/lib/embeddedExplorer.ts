/**
 * EagleView Embedded Explorer widget (imagery + measurement tools).
 * @see https://embedded-explorer.eagleview.com/static/docs/
 */

export const EMBEDDED_EXPLORER_SCRIPT =
  "https://embedded-explorer.eagleview.com/static/embedded-explorer-widget.js";

export type EvLonLat = { lon: number; lat: number; z?: number; zType?: string };

/** Minimal map handle — full API is wider; extend as needed. */
export type EmbeddedExplorerMapHandle = {
  addFeatures: (opts: { geoJson: GeoJSON.Feature[] }) => void;
  removeFeatures: (filters?: { geoJson: (f: GeoJSON.Feature) => boolean }) => void;
  getFeatures: () => unknown;
  setLonLat: (v: EvLonLat, cb?: () => void) => void;
  enableMeasurementPanel: (enabled: boolean, cb?: () => void) => void;
  enableSearchBar: (enabled: boolean, cb?: () => void) => void;
  enableSidebar: (enabled: boolean, cb?: () => void) => void;
  enableTimeline: (enabled: boolean, cb?: () => void) => void;
  enableToolsPanel: (enabled: boolean, cb?: () => void) => void;
  on: (event: string, fn: (...args: unknown[]) => void) => void;
  off: (event: string) => void;
};

export type EmbeddedExplorerCtor = new () => {
  mount: (
    elementId: string,
    opts: {
      apiKey?: string;
      authToken?: string;
      view?: { lonLat: EvLonLat };
    },
  ) => EmbeddedExplorerMapHandle;
};

declare global {
  interface Window {
    ev?: { EmbeddedExplorer: EmbeddedExplorerCtor };
  }
}

let scriptPromise: Promise<void> | null = null;

export function loadEmbeddedExplorerScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.ev?.EmbeddedExplorer) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = EMBEDDED_EXPLORER_SCRIPT;
    s.crossOrigin = "anonymous";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load EagleView Embedded Explorer script"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** Extract GeoJSON features from `getFeatures()` return shape (object or array). */
export function collectGeoJsonFeatures(raw: unknown): GeoJSON.Feature[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.geoJson)) {
    return (o.geoJson as unknown[]).filter(
      (f): f is GeoJSON.Feature =>
        f != null && typeof f === "object" && (f as GeoJSON.Feature).type === "Feature",
    );
  }
  const inner = o.features ?? o.data;
  if (Array.isArray(inner)) {
    return inner.filter(
      (f): f is GeoJSON.Feature =>
        f != null && typeof f === "object" && (f as GeoJSON.Feature).type === "Feature",
    );
  }
  if (o.type === "FeatureCollection" && Array.isArray((o as { features?: unknown }).features)) {
    return (o as unknown as GeoJSON.FeatureCollection).features;
  }
  if (o.type === "Feature") return [o as unknown as GeoJSON.Feature];
  return [];
}
