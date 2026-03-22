import {
  STL_ASSESSOR_PARCEL_LAYER,
  STL_BUILDING_DEMOLITIONS_LAYER,
  MISSOURI_BBOX,
  STL_SLDC_BUILDING_PERMITS_LAYER,
  STL_SLDC_LRA_IN_PATH_LAYER,
  STL_SLDC_TAX_SALES_LAYER,
  STL_SLDC_TRADES_PERMITS_LAYER,
} from "../constants/stlDataSources";
import {
  queryPointsNear,
  queryPolygonContainsPoint,
} from "./arcgisFeatureQuery";

const DEFAULT_NEAR_M = 75;

export type StlIntelBundle = {
  parcel?: Record<string, unknown> | null;
  buildingPermits: Record<string, unknown>[];
  tradesPermits: Record<string, unknown>[];
  lraParcel?: Record<string, unknown> | null;
  taxSaleParcel?: Record<string, unknown> | null;
  demolitionParcel?: Record<string, unknown> | null;
};

export async function fetchStlIntelAtPoint(
  lat: number,
  lng: number,
  opts?: { nearMeters?: number; signal?: AbortSignal },
): Promise<StlIntelBundle> {
  const near = opts?.nearMeters ?? DEFAULT_NEAR_M;
  const signal = opts?.signal;

  const [
    parcelRes,
    bldRes,
    tradeRes,
    lraRes,
    taxRes,
    demoRes,
  ] = await Promise.all([
    queryPolygonContainsPoint(STL_ASSESSOR_PARCEL_LAYER, lat, lng, signal),
    queryPointsNear(STL_SLDC_BUILDING_PERMITS_LAYER, lat, lng, near, signal),
    queryPointsNear(STL_SLDC_TRADES_PERMITS_LAYER, lat, lng, near, signal),
    queryPolygonContainsPoint(STL_SLDC_LRA_IN_PATH_LAYER, lat, lng, signal),
    queryPolygonContainsPoint(STL_SLDC_TAX_SALES_LAYER, lat, lng, signal),
    queryPolygonContainsPoint(STL_BUILDING_DEMOLITIONS_LAYER, lat, lng, signal),
  ]);

  const attrs = (f: { attributes?: Record<string, unknown> }) =>
    f.attributes ?? {};

  return {
    parcel: parcelRes.features?.[0]?.attributes ?? null,
    buildingPermits: (bldRes.features ?? []).map(attrs),
    tradesPermits: (tradeRes.features ?? []).map(attrs),
    lraParcel: lraRes.features?.[0]?.attributes ?? null,
    taxSaleParcel: taxRes.features?.[0]?.attributes ?? null,
    demolitionParcel: demoRes.features?.[0]?.attributes ?? null,
  };
}

/** IEM Local Storm Reports GeoJSON for MO, last `hours` (e.g. 336 ≈ 14 days). */
export async function fetchIemLsrGeoJson(
  hours: number,
  opts?: { signal?: AbortSignal },
): Promise<unknown> {
  const u = new URL("https://mesonet.agron.iastate.edu/geojson/lsr.geojson");
  u.searchParams.set("states", "MO");
  u.searchParams.set("hours", String(hours));
  u.searchParams.set("west", String(MISSOURI_BBOX.west));
  u.searchParams.set("east", String(MISSOURI_BBOX.east));
  u.searchParams.set("north", String(MISSOURI_BBOX.north));
  u.searchParams.set("south", String(MISSOURI_BBOX.south));
  const res = await fetch(u.toString(), { signal: opts?.signal });
  if (!res.ok) throw new Error(`IEM LSR failed: ${res.status}`);
  return res.json();
}

/** NWS active alerts for a point (requires identifiable User-Agent). */
export async function fetchNwsActiveAlertsAtPoint(
  lat: number,
  lng: number,
  opts?: { signal?: AbortSignal },
): Promise<unknown> {
  const url = `https://api.weather.gov/alerts/active?point=${lat},${lng}`;
  const res = await fetch(url, {
    signal: opts?.signal,
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "hd2dapp/1.0 (roof reports; contact: local)",
    },
  });
  if (!res.ok) throw new Error(`NWS alerts failed: ${res.status}`);
  return res.json();
}

/** SPC Day 1 convective outlook GeoJSON (regional; not point-filtered). */
export async function fetchSpcDay1Outlook(
  opts?: { signal?: AbortSignal },
): Promise<unknown> {
  const res = await fetch(
    "https://www.spc.noaa.gov/products/outlook/day1otlk_latest.geojson",
    { signal: opts?.signal },
  );
  if (!res.ok) throw new Error(`SPC outlook failed: ${res.status}`);
  return res.json();
}
