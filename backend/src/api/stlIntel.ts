type CorsHeaders = Record<string, string>;

const MISSOURI_BBOX = {
  west: -95.78,
  east: -89.09,
  north: 40.62,
  south: 35.99,
} as const;

const STL_ASSESSOR_PARCEL_LAYER =
  "https://services6.arcgis.com/evmyRZRrsopdeog7/arcgis/rest/services/AssessorsParcels/FeatureServer/0";
const STL_SLDC_BUILDING_PERMITS_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/Building_Permits/FeatureServer/1";
const STL_SLDC_TRADES_PERMITS_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/Trades_Permits/FeatureServer/0";
const STL_SLDC_TAX_SALES_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/Tax_Sales/FeatureServer/0";
const STL_BUILDING_DEMOLITIONS_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/BUILDING_DIVISION/Demolitions/FeatureServer/0";
const STL_SLDC_LRA_IN_PATH_LAYER =
  "https://maps8.stlouis-mo.gov/arcgis/rest/services/SLDC/LRA_in_Path/FeatureServer/0";
const ESRI_WORLD_IMAGERY_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type ArcGISFeature = {
  attributes?: Record<string, unknown>;
  geometry?: unknown;
};

type ArcGISFeatureQueryResult = {
  features?: ArcGISFeature[];
  error?: { message?: string; code?: number };
};

function json(data: unknown, status: number, corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseLatLng(url: URL): { lat: number; lng: number } | null {
  const lat = Number.parseFloat(url.searchParams.get("lat") ?? "");
  const lng = Number.parseFloat(url.searchParams.get("lng") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function buildArcgisQueryUrl(
  layerUrl: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const u = new URL(layerUrl.replace(/\/$/, "") + "/query");
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined) return;
    sp.set(k, String(v));
  });
  u.search = sp.toString();
  return u.toString();
}

