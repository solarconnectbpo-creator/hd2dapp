/**
 * Vercel Edge: proxy same-origin `/api/*` to the HD2D Worker. Required when Cloudflare Zero Trust
 * protects `*.workers.dev` — set HD2D_ACCESS_CLIENT_ID / HD2D_ACCESS_CLIENT_SECRET (service token).
 * @see https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/
 */
const UPSTREAM = "https://hd2d-backend.solarconnectbpo.workers.dev";

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
  const target = new URL(url.pathname + url.search, UPSTREAM);
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) {
    headers.delete(name);
  }
  // Bracket keys so the Vercel Edge bundler does not replace these with `undefined` at build time.
  const id = process.env["HD2D_ACCESS_CLIENT_ID"]?.trim();
  const secret = process.env["HD2D_ACCESS_CLIENT_SECRET"]?.trim();
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
            "Cloudflare Access still redirected this request (token or policy). In Zero Trust → Access → your Application for hd2d-backend…workers.dev, add a Service Auth policy that includes this service token.",
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
