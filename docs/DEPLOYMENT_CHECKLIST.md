# HD2D web deployment checklist

Use this after merging to `main` for **roofing-estimator-vite** (Vercel) and **backend** (Cloudflare Worker). The SPA and the API deploy on **different** paths.

## 1. Frontend (Vercel)

**Trigger:** Push to `main` that touches `roofing-estimator-vite/**` runs [.github/workflows/vercel-deploy.yml](../.github/workflows/vercel-deploy.yml).

**Repo secrets (GitHub → Settings → Secrets and variables → Actions):**

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

**Verify:**

1. GitHub Actions → workflow **Deploy Vercel** → latest run **green**.
2. Vercel dashboard → project → **Production** deployment matches the commit.
3. Open production URL (e.g. `https://hardcoredoortodoorclosers.com`) — hard refresh or purge CDN if HTML is stale.

**SPA env:** Build-time vars live in Vercel project settings (e.g. `VITE_INTEL_API_BASE` pointing at your Worker origin). Missing vars break API calls from the browser.

---

## 2. Backend (Cloudflare Worker)

**Not** deployed by the Vercel workflow. Deploy when API routes, auth, D1 schema, or secrets change.

**Option A — GitHub Actions:** Run workflow **Deploy Cloudflare Worker (backend)** manually ([.github/workflows/cloudflare-worker-deploy.yml](../.github/workflows/cloudflare-worker-deploy.yml)).

**Option B — CLI:** From `backend/`:

```bash
npm ci && npm run build && npm run deploy
```

Needs `CLOUDFLARE_API_TOKEN` (Workers + D1) and correct account in `wrangler.toml`.

---

## 3. D1 migrations

When new files appear under `backend/migrations/`, apply them to the **remote** database before or immediately after deploying the Worker (so code and schema match).

```bash
cd backend
npx wrangler d1 migrations apply <DATABASE_NAME> --remote
```

Use the D1 database name from `wrangler.toml` (or your environment). Confirm in Cloudflare dashboard → D1 → **Migrations**.

---

## 4. Worker secrets & vars (high level)

Set in Cloudflare (or via `wrangler secret put` / dashboard). Examples—see [backend/.dev.vars.example](../backend/.dev.vars.example) for the full list:

- **Auth / session:** `SESSION_SECRET`, D1 users
- **Marketing / Meta:** `META_APP_ID`, `META_APP_SECRET`, `APP_PUBLIC_ORIGIN`, optional `META_DEFAULT_AD_ACCOUNT_ID`
- **Marketing images:** `OPENAI_API_KEY` (for `POST /api/marketing/generate-image`)
- **Optional:** GHL, DealMachine, EagleView, vision service URLs, etc.

Redeploy the Worker after changing secrets if the runtime must pick them up (Wrangler usually injects at deploy; confirm in dashboard).

---

## 5. Smoke tests (production)

| Area | Check |
|------|--------|
| **Auth** | Login / sign-up / session |
| **Canvassing** | Map loads; property sheet; **Storm damage report** creates a field job and opens **Projects** |
| **Projects** | Field jobs list; **Take photo** / CRM links if used |
| **Marketing** | Social / Ad maker need Worker + Meta + `OPENAI_API_KEY` where applicable |
| **Call center** | Page loads; any dialer/API features you rely on |
| **Estimator / chat** | If using estimator chat AI, Worker route + `OPENAI_API_KEY` |

---

## 6. Rollback

- **Vercel:** Promote a previous **Production** deployment in the Vercel UI.
- **Worker:** Redeploy a known-good revision from Cloudflare Workers dashboard or revert the commit and redeploy.

---

## Related

- Mobile app store flow (Expo): [APP_STORE_DEPLOYMENT.md](./APP_STORE_DEPLOYMENT.md) — separate from this web stack.
