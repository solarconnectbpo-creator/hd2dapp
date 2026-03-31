/**
 * POST /api/batchdata/property-search — forwards to BatchData Property Search (CORS-safe for SPA builds).
 * Client sends the same JSON body and Authorization: Bearer as api.batchdata.com.
 */

type CorsHeaders = Record<string, string>;

const BATCHDATA_URL = "https://api.batchdata.com/api/v1/property/search";

function json(data: unknown, status: number, corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleBatchDataPropertySearchProxy(
  request: Request,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const auth = request.headers.get("Authorization");
  if (!auth?.trim()) {
    return json({ success: false, error: "Missing Authorization header" }, 401, corsHeaders);
  }

  const contentType = request.headers.get("Content-Type") ?? "application/json";
  const body = await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(BATCHDATA_URL, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": contentType,
        Accept: "application/json",
      },
      body,
    });
  } catch (e) {
    return json(
      {
        success: false,
        error: e instanceof Error ? e.message : "BatchData upstream request failed",
      },
      502,
      corsHeaders,
    );
  }

  const text = await upstream.text();
  const ct = upstream.headers.get("Content-Type") ?? "application/json";
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": ct,
    },
  });
}
