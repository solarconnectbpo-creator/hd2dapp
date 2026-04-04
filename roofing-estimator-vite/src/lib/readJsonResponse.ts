import { HD2D_PRODUCTION_ORIGIN, HD2D_WORKER_API_ORIGIN } from "../config/siteOrigin";

/**
 * Parse JSON from any `fetch` response (Nominatim, localhost, etc.).
 * Prefer over `res.json()` — the native API throws "Unexpected end of JSON input" on empty bodies.
 */
export async function parseJsonResponse<T>(res: Response, context = "Request"): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(`${context}: empty response (${res.status}).`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${context}: not JSON (${res.status}).`);
  }
}

/** Parse Worker JSON; avoids `res.json()` throwing on empty/HTML SPA fallbacks. */
export async function readJsonResponseBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error(
      `Empty response (${res.status} ${res.statusText || ""}). On ${HD2D_PRODUCTION_ORIGIN} the app should call same-origin /api/* (Pages proxy). On preview hosts set VITE_INTEL_API_BASE=${HD2D_WORKER_API_ORIGIN} if /api/* returns HTML.`,
    );
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const hint = trimmed.startsWith("<") ? " (received HTML, not JSON)" : "";
    throw new Error(
      `Invalid JSON from server (${res.status})${hint}. Expected JSON from /api/* — on ${HD2D_PRODUCTION_ORIGIN} confirm Pages Functions include /api; on preview use VITE_INTEL_API_BASE=${HD2D_WORKER_API_ORIGIN}.`,
    );
  }
}