async function queryPolygonContainsPoint(
  layerUrl: string,
  lat: number,
  lng: number,
): Promise<ArcGISFeatureQueryResult> {
  const geometry = JSON.stringify({ x: lng, y: lat });
  const url = buildArcgisQueryUrl(layerUrl, {
    f: "json",
    where: "1=1",
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    outFields: "*",
    returnGeometry: true,
    outSR: 4326,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ArcGIS query failed: ${res.status}`);
  return (await res.json()) as ArcGISFeatureQueryResult;
}

async function queryPointsNear(
  layerUrl: string,
  lat: number,
  lng: number,
  distanceMeters: number,
): Promise<ArcGISFeatureQueryResult> {
  const geometry = JSON.stringify({ x: lng, y: lat });
  const url = buildArcgisQueryUrl(layerUrl, {
    f: "json",
    where: "1=1",
    geometry,
    geometryType: "esriGeometryPoint",
    inSR: 4326,
    spatialRel: "esriSpatialRelIntersects",
    distance: distanceMeters,
    units: "esriSRUnit_Meter",
    outFields: "*",
    returnGeometry: true,
    outSR: 4326,
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ArcGIS near query failed: ${res.status}`);
  return (await res.json()) as ArcGISFeatureQueryResult;
}

export async function handleStlIntel(
  request: Request,
  _env: unknown,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  if (request.method !== "GET") return json({ success: false, error: "Method not allowed" }, 405, corsHeaders);

  try {
    const url = new URL(request.url);
    const coords = parseLatLng(url);
    if (!coords) return json({ success: false, error: "Missing lat/lng query params" }, 400, corsHeaders);

    const { lat, lng } = coords;
    const inMo =
      lat >= MISSOURI_BBOX.south &&
      lat <= MISSOURI_BBOX.north &&
      lng >= MISSOURI_BBOX.west &&
      lng <= MISSOURI_BBOX.east;
    if (!inMo) {
      return json(
        {
          success: true,
          data: {
            parcel: null,
            buildingPermits: [],
            tradesPermits: [],
            lraParcel: null,
            taxSaleParcel: null,
            demolitionParcel: null,
            esriWorldImageryTiles: ESRI_WORLD_IMAGERY_TILES,
          },
        },
        200,
        corsHeaders,
      );
    }

    const nearMeters = Number.parseFloat(url.searchParams.get("nearMeters") ?? "75");

    const [parcelRes, bldRes, tradeRes, lraRes, taxRes, demoRes] = await Promise.all([
      queryPolygonContainsPoint(STL_ASSESSOR_PARCEL_LAYER, coords.lat, coords.lng),
      queryPointsNear(STL_SLDC_BUILDING_PERMITS_LAYER, coords.lat, coords.lng, Number.isFinite(nearMeters) ? nearMeters : 75),
      queryPointsNear(STL_SLDC_TRADES_PERMITS_LAYER, coords.lat, coords.lng, Number.isFinite(nearMeters) ? nearMeters : 75),
      queryPolygonContainsPoint(STL_SLDC_LRA_IN_PATH_LAYER, coords.lat, coords.lng),
      queryPolygonContainsPoint(STL_SLDC_TAX_SALES_LAYER, coords.lat, coords.lng),
      queryPolygonContainsPoint(STL_BUILDING_DEMOLITIONS_LAYER, coords.lat, coords.lng),
    ]);

    const attrs = (f: ArcGISFeature) => f.attributes ?? {};
    return json(
      {
        success: true,
        data: {
          parcel: parcelRes.features?.[0]?.attributes ?? null,
          buildingPermits: (bldRes.features ?? []).map(attrs),
          tradesPermits: (tradeRes.features ?? []).map(attrs),
          lraParcel: lraRes.features?.[0]?.attributes ?? null,
          taxSaleParcel: taxRes.features?.[0]?.attributes ?? null,
          demolitionParcel: demoRes.features?.[0]?.attributes ?? null,
          esriWorldImageryTiles: ESRI_WORLD_IMAGERY_TILES,
        },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "STL intel query failed",
      },
      500,
      corsHeaders,
    );
  }
}

export async function handleStlStormReports(
  request: Request,
  _env: unknown,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  if (request.method !== "GET") return json({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  try {
    const url = new URL(request.url);
    const coords = parseLatLng(url);
    const days = Math.max(1, Math.min(30, Number.parseInt(url.searchParams.get("days") ?? "14", 10)));
    const hours = days * 24;

    const iem = new URL("https://mesonet.agron.iastate.edu/geojson/lsr.geojson");
    iem.searchParams.set("states", "MO");
    iem.searchParams.set("hours", String(hours));
    iem.searchParams.set("west", String(MISSOURI_BBOX.west));
    iem.searchParams.set("east", String(MISSOURI_BBOX.east));
    iem.searchParams.set("north", String(MISSOURI_BBOX.north));
    iem.searchParams.set("south", String(MISSOURI_BBOX.south));

    const [iemRes, spcRes, nwsRes] = await Promise.all([
      fetch(iem.toString()),
      fetch("https://www.spc.noaa.gov/products/outlook/day1otlk_latest.geojson"),
      coords
        ? fetch(`https://api.weather.gov/alerts/active?point=${coords.lat},${coords.lng}`, {
            headers: {
              Accept: "application/geo+json",
              "User-Agent": "hd2dapp/1.0 (roof reports; contact: local)",
            },
          })
        : Promise.resolve(new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), { status: 200 })),
    ]);

    const iemGeo = iemRes.ok ? await iemRes.json() : { type: "FeatureCollection", features: [] };
    const spcGeo = spcRes.ok ? await spcRes.json() : { type: "FeatureCollection", features: [] };
    const nwsGeo = nwsRes.ok ? await nwsRes.json() : { type: "FeatureCollection", features: [] };

    return json(
      {
        success: true,
        data: {
          days,
          iemLocalStormReports: iemGeo,
          spcDay1Outlook: spcGeo,
          nwsActiveAlerts: nwsGeo,
        },
      },
      200,
      corsHeaders,
    );
  } catch (error) {
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Storm report query failed",
      },
      500,
      corsHeaders,
    );
  }
}

