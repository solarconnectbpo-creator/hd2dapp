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
 * www → apex in **all** production builds (including Vercel). Previously this was gated with `!VERCEL`, so
 * visitors on `www.hardcoredoortodoorclosers.com` served by Vercel never redirected and could load an older
 * deployment than apex / Cloudflare Pages — e.g. missing sidebar items.
 */
if (typeof window !== "undefined" && import.meta.env.PROD) {
  const host = window.location.hostname.toLowerCase();
  if (host === `www.${HD2D_SITE_ROOT}`) {
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`${canonicalOrigin}${path}`);
  }
}
