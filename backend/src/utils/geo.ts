/**
 * Geocoding utility for converting addresses to coordinates
 * Uses OpenStreetMap Nominatim for free geocoding
 */

interface GeocodeResult {
  lat: number | null;
  lon: number | null;
}

export async function geocodeAddress(address: string, env: any): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data || !data.length) {
      return { lat: null, lon: null };
    }

    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    };
  } catch (error) {
    console.error("Geocoding error:", error);
    return { lat: null, lon: null };
  }
}
