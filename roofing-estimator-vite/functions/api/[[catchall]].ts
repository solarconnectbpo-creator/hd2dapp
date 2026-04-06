/**
 * Same-origin `/api/*` → HD2D Worker (`*.workers.dev`). Browser never calls workers.dev (Access/CORS).
 */
import { type PagesProxyEnv, proxyToWorker } from "../lib/workerUpstream";

type PagesCtx = { request: Request; env: PagesProxyEnv };

export async function onRequest(context: PagesCtx): Promise<Response> {
  return proxyToWorker(context.request, context.env);
}
