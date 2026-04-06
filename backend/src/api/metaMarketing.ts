/**
 * Meta (Facebook) — OAuth, scheduled Page posts (Graph API), optional draft ad campaigns.
 *
 * Env: META_APP_ID, META_APP_SECRET (secrets), APP_PUBLIC_ORIGIN (redirect must match Meta app settings).
 * Optional: META_DEFAULT_AD_ACCOUNT_ID (e.g. act_123) for POST /api/meta/campaign-draft.
 *
 * OAuth redirect URI (add in Meta Developer Console): {APP_PUBLIC_ORIGIN}/api/meta/oauth/callback
 */

import { getBearerPayload, type AuthEnv } from "./authRoutes";

const GRAPH_VERSION = "v21.0";
const META_OAUTH_TYP = "meta_oauth_v1";

export type MetaMarketingEnv = AuthEnv & {
  META_APP_ID?: string;
  META_APP_SECRET?: string;
  APP_PUBLIC_ORIGIN?: string;
  /** Optional: act_123 — used with ads_management to create PAUSED draft campaigns */
  META_DEFAULT_AD_ACCOUNT_ID?: string;
};

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function getSecret(env: AuthEnv): string {
  return (env.SESSION_SECRET || "dev-session-secret-change-me").trim();
}

function originFromEnv(env: MetaMarketingEnv): string {
  return (env.APP_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
}

function redirectUri(env: MetaMarketingEnv): string | null {
  const o = originFromEnv(env);
  if (!o) return null;
  return `${o}/api/meta/oauth/callback`;
}

function canUseMeta(userType: string): boolean {
  return userType === "company" || userType === "admin";
}

type MetaStatePayload = { sub: string; exp: number; typ: typeof META_OAUTH_TYP };

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

async function signMetaState(sub: string, secret: string, ttlMs: number): Promise<string> {
  const payload: MetaStatePayload = { sub, exp: Date.now() + ttlMs, typ: META_OAUTH_TYP };
  const enc = new TextEncoder();
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const sig = toBase64Url(new Uint8Array(sigBuf));
  return `${body}.${sig}`;
}

async function verifyMetaState(token: string, secret: string): Promise<MetaStatePayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "verify",
  ]);
  const ok = await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), enc.encode(body));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as MetaStatePayload;
    if (payload.typ !== META_OAUTH_TYP || !payload.sub || !payload.exp) return null;
    if (Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

const FB_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "ads_read",
  "ads_management",
  "business_management",
].join(",");

async function graphGet(path: string, params: Record<string, string>): Promise<{ ok: true; data: unknown } | { ok: false; err: string }> {
  const u = new URL(`https://graph.facebook.com/${GRAPH_VERSION}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u.toString(), { method: "GET" });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === "object" && data.error && typeof (data.error as { message?: string }).message === "string"
        ? (data.error as { message: string }).message
        : `Graph error (${res.status})`;
    return { ok: false, err: msg };
  }
  return { ok: true, data };
}

async function graphPostForm(path: string, form: Record<string, string>): Promise<{ ok: true; data: unknown } | { ok: false; err: string }> {
  const body = new URLSearchParams(form);
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      typeof data.error === "object" && data.error && typeof (data.error as { message?: string }).message === "string"
        ? (data.error as { message: string }).message
        : `Graph error (${res.status})`;
    return { ok: false, err: msg };
  }
  return { ok: true, data };
}

async function exchangeCodeForToken(
  env: MetaMarketingEnv,
  code: string,
): Promise<{ access_token: string; expires_in?: number } | null> {
  const appId = (env.META_APP_ID || "").trim();
  const secret = (env.META_APP_SECRET || "").trim();
  const redir = redirectUri(env);
  if (!appId || !secret || !redir) return null;
  const u = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  u.searchParams.set("client_id", appId);
  u.searchParams.set("redirect_uri", redir);
  u.searchParams.set("client_secret", secret);
  u.searchParams.set("code", code);
  const res = await fetch(u.toString());
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!res.ok || !data.access_token) {
    console.warn("[meta] code exchange failed", data?.error?.message || res.status);
    return null;
  }
  let token = data.access_token;
  const expIn = data.expires_in;

  const ex = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`);
  ex.searchParams.set("grant_type", "fb_exchange_token");
  ex.searchParams.set("client_id", appId);
  ex.searchParams.set("client_secret", secret);
  ex.searchParams.set("fb_exchange_token", token);
  const longRes = await fetch(ex.toString());
  const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };
  if (longRes.ok && longData.access_token) {
    token = longData.access_token;
    return { access_token: token, expires_in: longData.expires_in };
  }
  return { access_token: token, expires_in: expIn };
}

