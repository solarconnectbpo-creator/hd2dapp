import { HD2D_PUBLIC_API_ORIGIN, HD2D_WORKER_API_ORIGIN } from "../config/siteOrigin";

export type SafeApiErrorOptions = {
  /** When true, do not replace messages from HTTP status (use on login/sign-up forms where 401 ≠ “sign in again”). */
  skipStatusHints?: boolean;
};

/**
 * Maps raw API error text + HTTP status to user-safe copy (no Stripe/internal stack leakage).
 */
export function safeUserFacingApiMessage(
  raw: string,
  status?: number,
  options?: SafeApiErrorOptions,
): string {
  const t = (raw || "").trim();
  if (!options?.skipStatusHints) {
    if (status === 401) return "Sign in again to continue.";
    if (status === 403) return "You don’t have permission for this action.";
    if (status === 503) return "This service is temporarily unavailable. Try again shortly.";
    if (status === 502 || status === 504) return "The server had a problem. Try again in a moment.";
  }

  const lower = t.toLowerCase();
  /** Vercel middleware 503 when CF Access blocks the Worker — not a wrong password. */
  if (
    lower.includes("cloudflare access") ||
    lower.includes("cloudflareaccess.com") ||
    (lower.includes("service token") && (lower.includes("vercel") || lower.includes("zero trust"))) ||
    (lower.includes("service auth") && lower.includes("zero trust"))
  ) {
    return "Sign-in can’t reach the server yet: Cloudflare is blocking the API proxy. Your admin needs a Service Auth policy on the Worker app and matching HD2D_ACCESS_* secrets in Vercel—not a wrong password.";
  }
  /** Login/sign-up use skipStatusHints — long bodies used to hit the 200-char trim and showed a useless generic line. */
  if (options?.skipStatusHints && status === 503) {
    return "Sign-in can’t reach the server right now (service unavailable). If this keeps happening, the API proxy or Cloudflare Access setup needs to be fixed.";
  }
  if (
    lower.includes("stripe") ||
    lower.includes("invalid_request") ||
    lower.includes("resource_missing") ||
    lower.includes("no such price") ||
    lower.includes("checkout")
  ) {
    return "Checkout could not be started. Verify your package is set up or try again later.";
  }
  if (t.length > 200) return "Something went wrong. Try again or contact support.";
  return t || "Something went wrong.";
}

/**
 * User-facing message when `fetch` throws (e.g. offline, blocked, or CORS on Cloudflare Access).
 * When the API base already matches the Worker, omit the misleading “set VITE_INTEL_API_BASE” hint.
 */
export function networkFetchFailureHint(apiBase: string, errorMessage: string): string {
  const msg = (errorMessage || "").trim();
  const base = (apiBase || "").trim().replace(/\/$/, "");
  const pub = HD2D_PUBLIC_API_ORIGIN.replace(/\/$/, "");
  const worker = HD2D_WORKER_API_ORIGIN.replace(/\/$/, "");
  const parts: string[] = [`Network error: ${msg}.`];
  if (apiBase?.trim()) {
    parts.push(`API base is ${apiBase.trim()}.`);
  }
  if (base !== pub && base !== worker) {
    parts.push(`Set VITE_INTEL_API_BASE=${HD2D_PUBLIC_API_ORIGIN} for the public API (avoid *.workers.dev if Access is on).`);
  }
  if (msg === "Failed to fetch") {
    parts.push(
      "Check network, DNS, and that Cloudflare Pages /api proxy is deployed; if Zero Trust blocks the Worker host, set HD2D_ACCESS_* service tokens on the Pages project.",
    );
  }
  return parts.join(" ");
}
