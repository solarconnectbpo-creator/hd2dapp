import { HD2D_PRODUCTION_ORIGIN, HD2D_SITE_ROOT } from "./config/siteOrigin";

const canonicalOrigin = HD2D_PRODUCTION_ORIGIN.replace(/\/$/, "");

/**
 * Production Vercel builds only: send visitors on *.vercel.app (including per-deployment URLs)
 * to the canonical domain so the app “lives” on https://hardcoredoortodoorclosers.com .
 * Preview deployments (VERCEL_ENV=preview) are not redirected.
 */
if (typeof window !== "undefined" && import.meta.env.PROD && import.meta.env.VERCEL_ENV === "production") {
  const host = window.location.hostname;
  if (host.endsWith(".vercel.app")) {
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`${canonicalOrigin}${path}`);
  }
}

/**
 * Cloudflare Pages (and any non-Vercel prod build): use apex as canonical so www and apex show the same app
 * and deep links stay consistent with HD2D_PRODUCTION_ORIGIN.
 */
if (typeof window !== "undefined" && import.meta.env.PROD && !import.meta.env.VERCEL) {
  const host = window.location.hostname.toLowerCase();
  if (host === `www.${HD2D_SITE_ROOT}`) {
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`${canonicalOrigin}${path}`);
  }
}
