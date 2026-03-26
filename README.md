# hd2dapp

Expo (React Native + web) app for Hardcore Door-to-Door Closers workflows, including roof reports and CRM.

## Measurements & estimates (accuracy)

- **Traced footprint**: Area and perimeter from the map trace use **geodesic** math on WGS84 (`@turf/turf`): horizontal **plan** area in sq ft, not sloped roof surface.
- **Pitch**: Enter as `6/12`, `6:12`, `6`, or `26.5°`. Edge lineals in diagrams use a simplified slope model; field takeoffs should still be verified.
- **AI / multiple sources**: When several sources are fused (`src/roofReports/ai/measurementFusion.ts`), area and perimeter use **confidence-weighted means** computed only from sources that actually provide that number (missing fields no longer pull the average down). Pitch is fused as a weighted **rise/12** when parseable.
- **Dollar estimates** (`computeRoofDamageEstimate`): Built from plan area + waste + system-specific rates. Treat outputs as **indicative**; align allowances with your carrier or Xactimate workflow.

## Development

```bash
npm install
npm start
# Web
npm run web
```

Copy `.env.example` to `.env` / `.env.local` as needed for Mapbox, Supabase, etc.

## Deployment

See `README_DEPLOYMENT.md` if present.
