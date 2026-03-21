# Cesium 3D roof tool (web only)

## In the app

**Reports → Roof Reports → “3D globe roof trace (Cesium demo)”** (web only) opens `Cesium3DRoofScreen`, which calls `setupCesium3DRoofTool` from `cesium3dRoofTool.web.ts`.

`setupCesium3DRoofTool` in `cesium3dRoofTool.web.ts` embeds [CesiumJS](https://cesium.com/) with:

- Cesium World Terrain (requires a **Cesium ion** access token — free tier at [cesium.com/ion](https://cesium.com/ion/))
- Esri World Imagery as the base layer
- Optional **GeoJSON** footprints via `gisDataUrl`
- **Left-click**: pick points on the terrain (ray–globe intersection)
- **Right-click**: close polygon, compute **geodesic area (m²)** with `@turf/turf`, optional `onPolygonComplete` callback

## Static assets (required for the globe to render)

After `npm install`, **`postinstall`** runs `scripts/copy-cesium-assets.js`, which copies `node_modules/cesium/Build/Cesium` → **`public/cesium/`**. The app sets `window.CESIUM_BASE_URL` to **`/cesium/`** by default so workers load from there.

If the globe stays blank, run manually:

```bash
node scripts/copy-cesium-assets.js
```

Then restart Expo. `public/cesium/` is gitignored (large).

## Environment

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_CESIUM_ION_TOKEN` | Passed to `Cesium.Ion.defaultAccessToken` (or pass `ionAccessToken` in options). |
| `EXPO_PUBLIC_CESIUM_BASE_URL` | Optional override for static assets (default `/cesium/`). |

## Expo / Metro / web

Cesium is large and relies on **web workers** and static files. A plain Expo web build may need extra config to set `window.CESIUM_BASE_URL` and copy `Build/Cesium` into your static output (similar to [Cesium’s webpack guide](https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/)). If the globe stays blank or workers fail, fix `CESIUM_BASE_URL` first.

## Native (iOS / Android)

Not supported — import the non-`.web` `cesium3dRoofTool.ts` stub or guard with `Platform.OS === "web"`.
