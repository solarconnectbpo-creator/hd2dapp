import { HD2D_PRODUCTION_WWW_ORIGIN } from "./config/siteOrigin";

const canonicalWwwOrigin = HD2D_PRODUCTION_WWW_ORIGIN.replace(/\/$/, "");

/**
 * Production Vercel builds only: send visitors on *.vercel.app to the live custom domain.
 * Use **www** (production alias) — not apex — so we do not fight Vercel’s apex → www redirect.
 * Preview deployments (VERCEL_ENV=preview) are not redirected.
 */
if (typeof window !== "undefined" && import.meta.env.PROD && import.meta.env.VERCEL_ENV === "production") {
  const host = window.location.hostname;
  if (host.endsWith(".vercel.app")) {
    const path = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(`${canonicalWwwOrigin}${path}`);
  }
}

/**
 * No client-side www ↔ apex redirects: a full-host redirect that included `/assets/*` caused
 * www → apex → www loops and failed ES module loads (black screen).
 */
