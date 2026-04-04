/**
 * Proxies same-origin `/api/*` on hardcoredoortodoorclosers.com (and Pages previews) to the HD2D Worker.
 * The browser only talks to `https://hardcoredoortodoorclosers.com/api/*`; workers.dev is server-side here.
 *
 * Keep in sync with `HD2D_WORKER_API_ORIGIN` in `src/config/siteOrigin.ts`.
 */
const HD2D_WORKER_API_ORIGIN = "https://hd2d-backend.solarconnectbpo.workers.dev";

export async function onRequest(context: { request: Request }): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, HD2D_WORKER_API_ORIGIN);
  return fetch(target.toString(), request);
}
