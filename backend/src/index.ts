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
import { handleDealMachinePropertyPost } from "./api/dealmachineProxy";
import { handleHealthD1Probe, handleHealthGet } from "./api/health";
import { handleStlIntel, handleStlStormReports } from "./api/stlIntel";
import { handleAuthRequest, type AuthEnv as AuthEnvBearer } from "./api/authRoutes";
import { handleOsmBuildingAtPointGet } from "./api/osmBuildingFootprint";
import { handleAdminUserRoutes } from "./api/adminUserRoutes";
import { handleCoursesCatalogGet, handleAdminCoursesCatalogRoutes } from "./api/coursesCatalogRoutes";
import { handleLeadsCheckoutSession, type LeadsCheckoutEnv } from "./api/leadsCheckout";
import { handleArcgisRequest, type ArcgisEnv } from "./api/arcgisProxy";
import { handleEstimatorChatAi } from "./api/estimatorChatAi";
import { handleGhlSubmitLead } from "./api/ghlSubmitLead";

interface Env {
  DB: any;
  HD2D_CACHE: any;
  OPENAI_API_KEY?: string;
  SESSION_SECRET?: string;
  /** When "false", disables POST /api/auth/register. */
  AUTH_SIGNUP_ENABLED?: string;
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
  AUTH_ADMIN_NAME?: string;
  AUTH_COMPANY_EMAIL?: string;
  AUTH_COMPANY_PASSWORD?: string;
  AUTH_REP_EMAIL?: string;
  AUTH_REP_PASSWORD?: string;
  /** ArcGIS parcel layer for Canvassing (FeatureServer …/0). Use wrangler secret for ARCGIS_API_TOKEN. */
  ARCGIS_FEATURE_LAYER_URL?: string;
  ARCGIS_API_TOKEN?: string;
  /** Optional JSON array of { id, layerUrl, west, south, east, north } merged with built-in MO/IL parcel fallbacks. */
  ARCGIS_EXTRA_PARCEL_FALLBACKS_JSON?: string;
  /** Optional override for building footprint point query; defaults to USGS national layer. */
  ESRI_BUILDING_FOOTPRINT_LAYER_URL?: string;
  /** Optional MapServer/ImageServer tile template for Canvassing base map overlay ({z}/{y}/{x}); exposed via GET /api/health. */
  ARCGIS_MAPSERVER_TILE_URL?: string;
  ARCGIS_MAPSERVER_TILE_ATTRIBUTION?: string;
  ARCGIS_MAPSERVER_TILE_OPACITY?: string;
  /** DealMachine Public API — Application Settings → API (see https://docs.dealmachine.com/). */
  DEALMACHINE_API_KEY?: string;
  DEALMACHINE_API_BASE?: string;
  DEALMACHINE_PROPERTY_PATH?: string;
  DEALMACHINE_AUTH_MODE?: string;
  /** Stripe secret for POST /api/leads/checkout-session (wrangler secret). */
  STRIPE_SECRET_KEY?: string;
  /** Comma-separated Price ids allowed for lead checkout (e.g. price_abc,price_def). */
  LEADS_STRIPE_PRICE_IDS?: string;
  /** Public SPA origin for Stripe success/cancel URLs (no trailing slash). */
  APP_PUBLIC_ORIGIN?: string;
  /** GoHighLevel Private Integration token (Bearer) for POST /api/ghl/submit-lead */
  GHL_PRIVATE_INTEGRATION_TOKEN?: string;
  /** GHL location id (sub-account) */
  GHL_LOCATION_ID?: string;
}

type AuthEnv = Pick<
  Env,
  | "DB"
  | "SESSION_SECRET"
  | "AUTH_SIGNUP_ENABLED"
  | "AUTH_ADMIN_EMAIL"
  | "AUTH_ADMIN_PASSWORD"
  | "AUTH_ADMIN_NAME"
  | "AUTH_COMPANY_EMAIL"
  | "AUTH_COMPANY_PASSWORD"
  | "AUTH_REP_EMAIL"
  | "AUTH_REP_PASSWORD"
