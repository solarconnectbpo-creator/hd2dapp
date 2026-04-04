import type { ContactRecord } from "./contactsCsv";
import { parseJsonResponse } from "./readJsonResponse";

function buildAddressQuery(c: ContactRecord): string {
  const parts = [c.address, c.city, c.state, c.zip].filter(Boolean);
  return parts.join(", ");
}

/** Geocode contacts missing lat/lng via Nominatim (same pattern as App bulk geocode). */
export async function geocodeContactsMissing(
  contacts: ContactRecord[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ next: ContactRecord[]; updated: number }> {
  const next = contacts.map((c) => ({ ...c }));
  const indices: number[] = [];
  for (let i = 0; i < next.length; i++) {
    if (next[i].lat == null || next[i].lng == null) indices.push(i);
  }
  const total = indices.length;
  let updated = 0;
  let done = 0;
  for (const i of indices) {
    const c = next[i];
    const q = buildAddressQuery(c);
    if (!q.trim()) {
      done++;
      onProgress?.(done, total);
      continue;
    }
    try {
      const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        done++;
        onProgress?.(done, total);
        continue;
      }
      const data = await parseJsonResponse<{ lat?: string; lon?: string }[]>(res, "Nominatim search");
      const hit = data[0];
      if (hit?.lat && hit?.lon) {
        next[i] = {
          ...c,
          lat: Number(hit.lat),
          lng: Number(hit.lon),
        };
        updated++;
      }
    } catch {
      /* skip */
    }
    done++;
    onProgress?.(done, total);
    await new Promise((r) => setTimeout(r, 1100));
  }
  return { next, updated };
}
