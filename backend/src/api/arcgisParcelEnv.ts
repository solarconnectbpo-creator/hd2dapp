/**
 * Single place for parcel FeatureServer URL resolution (health + arcgisProxy).
 * If ARCGIS_FEATURE_LAYER_URL is missing or blank in the Worker env, we fall back to the
 * public St. Louis County layer (same as stlIntel). That avoids "not set on the server"
 * when dashboard / env merge drops the var.
 *
 * The City of St. Louis is independent of St. Louis County — county parcels do not cover
 * city addresses. We optionally merge/query the city's public assessor MapServer layer.
 */

export const DEFAULT_ARCGIS_PARCEL_LAYER_URL =
  "https://services6.arcgis.com/evmyRZRrsopdeog7/arcgis/rest/services/AssessorsParcels/FeatureServer/0";

/**
 * City of St. Louis — Assessor public parcels (MapServer layer 11). Same source as maps8.stlouis-mo.gov.
 * Used as a fallback when the primary layer returns no hit inside the independent city bbox.
 */
export const DEFAULT_STL_CITY_PARCEL_LAYER_URL =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/ASSESSOR/Assessor_Public_Parcels/MapServer/11";

/** Set ARCGIS_FEATURE_LAYER_URL to this to disable parcel GeoJSON / query (advanced). */
export const ARCGIS_PARCEL_LAYER_DISABLED = "__DISABLE_ARCGIS_PARCEL__";

/** Optional override for the city layer; set to __DISABLE_STL_CITY_PARCEL__ to skip city merge/query. */
export const ARCGIS_STL_CITY_PARCEL_LAYER_DISABLED = "__DISABLE_STL_CITY_PARCEL__";

/** Approx. WGS84 bounds of the independent City of St. Louis (not the metro). */
const STL_CITY_WEST = -90.34;
const STL_CITY_EAST = -90.18;
const STL_CITY_SOUTH = 38.5;
const STL_CITY_NORTH = 38.77;

export function pointInStLouisIndependentCity(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= STL_CITY_SOUTH && lat <= STL_CITY_NORTH && lng >= STL_CITY_WEST && lng <= STL_CITY_EAST;
}

export function bboxIntersectsStLouisIndependentCity(
  west: number,
  south: number,
  east: number,
  north: number,
): boolean {
  if (![west, south, east, north].every(Number.isFinite)) return false;
  if (west >= east || south >= north) return false;
  return !(east < STL_CITY_WEST || west > STL_CITY_EAST || north < STL_CITY_SOUTH || south > STL_CITY_NORTH);
}

export function resolveArcgisParcelLayerUrl(env: { ARCGIS_FEATURE_LAYER_URL?: string }): string | null {
  const raw = (env.ARCGIS_FEATURE_LAYER_URL ?? "").trim();
  if (raw === ARCGIS_PARCEL_LAYER_DISABLED) return null;
  if (!raw) return DEFAULT_ARCGIS_PARCEL_LAYER_URL;
  return raw;
}

export function resolveStlCityParcelLayerUrl(env: { ARCGIS_STL_CITY_PARCEL_LAYER_URL?: string }): string | null {
  const raw = (env.ARCGIS_STL_CITY_PARCEL_LAYER_URL ?? "").trim();
  if (raw === ARCGIS_STL_CITY_PARCEL_LAYER_DISABLED) return null;
  if (raw) return raw;
  return DEFAULT_STL_CITY_PARCEL_LAYER_URL;
}
