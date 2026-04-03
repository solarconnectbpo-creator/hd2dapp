/**
 * HD2D Backend - Main Entry Point
 * Cloudflare Workers API Router
 * Handles all 50+ API endpoints for the platform
 */

import { handleRoofDamageAi } from "./api/roofDamageAi";
import { handleRoofPitchAi } from "./api/roofPitchAi";
import { handleRoofReportLanguageAi } from "./api/roofReportLanguageAi";
import { handleRoofVisionProxy, handleRoofSegmentProxy } from "./api/roofVisionProxy";
import { handleEagleViewPropertyDataProxy } from "./api/eagleviewPropertyDataProxy";
import { handleEagleViewApicenterProxy } from "./api/eagleviewApicenterProxy";
import { handleEagleViewEmbeddedToken } from "./api/eagleviewEmbeddedToken";
import { handleMeasurementsHybrid } from "./api/measurementsHybrid";
import { handlePropertyScraperListingProxy } from "./api/propertyScraperProxy";
import { handleBedtimeStoryAi } from "./api/bedtimeStoryAi";
import { handleBatchDataPropertySearchProxy } from "./api/batchDataProxy";
import { handleStlIntel, handleStlStormReports } from "./api/stlIntel";

interface Env {
  DB: any;
  HD2D_CACHE: any;
  OPENAI_API_KEY?: string;
  SESSION_SECRET?: string;
  /** EagleView API Center OAuth (see `eagleviewApicenterProxy.ts`). */
  EAGLEVIEW_CLIENT_ID?: string;
  EAGLEVIEW_OAUTH_CLIENT_ID?: string;
  EAGLEVIEW_CLIENT_SECRET?: string;
  EAGLEVIEW_TOKEN_URL?: string;
  EAGLEVIEW_API_BASE?: string;
  EAGLEVIEW_SCOPE?: string;
  EAGLEVIEW_ACCESS_TOKEN?: string;
  EAGLEVIEW_EMBEDDED_CLIENT_ID?: string;
  EAGLEVIEW_EMBEDDED_CLIENT_SECRET?: string;
  EAGLEVIEW_EMBEDDED_TOKEN_URL?: string;
  EAGLEVIEW_EMBEDDED_SCOPE?: string;
  EAGLEVIEW_EMBEDDED_ACCESS_TOKEN?: string;
  /** Base URL of backend/ml-vision-service (FastAPI). */
  ROOF_VISION_SERVICE_URL?: string;
  ROOF_VISION_SERVICE_SECRET?: string;
  ROOF3D_API_URL?: string;
  ROOF3D_API_PATH?: string;
  ROOF3D_API_KEY?: string;
  PROPERTY_SCRAPER_API_BASE_URL?: string;
  AUTH_ADMIN_EMAIL?: string;
  AUTH_ADMIN_PASSWORD?: string;
  AUTH_COMPANY_EMAIL?: string;
  AUTH_COMPANY_PASSWORD?: string;
  AUTH_REP_EMAIL?: string;
  AUTH_REP_PASSWORD?: string;
}

let eagleViewEnvLogged = false;

function logEagleViewEnvSummaryOnce(env: Env): void {
  if (eagleViewEnvLogged) return;
  eagleViewEnvLogged = true;
  const hasApiCenterCreds = Boolean(
    (env.EAGLEVIEW_OAUTH_CLIENT_ID || env.EAGLEVIEW_CLIENT_ID) && env.EAGLEVIEW_CLIENT_SECRET,
  );
  const hasEmbeddedCreds = Boolean(
    (env.EAGLEVIEW_EMBEDDED_CLIENT_ID || env.EAGLEVIEW_CLIENT_ID) &&
      (env.EAGLEVIEW_EMBEDDED_CLIENT_SECRET || env.EAGLEVIEW_CLIENT_SECRET),
  );
  const embeddedTokenUrl = env.EAGLEVIEW_EMBEDDED_TOKEN_URL || "https://api.eagleview.com/auth-service/v1/token";
  console.log(
    `[eagleview-env] apiCenterCreds=${hasApiCenterCreds ? "yes" : "no"} embeddedCreds=${hasEmbeddedCreds ? "yes" : "no"} embeddedTokenUrl=${embeddedTokenUrl}`,
  );
  if (!hasEmbeddedCreds) {
    console.warn(
      "[eagleview-env] Embedded map token route may fail: set EAGLEVIEW_EMBEDDED_CLIENT_ID and EAGLEVIEW_EMBEDDED_CLIENT_SECRET (or shared EAGLEVIEW_CLIENT_*).",
    );
  }
}

type AuthRole = "admin" | "company" | "sales_rep";
type AuthUser = { id: string; email: string; name: string; user_type: AuthRole };

