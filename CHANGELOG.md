# Changelog

All notable changes to this project are documented here. Dates use ISO 8601.

## [Unreleased]

### Cesium 3D roof tool (web)

- Added `cesium` dependency and `src/roofReports/cesium3dRoofTool.web.ts`: Cesium World Terrain + Esri imagery, optional GeoJSON, click/right-click polygon with **geodesic** area via Turf; `cesium3dRoofTool.ts` throws on native.
- **Navigation:** `Cesium3DRoof` screen (`Cesium3DRoofScreen` / `.web.tsx`) registered in `ReportsStackNavigator`; **Roof Reports** home shows **“3D globe roof trace (Cesium demo)”** on web only.
- **`postinstall`** copies Cesium `Build/Cesium` → `public/cesium/`; default `CESIUM_BASE_URL` is `/cesium/` so the globe can load workers (see `CESIUM_3D_ROOF.md`).
- **Property map picker:** if `GET /api/leads` fails (backend down), a yellow hint explains uploading CSV or clicking the map.
- See `src/roofReports/CESIUM_3D_ROOF.md` for ion token and static asset notes; `.env.example` documents `EXPO_PUBLIC_CESIUM_*`.

### AI photo pitch & measurements

- `POST /api/ai/roof-pitch` (vision) now returns optional **estimateRoofAreaSqFt** and **estimateRoofPerimeterFt** when the model sees a reliable scale (labels, measurement overlays, etc.); otherwise `null`. Includes **measurementConfidence** and **measurementRationale**.
- **Create damage roof report**: button **“AI photo pitch & measurements”**; fills area/perimeter only when those fields were still **unset** (does not overwrite trace or CSV).
- **Preview** shows AI measurement lines when present.

### Roof trace 3D (web / Mapbox)

- New `src/roofReports/roofTrace3d.ts`: terrain elevation per corner via `map.queryTerrainElevation` when the raster-dem terrain source is active, with **Tilequery** (`mapbox.mapbox-terrain-v2`) as fallback; rough **terrain pitch** from Δelevation vs horizontal span between highest/lowest corners (or ~¼ perimeter as run fallback).
- `RoofTraceMap.web.tsx` calls `enhanceRoofTraceWith3D` after each polygon change (generation guard cancels stale async work).
- `RoofTraceMetrics` / `RoofMeasurements` extended with `roofTracePoints3D`, `avgTerrainElevationM`, `terrainPitchEstimate`; **CreateDamageRoofReport** fills `roofPitch` from terrain only when pitch was still empty.

### LiDAR / map measurements (accuracy)

- **`LidarGeometryEngine`** supports two coordinate modes:
  - **`geographic`**: `Point3D.x` = latitude (°), `y` = longitude (°), `z` = elevation (m). Uses Turf **geodesic** horizontal distance, **geodesic polygon area** (`turf.area`), **local ENU**–based angles at the vertex (with vertical component), and **ENU projection** (meters at first point) before the existing fan volume estimate.
  - **`cartesian`**: `x`, `y`, `z` in meters (original Euclidean / shoelace / fan behavior).
- **`useLidarMeasurement`** accepts `{ coordinateSystem?: 'geographic' | 'cartesian' }` and defaults to **`geographic`** so map taps (lat/lng) use the geodesic path without extra setup.
- **`Point3D`** may set optional **`coordinateSystem`** to override the mode for a batch when mixed use is needed.
- **`downsamplePointCloud`** bins in meter-scale ENU when mode is geographic.
- Exports: **`PointCoordinateSystem`** from `src/lidar`.

### Types / exports

- `MeasurementResult.distance` description updated to reflect geodesic + Δz when geographic.

---

Earlier work (roof reports, Mapbox, AI pitch, ridge PCA, etc.) predates this log; add entries here as you ship features.
