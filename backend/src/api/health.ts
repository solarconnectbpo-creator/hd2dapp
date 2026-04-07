/**
 * GET /api/health — deployment checks (no secrets exposed; only whether optional keys are set).
 */

import { resolveArcgisParcelLayerUrl } from "./arcgisParcelEnv";

/** Bumped when deploying auth/D1 fixes — curl GET /api/health to confirm the live Worker matches the repo. */
export const WORKER_BUILD_TAG = "2026-04-06-sms-automation-v2";

type HealthEnv = {
  /** OpenAI — chat, marketing images, roof helpers (Wrangler secret `OPENAI_API_KEY`). */
  OPENAI_API_KEY?: string;
  /** When set, Worker proxies `/api/ai/roof-vision` and `/api/ai/roof-segment` to ml-vision-service. */
  ROOF_VISION_SERVICE_URL?: string;
  ROOF_VISION_SERVICE_SECRET?: string;
  DEALMACHINE_API_KEY?: string;
  ARCGIS_FEATURE_LAYER_URL?: string;
  /**
   * Optional ArcGIS Server / ImageServer / MapServer **cached** tile template for MapLibre (slippy XYZ).
   * Example: https://tiles.example.com/arcgis/rest/services/Parcels/MapServer/tile/{z}/{y}/{x}
   */
  ARCGIS_MAPSERVER_TILE_URL?: string;
  /** Optional attribution HTML/text for the tile layer (shown in MapLibre attribution). */
  ARCGIS_MAPSERVER_TILE_ATTRIBUTION?: string;
  /** Raster opacity 0–1 (default 0.55). */
  ARCGIS_MAPSERVER_TILE_OPACITY?: string;
  /** When "false", self-service registration is off. */
  AUTH_SIGNUP_ENABLED?: string;
  STRIPE_SECRET_KEY?: string;
  MEMBERSHIP_STRIPE_PRICE_ID?: string;
  /** Telnyx API key — outbound SMS + workflow steps (see services/sms). */
  TELNYX_API_KEY?: string;
  /** Twilio Account SID — optional alternative to Telnyx when set with TWILIO_AUTH_TOKEN. */
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  /** Stripe metered Price id for SMS usage records (optional). */
  STRIPE_SMS_METERED_PRICE_ID?: string;
  RESEND_API_KEY?: string;
};

type CorsHeaders = Record<string, string>;

function json(data: unknown, status: number, corsHeaders: CorsHeaders): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

export function handleHealthGet(
  request: Request,
  env: HealthEnv,
  corsHeaders: CorsHeaders,
): Response {
  if (request.method !== "GET") {
    return json({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const tileRaw = (env.ARCGIS_MAPSERVER_TILE_URL || "").trim();
  const tileOk =
    /^https?:\/\//i.test(tileRaw) &&
    /\{z\}/.test(tileRaw) &&
    /\{y\}/.test(tileRaw) &&
    /\{x\}/.test(tileRaw);
  const opacityRaw = Number.parseFloat((env.ARCGIS_MAPSERVER_TILE_OPACITY || "0.55").trim());
  const tileOpacity =
    Number.isFinite(opacityRaw) ? Math.min(1, Math.max(0.05, opacityRaw)) : 0.55;

  return json(
    {
      ok: true,
      service: "hd2d-backend",
      version: "1.0.0",
      workerBuild: WORKER_BUILD_TAG,
      capabilities: {
        /** True when `ROOF_VISION_SERVICE_URL` is set (Worker can reach ml-vision-service for roof infer + SAM trace). */
        roofVisionProxy: Boolean((env.ROOF_VISION_SERVICE_URL || "").trim()),
        /** True when `ROOF_VISION_SERVICE_SECRET` is set (sent to vision service as `X-HD2D-Secret`). */
        roofVisionSharedSecret: Boolean((env.ROOF_VISION_SERVICE_SECRET || "").trim()),
        dealmachineServerKey: Boolean(env.DEALMACHINE_API_KEY?.trim()),
        /** True when `OPENAI_API_KEY` secret is set (marketing images, estimator chat, roof AI). */
        openaiConfigured: Boolean(env.OPENAI_API_KEY?.trim()),
        arcgisParcelLayer: Boolean(resolveArcgisParcelLayerUrl(env)),
        /** Public tile URL for optional county / reference raster on the Canvassing map (no token in URL). */
        arcgisMapServerTileUrl: tileOk ? tileRaw : null,
        arcgisMapServerTileAttribution: tileOk
          ? (env.ARCGIS_MAPSERVER_TILE_ATTRIBUTION || "").trim() || undefined
          : undefined,
        arcgisMapServerTileOpacity: tileOk ? tileOpacity : undefined,
        authSignup:
          (env.AUTH_SIGNUP_ENABLED || "").trim().toLowerCase() !== "false",
        /** True when Stripe + membership Price id are set (POST /api/billing/membership-checkout-session). */
        membershipCheckout: Boolean(
          (env.STRIPE_SECRET_KEY || "").trim() && (env.MEMBERSHIP_STRIPE_PRICE_ID || "").trim(),
        ),
        /** True when Resend is configured (POST /api/auth/register can email admin on new sign-up). */
        signupNotifyEmail: Boolean((env.RESEND_API_KEY || "").trim()),
        /** True when Telnyx API key is set (POST /api/sms/send, workflow SMS steps, inbound webhook persistence). */
        telnyxSms: Boolean((env.TELNYX_API_KEY || "").trim()),
        /** True when Twilio Account SID + Auth Token are set (alternative outbound + /api/webhooks/twilio). */
        twilioSms: Boolean((env.TWILIO_ACCOUNT_SID || "").trim() && (env.TWILIO_AUTH_TOKEN || "").trim()),
        /** True when metered SMS Price id is set (usage records after successful outbound SMS when subscription item exists). */
        stripeSmsMeteredPrice: Boolean((env.STRIPE_SMS_METERED_PRICE_ID || "").trim()),
      },
    },
    200,
    corsHeaders,
  );
}

type D1ProbeEnv = { DB?: unknown };

/** GET /api/health/d1 — verifies D1 binding + a trivial query (diagnoses login 1101 / missing migrations). */
export async function handleHealthD1Probe(
  request: Request,
  env: D1ProbeEnv,
  corsHeaders: CorsHeaders,
): Promise<Response> {
  if (request.method !== "GET") {
    return json({ success: false, error: "Method not allowed" }, 405, corsHeaders);
  }
  if (env.DB == null) {
    return json({ ok: false, workerBuild: WORKER_BUILD_TAG, d1: "missing_binding" }, 503, corsHeaders);
  }
  try {
    const db = env.DB as { prepare: (sql: string) => { first: () => Promise<unknown> } };
    await db.prepare("SELECT 1 AS n").first();
    return json({ ok: true, workerBuild: WORKER_BUILD_TAG, d1: "query_ok" }, 200, corsHeaders);
  } catch (e) {
    return json(
      {
        ok: false,
        workerBuild: WORKER_BUILD_TAG,
        d1: "query_error",
        error: e instanceof Error ? e.message : String(e),
      },
      503,
      corsHeaders,
    );
  }
}