type AuthTokenPayload = {
  sub: string;
  email: string;
  user_type: AuthRole;
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function signAuthPayload(payload: AuthTokenPayload, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const sig = toBase64Url(new Uint8Array(sigBuf));
  return `${body}.${sig}`;
}

async function verifyAuthToken(token: string, secret: string): Promise<AuthTokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), enc.encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as AuthTokenPayload;
    if (!payload?.sub || !payload?.email || !payload?.user_type || !payload?.exp) return null;
    if (Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    logEagleViewEnvSummaryOnce(env);
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-company-id",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route requests to appropriate handlers
      if (path.startsWith("/api/auth/")) {
        return handleAuth(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/leads")) {
        return handleLeads(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/deals")) {
        return handleDeals(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/posts")) {
        return handlePosts(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/comments")) {
        return handleComments(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/events")) {
        return handleEvents(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/tasks")) {
        return handleTasks(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/calls")) {
        return handleCalls(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/agents")) {
        return handleAgents(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/workflows")) {
        return handleWorkflows(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/admin")) {
        return handleAdmin(request, env, path, corsHeaders);
      } else if (path === "/api/ai/roof-damage") {
        return handleRoofDamageAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-report-language") {
        return handleRoofReportLanguageAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-pitch") {
        return handleRoofPitchAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-vision") {
        return handleRoofVisionProxy(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-segment") {
        return handleRoofSegmentProxy(request, env, corsHeaders);
      } else if (path === "/api/ai/bedtime-story") {
        return handleBedtimeStoryAi(request, env, corsHeaders);
      } else if (path === "/api/measurements/hybrid") {
        return handleMeasurementsHybrid(request, env, corsHeaders);
      } else if (path === "/api/property-scraper/listing") {
        return handlePropertyScraperListingProxy(request, env, corsHeaders);
      } else if (path.startsWith("/api/eagleview/apicenter")) {
        return handleEagleViewApicenterProxy(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/eagleview/property-data")) {
        return handleEagleViewPropertyDataProxy(request, env, corsHeaders);
      } else if (path === "/api/eagleview/embedded/token") {
        return handleEagleViewEmbeddedToken(request, env, corsHeaders);
      } else if (path === "/api/stl/intel") {
        return handleStlIntel(request, env, corsHeaders);
      } else if (path === "/api/stl/storm-reports") {
        return handleStlStormReports(request, env, corsHeaders);
      } else if (path === "/api/batchdata/property-search") {
        return handleBatchDataPropertySearchProxy(request, corsHeaders);
      } else if (path.startsWith("/webhook/")) {
        return handleWebhooks(request, env, path, corsHeaders);
      } else if (path === "/" || path === "/api") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "HD2D Backend API",
            version: "1.0.0",
            status: "running",
            endpoints: 50,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Request error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            error instanceof Error ? error.message : "Internal server error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },

  async scheduled(event: any, env: Env): Promise<void> {
    // Scheduled tasks for background jobs
    console.log("Scheduled event triggered");
  },
};

// Placeholder handlers - route to respective API files
async function handleAuth(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  const secret = (env.SESSION_SECRET || "dev-session-secret-change-me").trim();
  const adminEmail = (env.AUTH_ADMIN_EMAIL || "admin@hardcoredoortodoorclosers.com").trim();
  const adminPassword = (env.AUTH_ADMIN_PASSWORD || "AdminTest123!").trim();
  const companyEmail = (env.AUTH_COMPANY_EMAIL || "test.company@hardcoredoortodoorclosers.com").trim();
  const companyPassword = (env.AUTH_COMPANY_PASSWORD || "TestCompany123!").trim();
  const repEmail = (env.AUTH_REP_EMAIL || "test.rep@hardcoredoortodoorclosers.com").trim();
  const repPassword = (env.AUTH_REP_PASSWORD || "TestRep123!").trim();
  const users: Array<{ user: AuthUser; password: string }> = [
    {
      user: { id: "admin-1", email: adminEmail, name: "Admin", user_type: "admin" },
      password: adminPassword,
    },
    {
      user: { id: "company-1", email: companyEmail, name: "Test Company", user_type: "company" },
      password: companyPassword,
    },
    {
      user: { id: "rep-1", email: repEmail, name: "Test Rep", user_type: "sales_rep" },
      password: repPassword,
    },
  ];

  if (path === "/api/auth/login" && request.method === "POST") {
    let body: { email?: string; password?: string } = {};
    try {
      body = (await request.json()) as { email?: string; password?: string };
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const matched = users.find(
      (u) => u.user.email.toLowerCase() === email && u.password === password,
    );
    if (!matched) {
      return new Response(JSON.stringify({ success: false, error: "Invalid credentials." }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    const expMs = Date.now() + 1000 * 60 * 60 * 12;
    const token = await signAuthPayload(
      {
        sub: matched.user.id,
        email: matched.user.email,
        user_type: matched.user.user_type,
        exp: expMs,
      },
      secret,
    );
    return new Response(
      JSON.stringify({
        success: true,
        token,
        user: matched.user,
        expiresAt: expMs,
      }),
      { status: 200, headers: jsonHeaders },
    );
  }

  if (path === "/api/auth/me" && request.method === "GET") {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Missing bearer token." }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    const payload = await verifyAuthToken(token, secret);
    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired session." }), {
        status: 401,
        headers: jsonHeaders,
      });
    }
    const user = users.find((u) => u.user.id === payload.sub)?.user ?? {
      id: payload.sub,
      email: payload.email,
      name: payload.email.split("@")[0],
      user_type: payload.user_type,
    };
    return new Response(JSON.stringify({ success: true, user }), { status: 200, headers: jsonHeaders });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: jsonHeaders });
  }

  return new Response(
    JSON.stringify({ success: false, error: "Auth endpoint not implemented." }),
    {
      status: 501,
      headers: jsonHeaders,
    },
  );
}

async function handleLeads(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Leads endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleDeals(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Deals endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handlePosts(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Posts endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleComments(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Comments endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleEvents(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Events endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleTasks(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Tasks endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleCalls(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Calls endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleAgents(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Agents endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleWorkflows(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Workflows endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleAdmin(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: {}, message: "Admin endpoint" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function handleWebhooks(
  request: Request,
  env: Env,
  path: string,
  corsHeaders: any,
): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, message: "Webhook received" }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}
