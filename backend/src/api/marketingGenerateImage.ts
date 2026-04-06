/**
 * POST /api/marketing/generate-image — OpenAI Images API (DALL·E 3), company/admin only.
 * Rate-limited via HD2D_CACHE (default 15 generations / user / hour).
 */

import { getBearerPayload, type AuthEnv } from "./authRoutes";

export type MarketingImageEnv = AuthEnv & {
  OPENAI_API_KEY?: string;
  HD2D_CACHE?: KVNamespace;
};

const MAX_PER_HOUR = 15;
const HOUR_MS = 60 * 60 * 1000;

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function canUseMarketing(userType: string): boolean {
  return userType === "company" || userType === "admin";
}

async function rateLimitOk(cache: { get: (k: string) => Promise<string | null>; put: (k: string, v: string, o?: { expirationTtl?: number }) => Promise<void> } | undefined, userId: string): Promise<boolean> {
  if (!cache) return true;
  const bucket = Math.floor(Date.now() / HOUR_MS);
  const key = `mkimg:${userId}:${bucket}`;
  const raw = await cache.get(key);
  const n = raw ? parseInt(raw, 10) || 0 : 0;
  if (n >= MAX_PER_HOUR) return false;
  await cache.put(key, String(n + 1), { expirationTtl: Math.floor(HOUR_MS / 1000) * 2 });
  return true;
}

const ALLOWED_SIZES = new Set(["1024x1024", "1792x1024", "1024x1792"]);

export async function handleMarketingGenerateImage(
  request: Request,
  env: MarketingImageEnv,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "POST required." }), { status: 405, headers: j });
  }

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: "Sign in required." }), { status: 401, headers: j });
  }
  if (!canUseMarketing(payload.user_type)) {
    return new Response(JSON.stringify({ success: false, error: "Company or admin access required." }), {
      status: 403,
      headers: j,
    });
  }

  const apiKey = (env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: "OPENAI_API_KEY is not configured on the Worker." }), {
      status: 503,
      headers: j,
    });
  }

  if (!(await rateLimitOk(env.HD2D_CACHE, payload.sub))) {
    return new Response(
      JSON.stringify({ success: false, error: `Image generation limit (${MAX_PER_HOUR}/hour). Try again later.` }),
      { status: 429, headers: j },
    );
  }

  let body: { prompt?: string; size?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), { status: 400, headers: j });
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt || prompt.length > 4000) {
    return new Response(JSON.stringify({ success: false, error: "Prompt is required (max 4000 characters)." }), {
      status: 400,
      headers: j,
    });
  }

  const size = ALLOWED_SIZES.has((body.size || "").trim()) ? body.size!.trim() : "1024x1024";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    }),
  });

  const data = (await res.json()) as {
    data?: { b64_json?: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = data.error?.message || `OpenAI error (${res.status})`;
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 502, headers: j });
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    return new Response(JSON.stringify({ success: false, error: "No image returned from OpenAI." }), {
      status: 502,
      headers: j,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        b64_json: b64,
        mimeType: "image/png",
        size,
      },
    }),
    { headers: j },
  );
}