async function saveUserToken(db: any, userId: string, accessToken: string, expiresIn?: number) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = expiresIn ? now + expiresIn : null;
  await db
    .prepare(
      `INSERT INTO meta_user_tokens (user_id, access_token, expires_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         access_token = excluded.access_token,
         expires_at = excluded.expires_at,
         updated_at = excluded.updated_at`,
    )
    .bind(userId, accessToken, expiresAt, now)
    .run();
}

async function getUserToken(db: any, userId: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT access_token FROM meta_user_tokens WHERE user_id = ?")
    .bind(userId)
    .first<{ access_token: string }>();
  return row?.access_token ?? null;
}

async function deleteUserToken(db: any, userId: string) {
  await db.prepare("DELETE FROM meta_user_tokens WHERE user_id = ?").bind(userId).run();
}

type PageAccount = { id: string; name: string; access_token: string };

async function fetchPageAccounts(userAccessToken: string): Promise<PageAccount[]> {
  const r = await graphGet("/me/accounts", {
    access_token: userAccessToken,
    fields: "id,name,access_token",
    limit: "100",
  });
  if (!r.ok) return [];
  const data = r.data as { data?: PageAccount[] };
  return Array.isArray(data.data) ? data.data : [];
}

function pageTokenForId(pages: PageAccount[], pageId: string): string | null {
  const p = pages.find((x) => x.id === pageId);
  return p?.access_token ?? null;
}

/** Min ~10 minutes; max ~75 days per Meta */
function validateScheduledUnix(unix: number): string | null {
  const now = Math.floor(Date.now() / 1000);
  const min = now + 10 * 60;
  const max = now + 75 * 24 * 60 * 60;
  if (unix < min) return "Schedule at least 10 minutes from now.";
  if (unix > max) return "Meta allows scheduling up to about 75 days ahead.";
  return null;
}

