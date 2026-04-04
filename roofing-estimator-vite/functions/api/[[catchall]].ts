/**
 * Proxies same-origin `/api/*` on the Pages hostname to the HD2D Worker.
 * Without this, Pages SPA routing serves `index.html` for `/api/*`, so the zone Worker route never wins.
 *
 * Keep in sync with `src/config/siteOrigin.ts` HD2D_WORKER_API_ORIGIN.
 */
const HD2D_WORKER_API_ORIGIN = "https://hd2d-backend.solarconnectbpo.workers.dev";

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, HD2D_WORKER_API_ORIGIN);
  return fetch(target.toString(), request);
}
