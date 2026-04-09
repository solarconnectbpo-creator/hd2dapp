# HD2D monorepo - agent / operator notes

## Layout

| Path | Role |
|------|------|
| `roofing-estimator-vite/` | React + Vite SPA - **production on Cloudflare Pages** (`hd2d-closers`; see `wrangler.toml`) |
| `backend/` | Cloudflare Worker API (`wrangler`), D1, KV |
| `backend/ml-vision-service/` | Optional Python vision service (Fly, etc.) |

## Deploy (typical)

**Canonical production:** Cloudflare **Pages** project `hd2d-closers` serves the SPA at `https://hardcoredoortodoorclosers.com`. In DNS, point apex (and optional `www`) only at this Pages project in the Cloudflare dashboard - one canonical host, one provider for HTML.

- **SPA (production):** from `roofing-estimator-vite/`: `npm run pages:deploy` after `npm run build`, or connect the Git repo to Pages (build: `npm run build`, output: `dist`). Same-origin `/api/*` can be handled by `roofing-estimator-vite/functions/api/*` (see `wrangler.toml`).
- **Worker:** from `backend/`: `npm run deploy` (see `backend/wrangler.toml`, custom routes for `/api/*` on apex when not using Pages Functions).
- **Vercel (optional):** `npm run vercel:deploy` or Git -> Vercel for **preview / alternate URLs** only. `vercel.json` redirects `hd2d-closers.vercel.app` -> apex; keep Vercel env vars in sync if you still build there.

Production API: same host `/api/*` (Pages Functions -> Worker) when `VITE_HD2D_SAME_ORIGIN_API=true`, or direct Worker URL via `VITE_INTEL_API_BASE`.

## Secrets / env (Worker)

Set via `wrangler secret put ...` or `backend/.dev.vars` for local dev. Important examples:

- `SESSION_SECRET`, D1 migrations (`migrations/`)
- `DEALMACHINE_API_KEY`, ArcGIS token, EagleView client secrets
- `STRIPE_SECRET_KEY`, `LEADS_STRIPE_PRICE_IDS`, `APP_PUBLIC_ORIGIN` (lead checkout)
- `ROOF_VISION_SERVICE_URL` + `ROOF_VISION_SERVICE_SECRET` (optional)

## Smoke test

```bash
cd backend
WORKER_SMOKE_URL=https://your-worker.workers.dev npm run smoke:health
```

## Performance baseline

See `roofing-estimator-vite/docs/perf-baseline.md` - run Lighthouse on `/login` and map routes after releases.

## CI

GitHub Actions: `.github/workflows/ci.yml` - Vite `test` + `build`, Worker `wrangler build`.

