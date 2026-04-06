/**
 * Vercel Edge: proxy same-origin `/api/*` to the HD2D Worker.
 *
 * - **Default:** `*.workers.dev` — if Cloudflare Access protects it, set HD2D_ACCESS_CLIENT_ID / SECRET
 *   (Service Auth policy) or use HD2D_WORKER_UPSTREAM below.
 * - **Bypass Access:** set `HD2D_WORKER_UPSTREAM=https://api.hardcoredoortodoorclosers.com` (Worker route on
 *   your zone — see backend/wrangler.toml). No Access app should cover that hostname; middleware skips
 *   service-token headers for non-`workers.dev` hosts.
 *
 * @see https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/
 */
const DEFAULT_UPSTREAM = "https://hd2d-backend.solarconnectbpo.workers.dev";

function upstreamBase(): string {
  const raw = process.env["HD2D_WORKER_UPSTREAM"]?.trim();
  const base = (raw || DEFAULT_UPSTREAM).replace(/\/$/, "");
  try {
    const u = new URL(base);
    if (u.protocol !== "https:") return DEFAULT_UPSTREAM;
    return base;
  } catch {
    return DEFAULT_UPSTREAM;
  }
}

/** Access service tokens only apply to the default workers.dev host in our setup. */
function needsCfAccessServiceAuth(base: string): boolean {
  try {
    return new URL(base).hostname.endsWith(".workers.dev");
  } catch {
    return true;
  }
}

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "content-length",
  "cf-connecting-ip",
  "cf-ray",
  "cf-visitor",
  "cf-ipcountry",
  "cf-worker",
]);

export const config = {
  matcher: ["/api", "/api/:path*"],
};

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const base = upstreamBase();
  const target = new URL(url.pathname + url.search, `${base}/`);
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) {
    headers.delete(name);
  }
  // Bracket keys so the Vercel Edge bundler does not replace these with `undefined` at build time.
  const id = process.env["HD2D_ACCESS_CLIENT_ID"]?.trim();
  const secret = process.env["HD2D_ACCESS_CLIENT_SECRET"]?.trim();
  if (needsCfAccessServiceAuth(base)) {
    if (!id || !secret) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Vercel Edge middleware did not receive HD2D_ACCESS_CLIENT_ID / HD2D_ACCESS_CLIENT_SECRET. Confirm they exist for Production and redeploy.",
          debug: { hasClientId: Boolean(id), hasClientSecret: Boolean(secret) },
        }),
        { status: 503, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
      );
    }
    headers.set("CF-Access-Client-Id", id);
    headers.set("CF-Access-Client-Secret", secret);
  }

  const method = request.method;
  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      const buf = await request.arrayBuffer();
      body = buf.byteLength > 0 ? buf : undefined;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Could not read request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  try {
    const res = await fetch(target.toString(), {
      method,
      headers,
      body,
      redirect: "follow",
    });
    if (res.url.includes("cloudflareaccess.com")) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Cloudflare Access rejected the service token. Fix in Zero Trust → Access → Applications → the app for hd2d-backend.solarconnectbpo.workers.dev: add a policy whose Action is Service Auth (not Allow). Under Include use selector Service Token (pick this token) or Any Access Service Token. Vercel must use the same Client ID + Secret from Access controls → Service credentials → Service Tokens.",
          doc: "https://developers.cloudflare.com/cloudflare-one/access-controls/policies/#service-auth",
        }),
        { status: 503, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
      );
    }
    return res;
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: "API upstream unreachable", detail }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
