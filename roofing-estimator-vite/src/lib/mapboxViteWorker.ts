/**
 * Vite + Mapbox GL: point the library at a real worker script URL so tiles render
 * (avoids a blank/black map when the default blob worker fails under some bundlers/CSP).
 */
import mapboxWorkerUrl from "mapbox-gl/dist/mapbox-gl-csp-worker.js?url";

type MapboxNS = typeof import("mapbox-gl").default;

export function applyMapboxCspWorker(mapboxgl: MapboxNS): void {
  if (typeof mapboxWorkerUrl === "string" && mapboxWorkerUrl) {
    (mapboxgl as unknown as { workerUrl?: string }).workerUrl = mapboxWorkerUrl;
  }
}
