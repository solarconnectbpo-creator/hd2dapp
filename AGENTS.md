# HD2D monorepo — agent / operator notes

## Layout

| Path | Role |
|------|------|
| `roofing-estimator-vite/` | React + Vite SPA (Vercel and/or Cloudflare Pages) |
| `backend/` | Cloudflare Worker API (`wrangler`), D1, KV |
| `backend/ml-vision-service/` | Optional Python vision service (Fly, etc.) |

## Deploy (typical)

- **Worker:** from `backend/`: `npm run deploy` (see `wrangler.toml`, custom routes for `/api/*` on apex).
- **SPA (Vercel):** from `roofing-estimator-vite/`: `npm run vercel:deploy` or connect Git → Vercel.
- **SPA (Cloudflare Pages):** `npm run pages:deploy` from `roofing-estimator-vite/` (see repo scripts).

Production site: `https://hardcoredoortodoorclosers.com` (SPA) with API on same host `/api/*` or Worker URL via `VITE_INTEL_API_BASE`.

## Secrets / env (Worker)

Set via `wrangler secret put …` or `backend/.dev.vars` for local dev. Important examples:

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

See `roofing-estimator-vite/docs/perf-baseline.md` — run Lighthouse on `/login` and map routes after releases.

## CI

GitHub Actions: `.github/workflows/ci.yml` — Vite `test` + `build`, Worker `wrangler build`.
