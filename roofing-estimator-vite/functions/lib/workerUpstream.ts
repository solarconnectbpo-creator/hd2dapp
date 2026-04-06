/**
 * Server-side only: HD2D Worker URL for Pages `/api/*` proxy.
 * Keep in sync with `HD2D_WORKER_API_ORIGIN` in `src/config/siteOrigin.ts`.
 *
 * Optional Pages env (Settings → Environment variables) if Zero Trust blocks this host without a browser:
 *   HD2D_ACCESS_CLIENT_ID / HD2D_ACCESS_CLIENT_SECRET — Cloudflare Access service token headers.
 */
export const HD2D_WORKER_UPSTREAM = "https://hd2d-backend.solarconnectbpo.workers.dev";

export type PagesProxyEnv = {
  HD2D_ACCESS_CLIENT_ID?: string;
  HD2D_ACCESS_CLIENT_SECRET?: string;
};

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

export async function proxyToWorker(request: Request, env: PagesProxyEnv): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, HD2D_WORKER_UPSTREAM);
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP) {
    headers.delete(name);
  }
  const id = env.HD2D_ACCESS_CLIENT_ID?.trim();
  const secret = env.HD2D_ACCESS_CLIENT_SECRET?.trim();
  if (id && secret) {
    headers.set("CF-Access-Client-Id", id);
    headers.set("CF-Access-Client-Secret", secret);
  }
  const method = request.method;
  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = await request.arrayBuffer();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      return new Response(
        JSON.stringify({ success: false, error: "Could not read request body", detail }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
      );
    }
  }
  try {
    return await fetch(target.toString(), {
      method,
      headers,
      body: body !== undefined && body.byteLength > 0 ? body : undefined,
      redirect: "follow",
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ success: false, error: "API upstream unreachable", detail }),
      {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      },
    );
  }
}
