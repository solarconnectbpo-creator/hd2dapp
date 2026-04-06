/** Proxies `GET/POST /api` (exact). See `[[catchall]].ts`. */
import { type PagesProxyEnv, proxyToWorker } from "../lib/workerUpstream";

type PagesCtx = { request: Request; env: PagesProxyEnv };

export async function onRequest(context: PagesCtx): Promise<Response> {
  return proxyToWorker(context.request, context.env);
}
