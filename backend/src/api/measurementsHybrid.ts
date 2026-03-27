export interface EnvMeasurementsHybrid {
  ROOF3D_API_URL?: string;
  ROOF3D_API_PATH?: string;
  ROOF3D_API_KEY?: string;
}

function latLngToTileXYZ(
  lat: number,
  lng: number,
  zoom: number,
): { z: number; x: number; y: number } {
  const z = Math.floor(zoom);
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { z, x, y };
}

function num(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function toPitch(v: unknown): string | undefined {
  const s = str(v);
  if (s) return s;
  const d = num(v);
  if (d === undefined) return undefined;
  const rise = Math.round(Math.tan((d * Math.PI) / 180) * 12);
  if (!Number.isFinite(rise) || rise <= 0) return undefined;
  return `${rise}/12`;
}

export async function handleMeasurementsHybrid(
  request: Request,
  env: EnvMeasurementsHybrid,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid JSON body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const address = str(body.address) ?? "";
  const city = str(body.city) ?? "";
  const state = str(body.state) ?? "";
  const zipCode = str(body.zipCode) ?? "";
  const latitude = num(body.latitude);
  const longitude = num(body.longitude);
  const priority = str(body.priority) ?? "accuracy";

  if (!address || !city || !state || !zipCode) {
    return new Response(
      JSON.stringify({
        success: false,
        provider: "fallback",
        confidence: 0,
        data: null,
        retryCount: 0,
        processingTimeMs: 0,
        errorMessage: "address/city/state/zipCode are required",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  if (latitude === undefined || longitude === undefined) {
    return new Response(
      JSON.stringify({
        success: false,
        provider: "fallback",
        confidence: 0,
        data: null,
        retryCount: 0,
        processingTimeMs: 0,
        errorMessage: "latitude and longitude are required",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const started = Date.now();
  const tile = latLngToTileXYZ(latitude, longitude, 19);
  const apiBase = env.ROOF3D_API_URL?.trim();
  const apiPath = env.ROOF3D_API_PATH?.trim() || "/measurements";

  if (!apiBase) {
    return new Response(
      JSON.stringify({
        success: false,
        provider: "fallback",
        confidence: 0,
        data: null,
        retryCount: 0,
        processingTimeMs: Date.now() - started,
        errorMessage:
          "ROOF3D_API_URL worker secret is not set. Configure your Roof3D service URL.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const endpoint = `${apiBase.replace(/\/+$/, "")}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const key = env.ROOF3D_API_KEY?.trim();
  if (key) headers.Authorization = `Bearer ${key}`;

  let upstreamText = "";
  let upstreamJson: unknown;
  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        address,
        city,
        state,
        zipCode,
        latitude,
        longitude,
        priority,
      }),
    });
    upstreamText = await upstream.text();
    try {
      upstreamJson = upstreamText ? JSON.parse(upstreamText) : {};
    } catch {
      upstreamJson = { text: upstreamText };
    }
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          provider: "fallback",
          confidence: 0,
          data: null,
          retryCount: 0,
          processingTimeMs: Date.now() - started,
          errorMessage: `Roof3D API ${upstream.status}: ${upstreamText.slice(0, 280)}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        provider: "fallback",
        confidence: 0,
        data: null,
        retryCount: 0,
        processingTimeMs: Date.now() - started,
        errorMessage: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const root = (upstreamJson ?? {}) as Record<string, unknown>;
  const dataNode =
    (root.data as Record<string, unknown> | undefined) ??
    (root.result as Record<string, unknown> | undefined) ??
    root;
  const metricsNode =
    (dataNode.metrics as Record<string, unknown> | undefined) ?? dataNode;
  const out = {
    success: true,
    provider: "roof3d" as const,
    confidence:
      num(metricsNode.confidence) ??
      num(dataNode.confidence) ??
      num(root.confidence) ??
      0.75,
    retryCount: 0,
    processingTimeMs: Date.now() - started,
    data: {
      address,
      latitude,
      longitude,
      tile,
      nearmapSurveyIds: [] as string[],
      roofAreaSqFt:
        num(metricsNode.roofAreaSqFt) ??
        num(metricsNode.area_sqft) ??
        num(metricsNode.areaSqFt) ??
        num(metricsNode.area),
      roofPerimeterFt:
        num(metricsNode.roofPerimeterFt) ??
        num(metricsNode.perimeter_ft) ??
        num(metricsNode.perimeterFt) ??
        num(metricsNode.perimeter),
      roofPitch:
        toPitch(metricsNode.roofPitch) ??
        toPitch(metricsNode.pitch) ??
        toPitch(metricsNode.pitch_deg) ??
        toPitch(metricsNode.pitchDegrees),
      ridgesLf:
        num(metricsNode.ridgesLf) ??
        num(metricsNode.ridges_ft) ??
        num(metricsNode.ridgeLength),
      valleysLf:
        num(metricsNode.valleysLf) ??
        num(metricsNode.valleys_ft) ??
        num(metricsNode.valleyLength),
      hipsLf:
        num(metricsNode.hipsLf) ??
        num(metricsNode.hips_ft) ??
        num(metricsNode.hipLength),
      rakesLf: num(metricsNode.rakesLf) ?? num(metricsNode.rakes_ft),
      eavesLf: num(metricsNode.eavesLf) ?? num(metricsNode.eaves_ft),
    },
    roof3dRaw: upstreamJson,
  };

  return new Response(JSON.stringify(out), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
