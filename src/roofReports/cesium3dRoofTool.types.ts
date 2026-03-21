/**
 * Options for {@link setupCesium3DRoofTool} (web only).
 */
export interface Cesium3DRoofToolOptions {
  /** Cesium ion token (world terrain). https://cesium.com/ion/ */
  ionAccessToken: string;
  /** Optional GeoJSON URL (footprints, etc.) loaded after the viewer starts. */
  gisDataUrl?: string;
  /** Fires when the user finishes a polygon (right-click) with geodesic area in m². */
  onPolygonComplete?: (areaM2: number) => void;
}

export interface Cesium3DRoofToolHandle {
  destroy: () => void;
}
