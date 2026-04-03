/**
 * /api/eagleview/apicenter/* — proxy to EagleView API Center with server-side OAuth.
 *
 * - OAuth: client_secret_basic to `EAGLEVIEW_TOKEN_URL` (default apicenter `/oauth2/v1/token`).
 * - Optional static `EAGLEVIEW_ACCESS_TOKEN` skips OAuth (short-lived / dev only).
 * - In-memory token cache per isolate (respects `expires_in`).
 */

import { getEagleViewServiceBearer } from "./eagleviewOAuth";
type CorsHeaders = Record<string, string>;

export interface EagleViewApicenterEnv {
  EAGLEVIEW_CLIENT_ID?: string;
  EAGLEVIEW_OAUTH_CLIENT_ID?: string;
  EAGLEVIEW_CLIENT_SECRET?: string;
  EAGLEVIEW_TOKEN_URL?: string;
  /** Upstream API host (default https://apicenter.eagleview.com) */
  EAGLEVIEW_API_BASE?: string;
  EAGLEVIEW_SCOPE?: string;
  /** If set, used as Bearer instead of OAuth (not recommended for production). */
  EAGLEVIEW_ACCESS_TOKEN?: string;
}

function json(data: unknown, status: number, cors: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const PREFIX = "/api/eagleview/apicenter";
const ALLOWED_TRUE_DESIGN_ROUTES: Record<string, ReadonlySet<string>> = {
  "/solar/v1/truedesign/productAvailability/available": new Set(["POST"]),
  "/solar/v1/truedesign/init": new Set(["POST"]),
  "/solar/v1/truedesign/systemPreset": new Set(["GET", "POST", "DELETE"]),
  "/solar/v1/truedesign/systemMaxLayout": new Set(["PUT"]),
  "/solar/v1/truedesign/systemOptimize": new Set(["GET", "PUT"]),
  "/solar/v1/truedesign/systemManage": new Set(["GET", "POST", "PATCH", "DELETE"]),
  "/solar/v1/truedesign/systemCopy": new Set(["POST"]),
  "/solar/v1/truedesign/systemOverview": new Set(["GET"]),
  "/solar/v1/truedesign/systemProduction": new Set(["GET"]),
  "/solar/v1/truedesign/systemExport": new Set(["GET"]),
  "/solar/v1/truedesign/systemImage": new Set(["GET"]),
  "/solar/v1/truedesign/systemRoof": new Set(["GET", "PUT"]),
};

export async function handleEagleViewApicenterProxy(
  request: Request,
  env: EagleViewApicenterEnv,
  pathname: string,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  const tokenResult = await getEagleViewServiceBearer(env as Record<string, unknown>, {
    cacheKey: "eagleview-apicenter",
    clientIdKeys: ["EAGLEVIEW_OAUTH_CLIENT_ID", "EAGLEVIEW_CLIENT_ID"],
    clientSecretKeys: ["EAGLEVIEW_CLIENT_SECRET"],
    tokenUrlKeys: ["EAGLEVIEW_TOKEN_URL"],
    scopeKeys: ["EAGLEVIEW_SCOPE"],
    staticTokenKeys: ["EAGLEVIEW_ACCESS_TOKEN"],
    defaultTokenUrl: "https://apicenter.eagleview.com/oauth2/v1/token",
  });
  if (!tokenResult.ok) {
    return json(
      {
        success: false,
        error:
          "EagleView API Center is not configured on this Worker. Set secrets EAGLEVIEW_CLIENT_ID (or EAGLEVIEW_OAUTH_CLIENT_ID), EAGLEVIEW_CLIENT_SECRET, and optionally EAGLEVIEW_TOKEN_URL / EAGLEVIEW_API_BASE / EAGLEVIEW_SCOPE. See backend wrangler.toml comments.",
      },
      503,
      corsHeaders,
    );
  }
  const bearer = tokenResult.token;

  const apiBase = (env.EAGLEVIEW_API_BASE || "https://apicenter.eagleview.com").replace(
    /\/$/,
    "",
  );
  let suffix = pathname.startsWith(PREFIX) ? pathname.slice(PREFIX.length) : pathname;
  if (!suffix || suffix === "") suffix = "/";
  if (!suffix.startsWith("/")) suffix = `/${suffix}`;

  const normalizedPath = suffix.replace(/\/+$/, "") || "/";
  const allowedMethods = ALLOWED_TRUE_DESIGN_ROUTES[normalizedPath];
  const method = request.method.toUpperCase();
  if (!allowedMethods || !allowedMethods.has(method)) {
    return json(
      {
        success: false,
        error:
          "Path or method is not allowed by EagleView API Center proxy policy for TrueDesign routes.",
        allowedRoutes: Object.entries(ALLOWED_TRUE_DESIGN_ROUTES).map(([p, methods]) => ({
          path: p,
          methods: [...methods],
        })),
      },
      403,
      corsHeaders,
    );
  }

  const inUrl = new URL(request.url);
  const targetUrl = new URL(suffix, `${apiBase}/`);
  targetUrl.search = inUrl.search;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${bearer}`);
  const accept = request.headers.get("Accept");
  if (accept) headers.set("Accept", accept);
  const ct = request.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl.toString(), init);
  } catch (e) {
    return json(
      {
        success: false,
        error: e instanceof Error ? e.message : "EagleView upstream request failed",
      },
      502,
      corsHeaders,
    );
  }

  const outHeaders = new Headers(corsHeaders);
  const uct = upstream.headers.get("Content-Type");
  if (uct) outHeaders.set("Content-Type", uct);

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}
