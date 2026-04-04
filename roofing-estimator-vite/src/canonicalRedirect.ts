import { HD2D_PRODUCTION_ORIGIN } from "./config/siteOrigin";

/**
 * Production Vercel builds only: send visitors on *.vercel.app (including per-deployment URLs)
 * to the canonical domain so the app “lives” on https://hardcoredoortodoorclosers.com .
 * Preview deployments (VERCEL_ENV=preview) are not redirected.
 */
if (typeof window !== "undefined" && import.meta.env.PROD && import.meta.env.VERCEL_ENV === "production") {
  const host = window.location.hostname;
  if (host.endsWith(".vercel.app")) {
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`${HD2D_PRODUCTION_ORIGIN.replace(/\/$/, "")}${path}`);
  }
}
