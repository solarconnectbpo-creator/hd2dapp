/**
 * CORS for the Worker: Bearer-token SPA (no cookies).
 * - Local `wrangler dev` (Worker URL hostname 127.0.0.1 / localhost / ::1) → `Access-Control-Allow-Origin: *`.
 * - Empty `CORS_ALLOWED_ORIGINS` → `*` (open dev / same-origin proxies).
 * - Non-empty → comma-separated exact `Origin` values; browser `Origin` must match one entry.
 *   Requests without `Origin` (curl, webhooks) still get `*` so non-browser clients work.
 */

export function parseCorsAllowedOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function isLocalWranglerHost(request: Request): boolean {
  try {
    const h = new URL(request.url).hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
  } catch {
    return false;
  }
}

export function buildCorsHeaders(
  request: Request,
  env: { CORS_ALLOWED_ORIGINS?: string },
): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-DM-Client-Key, x-company-id",
  };

  if (isLocalWranglerHost(request)) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  const allowed = parseCorsAllowedOrigins(env.CORS_ALLOWED_ORIGINS);
  if (allowed.length === 0) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  const originHeader = request.headers.get("Origin");
  const normalized = originHeader?.replace(/\/+$/, "") ?? "";

  if (normalized && allowed.includes(normalized)) {
    return {
      ...base,
      "Access-Control-Allow-Origin": originHeader!,
      Vary: "Origin",
    };
  }

  if (!originHeader) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  return { ...base, Vary: "Origin" };
}

/**
 * Legacy `/api/leads`-style placeholder routes: 200 JSON when enabled, else 404.
 * - `LEGACY_PLACEHOLDER_APIS=true|yes|1` → always on.
 * - `LEGACY_PLACEHOLDER_APIS=false|no|0` → always off (hardened deploys / dashboards).
 * - Unset → on only for `127.0.0.1` / `localhost` Worker URL (`wrangler dev`), off on real hostnames.
 */
export function legacyPlaceholderApisEnabled(
  env: { LEGACY_PLACEHOLDER_APIS?: string },
  request: Request,
): boolean {
  const v = (env.LEGACY_PLACEHOLDER_APIS || "").trim().toLowerCase();
  if (v === "true" || v === "yes" || v === "1") return true;
  if (v === "false" || v === "no" || v === "0") return false;
  return isLocalWranglerHost(request);
}

export function legacyPlaceholderResponse(
  env: { LEGACY_PLACEHOLDER_APIS?: string },
  request: Request,
  corsHeaders: Record<string, string>,
  devPayload: { message: string; data?: unknown },
): Response {
  if (!legacyPlaceholderApisEnabled(env, request)) {
    return new Response(JSON.stringify({ success: false, error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({ success: true, data: devPayload.data ?? [], message: devPayload.message }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
