/**
 * Proxies POST /api/ai/roof-vision → Python FastAPI service (CNN / managed vision).
 * Set ROOF_VISION_SERVICE_URL to the deployed ml-vision-service base (e.g. https://roof-vision.example.com).
 */

export interface EnvRoofVision {
  ROOF_VISION_SERVICE_URL?: string;
  ROOF_VISION_SERVICE_SECRET?: string;
}

export async function handleRoofVisionProxy(
  request: Request,
  env: EnvRoofVision,
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

  const base = env.ROOF_VISION_SERVICE_URL?.trim();
  if (!base) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "ROOF_VISION_SERVICE_URL is not set. Deploy backend/ml-vision-service (see README) and add the URL to Worker secrets.",
      }),
      {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const body = await request.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const secret = env.ROOF_VISION_SERVICE_SECRET?.trim();
  if (secret) {
    headers["X-HD2D-Secret"] = secret;
  }

  const target = `${base.replace(/\/$/, "")}/v1/roof-vision/infer`;
  let upstream: Response;
  try {
    upstream = await fetch(target, { method: "POST", headers, body });
  } catch (e) {
    console.error("[roof-vision] upstream fetch failed", e);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Upstream vision service unreachable",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleRoofSegmentProxy(
  request: Request,
  env: EnvRoofVision,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const base = env.ROOF_VISION_SERVICE_URL?.trim();
  if (!base) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "ROOF_VISION_SERVICE_URL is not set. Deploy backend/ml-vision-service with SAM checkpoint and set the URL on the Worker.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const body = await request.text();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = env.ROOF_VISION_SERVICE_SECRET?.trim();
  if (secret) headers["X-HD2D-Secret"] = secret;

  const target = `${base.replace(/\/$/, "")}/v1/roof-vision/segment-at-point`;
  let upstream: Response;
  try {
    upstream = await fetch(target, { method: "POST", headers, body });
  } catch (e) {
    console.error("[roof-segment] upstream fetch failed", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "SAM service unreachable",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
