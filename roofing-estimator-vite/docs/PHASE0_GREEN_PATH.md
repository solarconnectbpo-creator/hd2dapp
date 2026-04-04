# Phase 0 — Green path checklist

Use this to verify **dev** and **production** are wired correctly before feature work. Check boxes when verified.

**CI:** On push/PR, GitHub Actions runs `npm run test` + `npm run build` in `roofing-estimator-vite/` and `npm run build` in `backend/` (see `.github/workflows/ci.yml`).

## 1. Repository layout

- **Frontend:** `roofing-estimator-vite/` — Vite + React (`npm run dev`, `npm run build`).
- **Backend:** `backend/` — Cloudflare Worker (`npm run dev` on port **8787** by default).
- **ML roof vision (optional):** `backend/ml-vision-service/` — FastAPI + SAM; deployed separately (e.g. Fly.io); Worker proxies via secrets.

## 2. Environment variables

### Frontend (`roofing-estimator-vite/.env` or hosting dashboard)

| Variable | Purpose |
|----------|---------|
| `VITE_INTEL_API_BASE` | Full origin of the HD2D Worker (e.g. `https://hd2d-backend.<account>.workers.dev`). **Leave unset** if the SPA and `/api/*` are on the **same origin** (recommended for production). |
| `VITE_EAGLEVIEW_API_BASE` | Optional override for EagleView API Center proxy (default: intel base + `/api/eagleview/apicenter`). |
| `VITE_EAGLEVIEW_ACCESS_TOKEN` | Optional direct Bearer (not recommended for production). |
| `VITE_GOOGLE_MAPS_API_KEY` | Map/satellite provider where used. |

**Local dev:** Vite often proxies to the Worker via `vite.config` (`/intel-proxy` → `http://127.0.0.1:8787`). Run **both** `backend` and `roofing-estimator-vite` (or `npm run dev:full` from `roofing-estimator-vite` if configured).

### Worker (`backend/.dev.vars` locally, **secrets** in production)

| Secret / var | Purpose |
|--------------|---------|
| `OPENAI_API_KEY` | AI routes that call OpenAI. |
| `SESSION_SECRET` | Auth sessions. |
| `EAGLEVIEW_CLIENT_ID` / `EAGLEVIEW_CLIENT_SECRET` | EagleView OAuth (see `wrangler.toml` comments). |
| `ROOF_VISION_SERVICE_URL` | Public **HTTPS** base of `ml-vision-service` (no trailing slash). |
| `ROOF_VISION_SERVICE_SECRET` | Optional; must match Python `SERVICE_SECRET` if set. |
| `BATCHDATA_*` | If using BatchData via Worker proxy. |

See [backend/wrangler.toml](../../backend/wrangler.toml) for full comments.

## 3. One full user flow (smoke test)

1. **Auth:** Open the app → **Login** (or Sign up if enabled). Confirm redirect to Dashboard.
2. **API reachability:** Open **New Measurement** → trigger any action that calls the Worker (e.g. **Refresh Parcel/Permit/Storm Intel** with valid lat/lng, or **AI roof pitch** with a photo if configured).
3. **Roof segment (SAM):** On the map, use **Auto Trace** / roof segment — if `ROOF_VISION_SERVICE_URL` is missing, you should see a clear error (HTTP 503) explaining deployment, not a silent failure.
4. **EagleView (optional):** If keys are set, load a report ID or TrueDesign flow per in-app instructions.

## 4. D1 migrations (auth)

From `backend/`:

- Local: `npm run d1:migrate:local`
- Production: `npm run d1:migrate:remote` (after `wrangler login`)

## 5. Deploy order (typical)

1. Deploy or configure **ml-vision-service** and set Worker secrets `ROOF_VISION_*`.
2. Deploy **Worker** (`npm run deploy` in `backend/`).
3. Build and deploy **Pages** SPA (`npm run pages:deploy` in `roofing-estimator-vite/` or your pipeline) with correct `VITE_*` if needed.

### Fly.io — SAM (`Dockerfile.sam`) + Worker `ROOF_VISION_SERVICE_URL`

1. **Fly CLI:** install and sign in (`fly auth login`). On Windows, ensure `%USERPROFILE%\.fly\bin` is on `PATH` or use the full path to `fly.exe`.
2. From **`backend/`** (PowerShell):
   - Optional shared secret (recommended): same value on Fly and the Worker, e.g. `$env:FLY_SERVICE_SECRET = "<long-random-string>"` (omit if you do not use `SERVICE_SECRET` on the vision service).
   - Deploy: `npm run deploy:vision:fly` (runs `scripts/fly-deploy-vision.ps1`, builds `ml-vision-service` with the baked-in SAM checkpoint).
   - **Set Worker secrets in one step:** `npm run deploy:vision:fly:worker` (same as `FLY_AUTO_WORKER_SECRETS=1` + `deploy:vision:fly`) — after a successful deploy, runs `set-roof-vision-worker-secrets.ps1` so **`ROOF_VISION_SERVICE_URL`** (and **`ROOF_VISION_SERVICE_SECRET`** if `FLY_SERVICE_SECRET` was set) are written to the **top-level** Worker (requires `wrangler login`).
3. App URL is **`https://<app>.fly.dev`** where `<app>` is `app` in `backend/ml-vision-service/fly.toml` (default `hd2d-roof-vision`).
4. Deploy the **Worker** again if you only set secrets locally before: `npm run deploy` in `backend/`.
5. Verify: `curl https://<app>.fly.dev/health` and `GET https://<your-worker>/api/health` → `capabilities.roofVisionProxy: true` when the URL secret is set.

## 6. When something fails

- **503** on `/api/ai/roof-segment` or `/api/ai/roof-vision`: Worker error body usually names missing `ROOF_VISION_SERVICE_URL` — deploy `ml-vision-service` and set secrets.
- **401** on EagleView: OAuth client and secrets must match EagleView developer settings.
- **CORS / network**: Confirm `VITE_INTEL_API_BASE` matches where the browser can reach the Worker.
