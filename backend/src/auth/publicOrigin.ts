/** Env slice used to build absolute links (password reset, Stripe return URLs, etc.). */
export type PublicOriginEnv = {
  APP_PUBLIC_ORIGIN?: string;
  /** Comma-separated browser origins; first `https://` entry used as fallback when `APP_PUBLIC_ORIGIN` is unset. */
  CORS_ALLOWED_ORIGINS?: string;
};

/**
 * Public SPA base URL with no trailing slash — for links in outbound email.
 * Prefers `APP_PUBLIC_ORIGIN`; otherwise first URL-like entry in `CORS_ALLOWED_ORIGINS`.
 */
export function resolvePublicAppOrigin(env: PublicOriginEnv): string {
  const direct = (env.APP_PUBLIC_ORIGIN || "").trim().replace(/\/+$/, "");
  if (direct) return direct;
  const cors = (env.CORS_ALLOWED_ORIGINS || "").trim();
  if (!cors || cors === "*") return "";
  for (const part of cors.split(",")) {
    const u = part.trim().replace(/\/+$/, "");
    if (u.startsWith("https://") || u.startsWith("http://")) return u;
  }
  return "";
}