async function graphDeleteObject(objectId: string, accessToken: string): Promise<boolean> {
  const u = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${objectId}`);
  u.searchParams.set("access_token", accessToken);
  const res = await fetch(u.toString(), { method: "DELETE" });
  return res.ok;
}

export async function handleMetaMarketing(
  request: Request,
  env: MetaMarketingEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  const p = path.replace(/\/+$/, "") || "";

  if (!p.startsWith("/api/meta")) {
    return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: j });
  }

  const appId = (env.META_APP_ID || "").trim();
  const appSecret = (env.META_APP_SECRET || "").trim();
  const metaConfigured = Boolean(appId && appSecret && originFromEnv(env));

  // --- OAuth callback (no Bearer; uses signed state) ---
  if (p === "/api/meta/oauth/callback" && request.method === "GET") {
    const url = new URL(request.url);
    const code = (url.searchParams.get("code") || "").trim();
    const stateRaw = (url.searchParams.get("state") || "").trim();
    const err = (url.searchParams.get("error_description") || url.searchParams.get("error") || "").trim();
    const redirBase = originFromEnv(env) || "";

    if (!redirBase) {
      return new Response("APP_PUBLIC_ORIGIN is not configured.", { status: 500 });
    }

    if (err) {
      return Response.redirect(`${redirBase}/marketing/social?meta_error=${encodeURIComponent(err)}`, 302);
    }

    const st = await verifyMetaState(stateRaw, getSecret(env));
    if (!st || !code) {
      return Response.redirect(`${redirBase}/marketing/social?meta_error=${encodeURIComponent("Invalid or expired OAuth state.")}`, 302);
    }

    if (!metaConfigured) {
      return Response.redirect(`${redirBase}/marketing/social?meta_error=${encodeURIComponent("Meta app is not configured on the server.")}`, 302);
    }

    const tok = await exchangeCodeForToken(env, code);
    if (!tok) {
      return Response.redirect(`${redirBase}/marketing/social?meta_error=${encodeURIComponent("Could not exchange Meta authorization code.")}`, 302);
    }

    try {
      await saveUserToken(env.DB, st.sub, tok.access_token, tok.expires_in);
    } catch (e) {
      console.error("[meta] save token", e);
      return Response.redirect(
        `${redirBase}/marketing/social?meta_error=${encodeURIComponent("Database error saving Meta connection. Run D1 migration 0003.")}`,
        302,
      );
    }

    return Response.redirect(`${redirBase}/marketing/social?meta_connected=1`, 302);
  }

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: "Sign in required." }), { status: 401, headers: j });
  }
  if (!canUseMeta(payload.user_type)) {
    return new Response(JSON.stringify({ success: false, error: "Company or admin access required." }), {
      status: 403,
      headers: j,
    });
  }

  // GET /api/meta/config
  if (p === "/api/meta/config" && request.method === "GET") {
    const o = originFromEnv(env);
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          configured: metaConfigured,
          appId: metaConfigured ? appId : null,
          hasAdAccount: Boolean((env.META_DEFAULT_AD_ACCOUNT_ID || "").trim()),
          oauthRedirectUri: o ? `${o}/api/meta/oauth/callback` : null,
        },
      }),
      { headers: j },
    );
  }

  // POST /api/meta/oauth/start — returns { url }
  if (p === "/api/meta/oauth/start" && request.method === "POST") {
    if (!metaConfigured) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Meta is not configured. Set META_APP_ID, META_APP_SECRET, and APP_PUBLIC_ORIGIN on the Worker.",
        }),
        { status: 503, headers: j },
      );
    }
    const redir = redirectUri(env)!;
    const state = await signMetaState(payload.sub, getSecret(env), 15 * 60 * 1000);
    const auth = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
    auth.searchParams.set("client_id", appId);
    auth.searchParams.set("redirect_uri", redir);
    auth.searchParams.set("state", state);
    auth.searchParams.set("scope", FB_SCOPES);
    auth.searchParams.set("response_type", "code");
    return new Response(JSON.stringify({ success: true, url: auth.toString() }), { headers: j });
  }

  // POST /api/meta/disconnect
  if (p === "/api/meta/disconnect" && request.method === "POST") {
    try {
      await deleteUserToken(env.DB, payload.sub);
    } catch {
      /* ignore */
    }
    return new Response(JSON.stringify({ success: true }), { headers: j });
  }

  // GET /api/meta/status
  if (p === "/api/meta/status" && request.method === "GET") {
    const token = await getUserToken(env.DB, payload.sub);
    return new Response(JSON.stringify({ success: true, data: { connected: Boolean(token) } }), { headers: j });
  }

  // GET /api/meta/pages
  if (p === "/api/meta/pages" && request.method === "GET") {
    const token = await getUserToken(env.DB, payload.sub);
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: "Connect Meta first." }), { status: 400, headers: j });
    }
    const pages = await fetchPageAccounts(token);
    return new Response(
      JSON.stringify({
        success: true,
        data: pages.map(({ id, name }) => ({ id, name })),
      }),
      { headers: j },
    );
  }

  // GET /api/meta/scheduled
  if (p === "/api/meta/scheduled" && request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id, page_id, page_name, message, link_url, scheduled_unix, status, meta_post_id, last_error, created_at
       FROM meta_scheduled_posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
    )
      .bind(payload.sub)
      .all();
    return new Response(JSON.stringify({ success: true, data: rows?.results ?? [] }), { headers: j });
  }

  // POST /api/meta/schedule-post
  if (p === "/api/meta/schedule-post" && request.method === "POST") {
    let body: {
      pageId?: string;
      message?: string;
      linkUrl?: string;
      scheduledAt?: string;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), { status: 400, headers: j });
    }
    const pageId = (body.pageId || "").trim();
    const message = (body.message || "").trim();
    const linkUrl = (body.linkUrl || "").trim();
    const scheduledAt = (body.scheduledAt || "").trim();
    if (!pageId || !message) {
      return new Response(JSON.stringify({ success: false, error: "pageId and message are required." }), {
        status: 400,
        headers: j,
      });
    }
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) {
      return new Response(JSON.stringify({ success: false, error: "scheduledAt must be a valid ISO date string." }), {
        status: 400,
        headers: j,
      });
    }
    const scheduledUnix = Math.floor(d.getTime() / 1000);
    const vErr = validateScheduledUnix(scheduledUnix);
    if (vErr) {
      return new Response(JSON.stringify({ success: false, error: vErr }), { status: 400, headers: j });
    }

    const userTok = await getUserToken(env.DB, payload.sub);
    if (!userTok) {
      return new Response(JSON.stringify({ success: false, error: "Connect Meta first." }), { status: 400, headers: j });
    }

    const pages = await fetchPageAccounts(userTok);
    const pageTok = pageTokenForId(pages, pageId);
    const pageName = pages.find((x) => x.id === pageId)?.name ?? "";
    if (!pageTok) {
      return new Response(
        JSON.stringify({ success: false, error: "Page not found or missing permission. Re-connect Meta with Page access." }),
        { status: 400, headers: j },
      );
    }

    const id = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const now = Math.floor(Date.now() / 1000);

    const form: Record<string, string> = {
      message,
      published: "false",
      scheduled_publish_time: String(scheduledUnix),
      access_token: pageTok,
    };
    if (linkUrl) {
      try {
        const u = new URL(linkUrl);
        if (u.protocol === "http:" || u.protocol === "https:") form.link = linkUrl;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "linkUrl must be a valid http(s) URL." }), {
          status: 400,
          headers: j,
        });
      }
    }

    const post = await graphPostForm(`/${pageId}/feed`, form);
    if (!post.ok) {
      try {
        await env.DB.prepare(
          `INSERT INTO meta_scheduled_posts (id, user_id, page_id, page_name, message, link_url, scheduled_unix, status, meta_post_id, last_error, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?)`,
        )
          .bind(id, payload.sub, pageId, pageName, message, linkUrl || null, scheduledUnix, post.err, now)
          .run();
      } catch (e) {
        console.error("[meta] insert failed row", e);
        return new Response(JSON.stringify({ success: false, error: post.err }), { status: 502, headers: j });
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: post.err,
          data: { id, willRetry: true },
        }),
        { status: 502, headers: j },
      );
    }

    const pdata = post.data as { id?: string };
    const metaPostId = typeof pdata.id === "string" ? pdata.id : null;

    try {
      await env.DB.prepare(
        `INSERT INTO meta_scheduled_posts (id, user_id, page_id, page_name, message, link_url, scheduled_unix, status, meta_post_id, last_error, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, NULL, ?)`,
      )
        .bind(id, payload.sub, pageId, pageName, message, linkUrl || null, scheduledUnix, metaPostId, now)
        .run();
    } catch (e) {
      console.error("[meta] insert success row", e);
      return new Response(JSON.stringify({ success: true, data: { id, metaPostId, warning: "Saved on Meta but local log failed." } }), {
        headers: j,
      });
    }

    return new Response(JSON.stringify({ success: true, data: { id, metaPostId } }), { headers: j });
  }

  // DELETE /api/meta/scheduled/:id
  const delM = /^\/api\/meta\/scheduled\/([^/]+)$/.exec(p);
  if (delM && request.method === "DELETE") {
    const sid = delM[1];
    const row = await env.DB.prepare(
      "SELECT meta_post_id, page_id FROM meta_scheduled_posts WHERE id = ? AND user_id = ?",
    )
      .bind(sid, payload.sub)
      .first<{ meta_post_id: string | null; page_id: string }>();
    if (!row) {
      return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
    }
    const userTok = await getUserToken(env.DB, payload.sub);
    if (userTok && row.meta_post_id) {
      const pages = await fetchPageAccounts(userTok);
      const pageTok = pageTokenForId(pages, row.page_id);
      if (pageTok) {
        await graphDeleteObject(row.meta_post_id, pageTok).catch(() => false);
      }
    }
    await env.DB.prepare("DELETE FROM meta_scheduled_posts WHERE id = ? AND user_id = ?").bind(sid, payload.sub).run();
    return new Response(JSON.stringify({ success: true }), { headers: j });
  }

  // POST /api/meta/campaign-draft
  if (p === "/api/meta/campaign-draft" && request.method === "POST") {
    const rawAct = (env.META_DEFAULT_AD_ACCOUNT_ID || "").trim();
    if (!rawAct) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "META_DEFAULT_AD_ACCOUNT_ID is not set on the Worker (set to your ad account id, e.g. 123456789 or act_123456789).",
        }),
        { status: 503, headers: j },
      );
    }
    let body: { name?: string; objective?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), { status: 400, headers: j });
    }
    const name = (body.name || "").trim() || `HD2D campaign ${new Date().toISOString().slice(0, 10)}`;
    const objective = (body.objective || "OUTCOME_TRAFFIC").trim();

    const userTok = await getUserToken(env.DB, payload.sub);
    if (!userTok) {
      return new Response(JSON.stringify({ success: false, error: "Connect Meta first." }), { status: 400, headers: j });
    }

    const actId = rawAct.startsWith("act_") ? rawAct : `act_${rawAct}`;
    const actNumeric = actId.replace(/^act_/, "");
    const r = await graphPostForm(`/${actId}/campaigns`, {
      name,
      objective,
      status: "PAUSED",
      special_ad_categories: "[]",
      access_token: userTok,
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ success: false, error: r.err }), { status: 502, headers: j });
    }
    const d = r.data as { id?: string };
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          campaignId: d.id ?? null,
          adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${actNumeric}`,
        },
      }),
      { headers: j },
    );
  }

  // POST /api/meta/ad-image — upload Base64 image to ad library (returns hash)
  if (p === "/api/meta/ad-image" && request.method === "POST") {
    const rawAct = (env.META_DEFAULT_AD_ACCOUNT_ID || "").trim();
    if (!rawAct) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "META_DEFAULT_AD_ACCOUNT_ID is not set on the Worker.",
        }),
        { status: 503, headers: j },
      );
    }
    let body: { imageBase64?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), { status: 400, headers: j });
    }
    let b64 = (body.imageBase64 || "").trim().replace(/\s/g, "");
    const comma = b64.indexOf(",");
    if (comma >= 0) b64 = b64.slice(comma + 1);
    if (!b64 || b64.length > 12_000_000) {
      return new Response(JSON.stringify({ success: false, error: "imageBase64 is required (max ~9MB raw)." }), {
        status: 400,
        headers: j,
      });
    }

    const userTok = await getUserToken(env.DB, payload.sub);
    if (!userTok) {
      return new Response(JSON.stringify({ success: false, error: "Connect Meta first." }), { status: 400, headers: j });
    }

    const actId = rawAct.startsWith("act_") ? rawAct : `act_${rawAct}`;
    const r = await graphPostForm(`/${actId}/adimages`, {
      bytes: b64,
      access_token: userTok,
    });
    if (!r.ok) {
      return new Response(JSON.stringify({ success: false, error: r.err }), { status: 502, headers: j });
    }
    const imgData = r.data as {
      images?: Record<string, { hash?: string; url?: string }>;
    };
    let hash: string | null = null;
    if (imgData.images) {
      for (const v of Object.values(imgData.images)) {
        if (v?.hash) {
          hash = v.hash;
          break;
        }
      }
    }
    return new Response(JSON.stringify({ success: true, data: { hash, raw: r.data } }), { headers: j });
  }

  // POST /api/meta/ad-bundle-draft — PAUSED ad set + creative + ad (finish targeting in Ads Manager)
  if (p === "/api/meta/ad-bundle-draft" && request.method === "POST") {
    const rawAct = (env.META_DEFAULT_AD_ACCOUNT_ID || "").trim();
    if (!rawAct) {
      return new Response(
        JSON.stringify({ success: false, error: "META_DEFAULT_AD_ACCOUNT_ID is not set on the Worker." }),
        { status: 503, headers: j },
      );
    }
    let body: {
      campaignId?: string;
      pageId?: string;
      linkUrl?: string;
      message?: string;
      headline?: string;
      imageHash?: string;
      dailyBudgetCents?: number;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), { status: 400, headers: j });
    }
    const campaignId = (body.campaignId || "").trim();
    const pageId = (body.pageId || "").trim();
    let linkUrl = (body.linkUrl || "").trim();
    const message = (body.message || "").trim();
    const headline = (body.headline || "").trim() || "Ad";
    const imageHash = (body.imageHash || "").trim();
    const dailyBudgetCents = Math.max(100, Math.min(50_000_000, Number(body.dailyBudgetCents) || 500));

    if (!campaignId || !pageId || !linkUrl || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "campaignId, pageId, linkUrl, and message are required.",
        }),
        { status: 400, headers: j },
      );
    }
    try {
      const u = new URL(linkUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad");
    } catch {
      return new Response(JSON.stringify({ success: false, error: "linkUrl must be http(s)." }), { status: 400, headers: j });
    }

    const userTok = await getUserToken(env.DB, payload.sub);
    if (!userTok) {
      return new Response(JSON.stringify({ success: false, error: "Connect Meta first." }), { status: 400, headers: j });
    }

    const actId = rawAct.startsWith("act_") ? rawAct : `act_${rawAct}`;
    const actNumeric = actId.replace(/^act_/, "");
    const adsetName = `HD2D ad set ${new Date().toISOString().slice(0, 10)}`;

    const targeting = {
      geo_locations: { countries: ["US"] },
      publisher_platforms: ["facebook", "instagram"],
    };

    const adsetForm: Record<string, string> = {
      name: adsetName,
      campaign_id: campaignId,
      optimization_goal: "LINK_CLICKS",
      billing_event: "IMPRESSIONS",
      daily_budget: String(dailyBudgetCents),
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      status: "PAUSED",
      targeting: JSON.stringify(targeting),
      promoted_object: JSON.stringify({ link: linkUrl }),
      access_token: userTok,
    };

    const adsetR = await graphPostForm(`/${actId}/adsets`, adsetForm);
    if (!adsetR.ok) {
      return new Response(JSON.stringify({ success: false, error: `Ad set: ${adsetR.err}` }), { status: 502, headers: j });
    }
    const adsetId = (adsetR.data as { id?: string }).id;
    if (!adsetId) {
      return new Response(JSON.stringify({ success: false, error: "Ad set created but no id returned." }), {
        status: 502,
        headers: j,
      });
    }

    const linkData: Record<string, string> = {
      link: linkUrl,
      message,
      name: headline,
    };
    if (imageHash) linkData.image_hash = imageHash;

    const storySpec = JSON.stringify({
      page_id: pageId,
      link_data: linkData,
    });

    const creativeName = `HD2D creative ${Date.now()}`;
    const creativeR = await graphPostForm(`/${actId}/adcreatives`, {
      name: creativeName,
      object_story_spec: storySpec,
      access_token: userTok,
    });
    if (!creativeR.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Creative: ${creativeR.err}`,
          data: { adsetId, partial: true },
        }),
        { status: 502, headers: j },
      );
    }
    const creativeId = (creativeR.data as { id?: string }).id;
    if (!creativeId) {
      return new Response(JSON.stringify({ success: false, error: "Creative missing id.", data: { adsetId } }), {
        status: 502,
        headers: j,
      });
    }

    const adR = await graphPostForm(`/${actId}/ads`, {
      name: `HD2D ad ${Date.now()}`,
      adset_id: adsetId,
      creative: JSON.stringify({ creative_id: creativeId }),
      status: "PAUSED",
      access_token: userTok,
    });
    if (!adR.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Ad: ${adR.err}`,
          data: { adsetId, creativeId, partial: true },
        }),
        { status: 502, headers: j },
      );
    }
    const adId = (adR.data as { id?: string }).id ?? null;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          adsetId,
          creativeId,
          adId,
          adsManagerUrl: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${actNumeric}`,
        },
      }),
      { headers: j },
    );
  }

  return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404, headers: j });
}

/** Cron: retry pending posts whose Graph create failed */
export async function processMetaScheduledRetries(env: MetaMarketingEnv): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  let rows: { id: string; user_id: string; page_id: string; message: string; link_url: string | null; scheduled_unix: number }[] =
    [];
  try {
    const r = await env.DB.prepare(
      `SELECT id, user_id, page_id, message, link_url, scheduled_unix FROM meta_scheduled_posts
       WHERE status = 'pending' AND scheduled_unix > ?`,
    )
      .bind(now)
      .all();
    rows = (r?.results ?? []) as typeof rows;
  } catch (e) {
    console.warn("[meta cron] skip (migrations?)", e);
    return;
  }

  for (const row of rows.slice(0, 25)) {
    const userTok = await getUserToken(env.DB, row.user_id);
    if (!userTok) continue;
    const pages = await fetchPageAccounts(userTok);
    const pageTok = pageTokenForId(pages, row.page_id);
    if (!pageTok) {
      await env.DB.prepare("UPDATE meta_scheduled_posts SET last_error = ? WHERE id = ?")
        .bind("No page token", row.id)
        .run();
      continue;
    }
    const form: Record<string, string> = {
      message: row.message,
      published: "false",
      scheduled_publish_time: String(row.scheduled_unix),
      access_token: pageTok,
    };
    if (row.link_url) form.link = row.link_url;
    const post = await graphPostForm(`/${row.page_id}/feed`, form);
    if (post.ok) {
      const pdata = post.data as { id?: string };
      const metaPostId = typeof pdata.id === "string" ? pdata.id : null;
      await env.DB.prepare(
        "UPDATE meta_scheduled_posts SET status = 'scheduled', meta_post_id = ?, last_error = NULL WHERE id = ?",
      )
        .bind(metaPostId, row.id)
        .run();
    } else {
      await env.DB.prepare("UPDATE meta_scheduled_posts SET last_error = ? WHERE id = ?")
        .bind(post.err.slice(0, 500), row.id)
        .run();
    }
  }
}