>;

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    logEagleViewEnvSummaryOnce(env);
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS: `*` matches Bearer-token SPA clients (no cookies). To harden, set Allow-Origin to APP_PUBLIC_ORIGIN only.
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-DM-Client-Key, x-company-id",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route requests to appropriate handlers (await async handlers so rejections hit catch below — avoids CF 1101).
      // Include `/api/auth` (no trailing slash) — `startsWith("/api/auth/")` alone misses it and returns 404.
      if (path === "/api/auth" || path === "/api/auth/" || path.startsWith("/api/auth/")) {
        return await handleAuthRequest(request, env as AuthEnv, path, corsHeaders);
      } else if (
        (path === "/api/leads/checkout-session" || path === "/api/leads/checkout-session/") &&
        request.method === "POST"
      ) {
        return await handleLeadsCheckoutSession(request, env as LeadsCheckoutEnv, corsHeaders);
      } else if (path.startsWith("/api/leads")) {
        return await handleLeads(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/deals")) {
        return await handleDeals(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/posts")) {
        return await handlePosts(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/comments")) {
        return await handleComments(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/events")) {
        return await handleEvents(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/tasks")) {
        return await handleTasks(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/calls")) {
        return await handleCalls(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/agents")) {
        return await handleAgents(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/workflows")) {
        return await handleWorkflows(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/arcgis/")) {
        return await handleArcgisRequest(request, env as ArcgisEnv, path, corsHeaders);
      } else if (path.startsWith("/api/admin/users")) {
        return await handleAdminUserRoutes(request, env as AuthEnv, path, corsHeaders);
      } else if (path.startsWith("/api/admin/courses")) {
        return await handleAdminCoursesCatalogRoutes(request, env as AuthEnv, path, corsHeaders);
      } else if (path.startsWith("/api/admin")) {
        return await handleAdmin(request, env, path, corsHeaders);
      } else if (path === "/api/ai/roof-damage") {
        return await handleRoofDamageAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-report-language") {
        return await handleRoofReportLanguageAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-pitch") {
        return await handleRoofPitchAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-vision") {
        return await handleRoofVisionProxy(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-segment") {
        return await handleRoofSegmentProxy(request, env, corsHeaders);
      } else if (path === "/api/ai/bedtime-story") {
        return await handleBedtimeStoryAi(request, env, corsHeaders);
      } else if (path === "/api/ai/estimator-chat") {
        return await handleEstimatorChatAi(request, env, corsHeaders);
      } else if (path === "/api/ghl/submit-lead") {
        return await handleGhlSubmitLead(request, env, corsHeaders);
      } else if (path === "/api/measurements/hybrid") {
        return await handleMeasurementsHybrid(request, env, corsHeaders);
      } else if (path === "/api/property-scraper/listing") {
        return await handlePropertyScraperListingProxy(request, env, corsHeaders);
      } else if (path.startsWith("/api/eagleview/apicenter")) {
        return await handleEagleViewApicenterProxy(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/eagleview/property-data")) {
        return await handleEagleViewPropertyDataProxy(request, env, corsHeaders);
      } else if (path === "/api/eagleview/embedded/token") {
        return await handleEagleViewEmbeddedToken(request, env, corsHeaders);
      } else if (path === "/api/stl/intel") {
        return await handleStlIntel(request, env, corsHeaders);
      } else if (path === "/api/stl/storm-reports") {
        return await handleStlStormReports(request, env, corsHeaders);
      } else if (path === "/api/health/d1") {
        return await handleHealthD1Probe(request, env, corsHeaders);
      } else if (path === "/api/health") {
        return await handleHealthGet(request, env, corsHeaders);
      } else if (path === "/api/osm/building-at-point" && request.method === "GET") {
        return await handleOsmBuildingAtPointGet(request, env as AuthEnvBearer, corsHeaders);
      } else if (path === "/api/dealmachine/property") {
        return await handleDealMachinePropertyPost(request, env, corsHeaders);
      } else if (path.startsWith("/api/courses/catalog")) {
        return await handleCoursesCatalogGet(request, env as AuthEnvBearer, path, corsHeaders);
      } else if (path.startsWith("/webhook/")) {
        return await handleWebhooks(request, env, path, corsHeaders);
      } else if (path === "/" || path === "/api") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "HD2D Backend API",
            version: "1.0.0",
            status: "running",
            endpoints: 50,
            health: "/api/health",
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
