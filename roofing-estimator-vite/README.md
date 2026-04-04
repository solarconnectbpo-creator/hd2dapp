# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## Local development services

Run the Vite app from this directory (`npm run dev` or `npm run preview`). Some features need extra processes or env vars:

| Feature | Requirement |
|--------|-------------|
| Mapbox (measurement map, **Canvassing**) | `VITE_MAPBOX_TOKEN` in `.env`, or paste a public `pk.…` token once (stored in `localStorage`) |
| **ArcGIS overlay** (parcels / zoning on **Canvassing**) | Optional: set Feature layer URL + token under **Contacts & settings**, or `VITE_ARCGIS_FEATURE_LAYER_URL` / `VITE_ARCGIS_API_KEY` in `.env`. Layer must be `…/FeatureServer/{id}` (public services work without a key). The app also queries the same layer with a **point-in-parcel** REST request so attributes can load when you click off the rendered polygon. If `fetch` fails with CORS on localhost, try a `services.arcgis.com` layer or a same-origin proxy. |
| STL / MO parcel intel (`/intel-proxy`) | HD2D Worker: from repo `backend`, run `npm run dev` (Wrangler on **http://127.0.0.1:8787**). Optional: `VITE_INTEL_API_BASE` for a deployed Worker URL |
| BatchData property records | BatchData API key in the Property Scraper UI. **Dev/preview:** Vite proxy `/batchdata-api`. **Production build:** requests go to the HD2D Worker at `getHd2dApiBase()` → `POST /api/batchdata/property-search` (run Wrangler locally or set `VITE_INTEL_API_BASE` to your deployed Worker) |
| Property Scraper offline | If `VITE_PROPERTY_SCRAPER_OFFLINE=true`, live enrichment is disabled |

Proxies are configured in `vite.config.ts` for **dev** and **preview** (`/intel-proxy`, `/batchdata-api`, `/google-places-api`, `/pdl-api`).

## Custom domain setup (`hardcoredoortodoorclosers.com`)

Recommended production topology:

- Frontend SPA: `https://hardcoredoortodoorclosers.com`
- Backend Worker API: same-origin `https://hardcoredoortodoorclosers.com/api/*` (or `https://api.hardcoredoortodoorclosers.com`)

### Cloudflare Pages (apex SPA — `npm run pages:deploy`)

The Worker ([`backend/wrangler.toml`](../backend/wrangler.toml)) routes **`/api/*`** to **hd2d-backend**; the **HTML/JS** for `/` and static assets are served by **Cloudflare Pages** project **`hd2d-closers`**.

**Deploy the latest SPA:**

```bash
cd roofing-estimator-vite && npm run pages:deploy
```

**Verify:**

- Open `https://main.hd2d-closers.pages.dev` — the `<title>` should be **HD2D Closers — Roofing Pro** (matches current [`index.html`](index.html)).
- If the **apex** `https://hardcoredoortodoorclosers.com` still shows an **old** `<title>` (e.g. “Roofing Pro — measurements & estimates”) or a broken logo while `main.hd2d-closers.pages.dev` is correct, the **custom domain is not attached to this Pages project**. In **Cloudflare Dashboard → Workers & Pages → hd2d-closers → Custom domains**, add **`hardcoredoortodoorclosers.com`** (and remove it from any **other** Pages project or conflicting host). Then **Caching → Configuration → Purge Everything** (or purge HTML for `/`).

**Only one** host stack should own the apex (Cloudflare Pages **or** Vercel). If both try to use the same hostname, DNS/SSL will conflict.

**Attach the domain in the Cloudflare Dashboard (no CLI):**

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com/) and select account **`2b2f31d4f2fd46db5be5d72e772ecac5`** (or your team account that owns the zone `hardcoredoortodoorclosers.com`).
2. Go to **Workers & Pages** → select project **`hd2d-closers`** (the one you deploy with `npm run pages:deploy`).
3. Open the **Custom domains** tab → **Set up a custom domain** (or **Add**).
4. Enter **`hardcoredoortodoorclosers.com`** and complete DNS/SSL prompts (apex should use the records Cloudflare suggests; zone must be on Cloudflare).
5. If **`www.hardcoredoortodoorclosers.com`** should also open this app, add it here too (your [`vercel.json`](vercel.json) redirects `www` → apex if you prefer a single canonical host).
6. If the same hostname appears under **another** Pages project or **Vercel** → **remove** it there so only **`hd2d-closers`** owns it.
7. **Caching** → **Configuration** → **Purge Everything** for the zone if the browser still shows an old `<title>`.

**CLI (optional):** with a valid **`CLOUDFLARE_API_TOKEN`** (40+ chars, **Account → Cloudflare Pages → Edit**), run `npm run pages:add-domain` from this directory.

