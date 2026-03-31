# hd2dapp

Expo (React Native + web) for CRM, roof reports, and damage estimates.

## Estimates & measurements (what to build)

1. **Map trace (app)** — Geodesic **plan** footprint area / perimeter (`src/roofReports/roofPolygonMetrics.ts`, `RoofTraceMap.web.tsx`). Use this as the primary **sq ft** input for `computeRoofDamageEstimate` in `src/roofReports/roofEstimate.ts`.
2. **PyTorch / Detectron2 (Python)** — Train roof masks in **`roof-detectron/`**, convert pixel areas to ft² with **`roof_measurement_summary(..., sqft_per_px_sq=...)`** in `roof-detectron/utils.py` (calibrate from ortho GSD or a known reference).
3. **Vision API (`backend/ml-vision-service`)** — Run **`VISION_PROVIDER=detectron2`** with `DETECTRON2_WEIGHTS_PATH`. Set **`DETECTRON2_SQFT_PER_PX_SQ`** (ft² per pixel²) so responses include **`segmentation.estimatedRoofAreaSqFt`** for notes and cross-checks against the trace. Install stack: **`roof-detectron/install-detectron2.ps1`** or **`backend/ml-vision-service/install-detectron2.ps1`** (PyTorch + Detectron2; Windows needs MSVC — see those READMEs).
4. **Fusion** — `src/roofReports/ai/measurementFusion.ts` combines multiple area/pitch sources when you wire them in.
5. **Dollar range** — Still **indicative**; tune rates in `roofEstimate*` modules to match your market or Xactimate.

`call-ai-system/` is **gitignored** (not part of this app).

## Development

```bash
npm install
npm start
npm run web
```

Copy `.env.example` to `.env` / `.env.local` for Mapbox, Supabase, etc.

## Deployment

- **App Store / Play Store (EAS)** — [docs/APP_STORE_DEPLOYMENT.md](docs/APP_STORE_DEPLOYMENT.md) (Supabase env, `eas build`, submit).
- **Supabase schema** — [supabase/README.md](supabase/README.md).
