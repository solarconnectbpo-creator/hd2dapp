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
| **ArcGIS overlay** (parcels / zoning on **Canvassing**) | Optional: set Feature layer URL + token under **Contacts & settings**, or `VITE_ARCGIS_FEATURE_LAYER_URL` / `VITE_ARCGIS_API_KEY` in `.env`. Layer must be `…/FeatureServer/{id}` (public services work without a key). |
| STL / MO parcel intel (`/intel-proxy`) | HD2D Worker: from repo `backend`, run `npm run dev` (Wrangler on **http://127.0.0.1:8787**). Optional: `VITE_INTEL_API_BASE` for a deployed Worker URL |
| BatchData property records | BatchData API key in the Property Scraper UI. **Dev/preview:** Vite proxy `/batchdata-api`. **Production build:** requests go to the HD2D Worker at `getHd2dApiBase()` → `POST /api/batchdata/property-search` (run Wrangler locally or set `VITE_INTEL_API_BASE` to your deployed Worker) |
| Property Scraper offline | If `VITE_PROPERTY_SCRAPER_OFFLINE=true`, live enrichment is disabled |

Proxies are configured in `vite.config.ts` for **dev** and **preview** (`/intel-proxy`, `/batchdata-api`, `/google-places-api`, `/pdl-api`).

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
