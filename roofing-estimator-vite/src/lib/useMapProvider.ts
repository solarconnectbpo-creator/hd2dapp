import { useMemo } from "react";

/** Satellite/map source for leads and measurement — OSM/MapLibre only (no third-party imagery SDKs). */
export type MapProvider = "osm-fallback";

export function useMapProvider(): MapProvider {
  return useMemo(() => "osm-fallback", []);
}
