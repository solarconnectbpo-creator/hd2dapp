/**
 * Cesium 3D roof drawing is **web-only** (CesiumJS + WebGL).
 * Import `setupCesium3DRoofTool` from `cesium3dRoofTool.web` on web, or use platform resolution.
 */

import type { Cesium3DRoofToolHandle, Cesium3DRoofToolOptions } from "./cesium3dRoofTool.types";

export type { Cesium3DRoofToolHandle, Cesium3DRoofToolOptions } from "./cesium3dRoofTool.types";

export async function setupCesium3DRoofTool(
  _container: unknown,
  _options: Cesium3DRoofToolOptions,
): Promise<Cesium3DRoofToolHandle> {
  throw new Error("Cesium 3D roof tool is only available in the web build (see cesium3dRoofTool.web.ts).");
}