### Same-origin `/api/*` routing (recommended)

1. Deploy frontend to your domain root.
2. In `backend/wrangler.toml`, enable the `routes` entry for:
   - `hardcoredoortodoorclosers.com/api/*`
3. Deploy worker: `cd backend && npm run deploy`
4. Set Worker secrets for EagleView and auth:
   - `EAGLEVIEW_EMBEDDED_CLIENT_ID`
   - `EAGLEVIEW_EMBEDDED_CLIENT_SECRET`
   - optionally `EAGLEVIEW_EMBEDDED_TOKEN_URL`, `EAGLEVIEW_EMBEDDED_SCOPE`
   - `SESSION_SECRET`
5. Validate endpoint:
   - `https://hardcoredoortodoorclosers.com/api/eagleview/embedded/token`

### `VITE_INTEL_API_BASE`

- If your API is same-origin (`/api/*` route on same domain), `VITE_INTEL_API_BASE` is optional.
- If your API is on subdomain, set:
  - `VITE_INTEL_API_BASE=https://api.hardcoredoortodoorclosers.com`

### Vercel — point **hardcoredoortodoorclosers.com** at this project

The domain is already added on project **`hd2d-closers`**. If **`https://hardcoredoortodoorclosers.com`** does not load the app but **`https://hd2d-closers.vercel.app`** does, **DNS is still pointing away from Vercel** (common with Cloudflare).

1. In **Cloudflare** → **DNS** for `hardcoredoortodoorclosers.com`, add (or fix) the **apex** record:
   - **Type:** `A`
   - **Name:** `@` (or `hardcoredoortodoorclosers.com`)
   - **IPv4:** `76.76.21.21` (Vercel — run `npx vercel domains inspect hardcoredoortodoorclosers.com` if this ever changes)
   - **Proxy:** **DNS only** (grey cloud) until Vercel shows the domain as verified; then you can experiment with orange cloud if needed.
2. Remove or change any **other** apex `A`/`AAAA`/`CNAME` that pointed the domain at **Cloudflare Pages** or another host, or only one stack can own the apex.
3. Wait for propagation; Vercel → **Project → Settings → Domains** should show the domain as valid.
4. `vercel.json` redirects **`hd2d-closers.vercel.app`** and **`www`** → **`https://hardcoredoortodoorclosers.com`** so the canonical URL is the custom domain.

### Vercel (optional — `app` subdomain)

- **Project:** `hd2d-closers` (team `solarconnectbpo-creators-projects`). Link locally with `npx vercel link` (creates `.vercel/`, gitignored).
- **Deploy:** `npm run vercel:deploy` — production is served on **`https://hardcoredoortodoorclosers.com`** once apex DNS points at Vercel as above. `vercel.json` redirects **`www`** → **apex** (canonical).
- **Recommended hostname (keeps Cloudflare Pages on the apex):** **`https://app.hardcoredoortodoorclosers.com`** — added on the Vercel project. In **Cloudflare DNS** for `hardcoredoortodoorclosers.com`, create:
  - **Type:** `A`
  - **Name:** `app`
  - **IPv4:** `76.76.21.21` (Vercel)
  - **Proxy status:** DNS only (grey cloud) is usually best until Vercel shows the domain as verified; you can try proxying later if needed.
  - Save and wait for DNS + Vercel verification (minutes).
- **Older / optional domains** on the same Vercel project (`hardcoredoortodoorclosers.com`, `www`) conflict with Cloudflare Pages if both claim the same host — remove them under Vercel → **Domains** if you only use **`app`**.
- **Env on Vercel:** `VITE_INTEL_API_BASE=https://hardcoredoortodoorclosers.com` (Production) so the SPA on `app.` calls the Worker API on the main domain.
- **Connect Git in the Vercel UI:** [Project → Settings → Git](https://vercel.com/docs/deployments/git) → connect **solarconnectbpo-creator/hd2dapp**, set **Root Directory** to `roofing-estimator-vite`. The CLI command `vercel git connect` only works after the Vercel GitHub App is installed (browser OAuth).
- **Deploy from GitHub without the Vercel UI link:** workflow **`.github/workflows/vercel-deploy.yml`** runs on pushes to `main` (paths under `roofing-estimator-vite/`). Add these **repository secrets** (GitHub → *Settings* → *Secrets and variables* → *Actions*):
  - **`VERCEL_TOKEN`** — [Create](https://vercel.com/account/tokens) (scope: full account or deploy for this project).
  - **`VERCEL_ORG_ID`** — `team_vSc38xty8O6GCiryXWIrn2u3`
  - **`VERCEL_PROJECT_ID`** — `prj_hE0g5IRagWnQzfsVYaIG6OZ9VQuW`

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
