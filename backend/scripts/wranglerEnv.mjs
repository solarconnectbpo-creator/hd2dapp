/**
 * Real Cloudflare API tokens are long (~40+ chars). A short placeholder in
 * CLOUDFLARE_API_TOKEN breaks Wrangler (invalid Authorization header); unsetting
 * lets `wrangler login` OAuth work.
 */
const MIN_TOKEN_LEN = 40;

export function sanitizeEnvForWrangler(env) {
  const out = { ...env };
  const t = out.CLOUDFLARE_API_TOKEN;
  if (t != null && String(t).trim().length > 0 && String(t).trim().length < MIN_TOKEN_LEN) {
    delete out.CLOUDFLARE_API_TOKEN;
  }
  return out;
}
