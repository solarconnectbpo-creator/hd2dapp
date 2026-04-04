/** Proxies `GET/POST /api` (exact) to the HD2D Worker. See `[[catchall]].ts` for `/api/*`. */
const HD2D_WORKER_API_ORIGIN = "https://hd2d-backend.solarconnectbpo.workers.dev";

export async function onRequest(context: { request: Request }): Promise<Response> {
  const url = new URL(context.request.url);
  const target = new URL(url.pathname + url.search, HD2D_WORKER_API_ORIGIN);
  return fetch(target.toString(), context.request);
}
