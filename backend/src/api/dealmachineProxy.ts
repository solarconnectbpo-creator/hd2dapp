/**
 * POST /api/dealmachine/property — forwards to DealMachine Public API (CORS-safe for SPA).
 *
 * Upstream defaults (override with DEALMACHINE_API_BASE / DEALMACHINE_PROPERTY_PATH in wrangler):
 * - Base: https://public-api.dealmachine.com
 * - Path: /v1/properties/search
 * - Auth: Worker `DEALMACHINE_API_KEY` only (forwarded upstream as X-DM-Client-Key or Bearer; see docs.dealmachine.com)
 *
 * If your account uses Bearer instead, set DEALMACHINE_AUTH_MODE=bearer on the Worker.
 */

type CorsHeaders = Record<string, string>;

type DealMachineEnv = {
  DEALMACHINE_API_KEY?: string;
  DEALMACHINE_API_BASE?: string;
  DEALMACHINE_PROPERTY_PATH?: string;
  /** "client_key" (default) = X-DM-Client-Key; "bearer" = Authorization: Bearer */
  DEALMACHINE_AUTH_MODE?: string;
};

const DEFAULT_BASE = "https://public-api.dealmachine.com";
/** Keep in sync with roofing-estimator-vite/src/lib/propertyDealMachineLookup.ts */
export const DEFAULT_DEALMACHINE_PROPERTY_PATH = "/v1/properties/search";

function json(data: unknown, status: number, corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function buildDealMachineUpstreamBody(
  street_address: string,
  city: string,
  state: string,
  zip_code: string,
): Record<string, string> {
  return {
    street_address,
    city,
    state,
    zip_code: zip_code || "",
    zip: zip_code || "",
  };
}

export async function handleDealMachinePropertyPost(
  request: Request,
  env: DealMachineEnv,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const apiKey = env.DEALMACHINE_API_KEY?.trim();
  if (!apiKey) {
    return json(
      {
        success: false,
        error:
          "DealMachine API key not configured. Set DEALMACHINE_API_KEY on the Worker (wrangler secret or .dev.vars).",
      },
      401,
      corsHeaders,
    );
  }

  let bodyJson: unknown;
  try {
    bodyJson = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const o = bodyJson as Record<string, unknown>;
  const street = String(o.street_address ?? "").trim();
  const city = String(o.city ?? "").trim();
  const state = String(o.state ?? "").trim();
  const zip = String(o.zip_code ?? o.zip ?? "").trim();
  if (!street || !city || !state) {
    return json(
      { success: false, error: "street_address, city, and state are required" },
      400,
      corsHeaders,
    );
  }

  const base = (env.DEALMACHINE_API_BASE || DEFAULT_BASE).replace(/\/$/, "");
  const rawPath = env.DEALMACHINE_PROPERTY_PATH || DEFAULT_DEALMACHINE_PROPERTY_PATH;
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const upstreamBody = buildDealMachineUpstreamBody(street, city, state, zip);
  const url = `${base}${path}`;

  const authMode = (env.DEALMACHINE_AUTH_MODE || "client_key").toLowerCase();
  const useBearer = authMode === "bearer" || authMode === "authorization";

  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (useBearer) {
    upstreamHeaders.Authorization = `Bearer ${apiKey}`;
  } else {
    upstreamHeaders["X-DM-Client-Key"] = apiKey;
  }

  const t0 = Date.now();
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamBody),
    });
  } catch (e) {
    const ms = Date.now() - t0;
    console.warn(`[dealmachine] upstream network error after ${ms}ms:`, e instanceof Error ? e.message : String(e));
    return json(
      {
        success: false,
        error: e instanceof Error ? e.message : "DealMachine upstream request failed",
      },
      502,
      corsHeaders,
    );
  }

  const ms = Date.now() - t0;
  if (!upstream.ok) {
    console.warn(`[dealmachine] upstream HTTP ${upstream.status} in ${ms}ms (path=${path})`);
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
