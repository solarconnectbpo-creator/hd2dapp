/**
 * Building footprint attributes at a point — proxied through HD2D Worker (layer URL + token on server only).
 */

import { queryArcgisAtPointViaBackend } from "./arcgisBackendClient";
import type { ParcelAtPointOutcome } from "./arcgisParcelAtPoint";

export async function fetchUsBuildingFootprintAtPoint(lat: number, lng: number): Promise<ParcelAtPointOutcome> {
  return queryArcgisAtPointViaBackend("building", lat, lng);
}

export function formatBuildingFootprintNotes(attrs: Record<string, unknown>): string {
  const rows = Object.entries(attrs)
    .filter(([k]) => !k.startsWith("Shape_") && !/^OBJECTID$/i.test(k))
    .slice(0, 32)
    .map(([k, v]) => `${k}: ${String(v)}`);
  if (!rows.length) return "";
  return ["USGS / Esri building footprint (GIS polygon)", ...rows].join("\n");
}
