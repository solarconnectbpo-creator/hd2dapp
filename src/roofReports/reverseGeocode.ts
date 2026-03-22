export async function reverseGeocodeNominatim(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    // Public endpoint; may occasionally rate-limit. Falls back to lat/lng if it fails.
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lng))}&zoom=18&addressdetails=1`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);

    const data = (await res.json()) as any;
    return data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

export interface NominatimReverseDetails {
  displayName: string;
  address: {
    city?: string;
    county?: string;
    state?: string;
    state_code?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export async function reverseGeocodeNominatimDetailed(
  lat: number,
  lng: number,
): Promise<NominatimReverseDetails> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      String(lat),
    )}&lon=${encodeURIComponent(String(lng))}&zoom=18&addressdetails=1`;

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Reverse geocode failed: ${res.status}`);

    const data = (await res.json()) as any;
    const address = data?.address ?? {};

    return {
      displayName: data?.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      address: {
        city: address?.city ?? address?.town ?? address?.village,
        county: address?.county,
        state: address?.state,
        state_code: address?.state_code,
        postcode: address?.postcode,
        country: address?.country,
        country_code: address?.country_code,
      },
    };
  } catch {
    return {
      displayName: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      address: {},
    };
  }
}

export type NominatimSearchHit = {
  lat: number;
  lng: number;
  displayName: string;
};

/**
 * Forward geocode (address search). Nominatim requires a valid User-Agent.
 * Prefer US results for property lookup.
 */
export async function forwardGeocodeNominatim(
  query: string,
): Promise<NominatimSearchHit[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      q,
    )}&limit=8&countrycodes=us`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "HardcoreDoorToDoorRoofReports/1.0",
      },
    });
    if (!res.ok) throw new Error(`Forward geocode failed: ${res.status}`);
    const data = (await res.json()) as any[];
    if (!Array.isArray(data)) return [];

    return data
      .map((d) => {
        const lat = Number(d?.lat);
        const lng = Number(d?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return {
          lat,
          lng,
          displayName:
            typeof d?.display_name === "string"
              ? d.display_name
              : `${lat}, ${lng}`,
        } as NominatimSearchHit;
      })
      .filter(Boolean) as NominatimSearchHit[];
  } catch {
    return [];
  }
}
