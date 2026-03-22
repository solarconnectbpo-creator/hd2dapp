/**
 * CesiumJS: draw roof vertices on the globe with terrain, geodesic area (m²) via Turf.
 * Web only — requires `EXPO_PUBLIC_CESIUM_ION_TOKEN` (or pass ionAccessToken) and static Cesium assets.
 * See `CESIUM_3D_ROOF.md` for copying Build/Workers for production.
 */

import * as turf from "@turf/turf";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import type { Cesium3DRoofToolHandle, Cesium3DRoofToolOptions } from "./cesium3dRoofTool.types";

export type { Cesium3DRoofToolHandle, Cesium3DRoofToolOptions } from "./cesium3dRoofTool.types";

/** Geodesic polygon area (m²) from globe positions. */
export function calculatePolygonAreaM2(cartesians: any[]): number {
  if (cartesians.length < 3) return 0;
  const ring: [number, number][] = cartesians.map((c) => {
    const cartographic = Cesium.Cartographic.fromCartesian(c);
    return [
      Cesium.Math.toDegrees(cartographic.longitude),
      Cesium.Math.toDegrees(cartographic.latitude),
    ];
  });
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  try {
    return turf.area(turf.polygon([ring]));
  } catch {
    return 0;
  }
}

/** Cesium loads Workers/ThirdParty from this URL; must match `public/cesium` after postinstall copy. */
function setCesiumBaseUrlFromEnv(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { CESIUM_BASE_URL?: string };
  if (w.CESIUM_BASE_URL) return;
  const fromEnv =
    typeof process !== "undefined" && process.env?.EXPO_PUBLIC_CESIUM_BASE_URL
      ? String(process.env.EXPO_PUBLIC_CESIUM_BASE_URL).replace(/\/$/, "") + "/"
      : "/cesium/";
  w.CESIUM_BASE_URL = fromEnv;
}

/**
 * Creates a Cesium Viewer, optional GeoJSON footprints, click-to-add / right-click-to-close roof polygon.
 */
export async function setupCesium3DRoofTool(
  container: HTMLElement,
  options: Cesium3DRoofToolOptions,
): Promise<Cesium3DRoofToolHandle & { viewer: any }> {
  setCesiumBaseUrlFromEnv();

  const token = options.ionAccessToken?.trim();
  if (!token) {
    throw new Error("Cesium ion access token is required (set ionAccessToken or EXPO_PUBLIC_CESIUM_ION_TOKEN).");
  }

  Cesium.Ion.defaultAccessToken = token;

  const imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
  );

  const viewer = new Cesium.Viewer(container, {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    baseLayerPicker: false,
    baseLayer: new Cesium.ImageryLayer(imageryProvider),
  });

  if (options.gisDataUrl?.trim()) {
    try {
      const dataSource = await Cesium.GeoJsonDataSource.load(options.gisDataUrl.trim(), {
        stroke: Cesium.Color.CYAN,
        fill: Cesium.Color.CYAN.withAlpha(0.15),
        strokeWidth: 2,
      });
      await viewer.dataSources.add(dataSource);
      await viewer.zoomTo(dataSource);
    } catch (e) {
      console.warn("Cesium GeoJSON load failed:", e);
    }
  }

  const roofPoints: any[] = [];
  const pointEntities: any[] = [];
  let polygonEntity: any | undefined;

  const handler = viewer.screenSpaceEventHandler;

  handler.setInputAction((click: { position: any }) => {
    const picked = viewer.scene.pick(click.position);
    if (Cesium.defined(picked)) {
      return;
    }
    const ray = viewer.camera.getPickRay(click.position);
    if (!ray) return;
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (!cartesian) return;

    roofPoints.push(cartesian);
    pointEntities.push(
      viewer.entities.add({
        position: cartesian,
        point: { pixelSize: 8, color: Cesium.Color.RED },
      }),
    );
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  handler.setInputAction(() => {
    if (roofPoints.length < 3) {
      roofPoints.length = 0;
      for (const e of pointEntities) {
        viewer.entities.remove(e);
      }
      pointEntities.length = 0;
      return;
    }

    if (polygonEntity) {
      viewer.entities.remove(polygonEntity);
    }

    const area = calculatePolygonAreaM2(roofPoints);
    options.onPolygonComplete?.(area);

    polygonEntity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy([...roofPoints]),
        material: Cesium.Color.YELLOW.withAlpha(0.35),
        outline: true,
        outlineColor: Cesium.Color.BLACK,
      },
    });

    roofPoints.length = 0;
    for (const e of pointEntities) {
      viewer.entities.remove(e);
    }
    pointEntities.length = 0;
  }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

  const destroy = () => {
    try {
      handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    } catch {
      // ignore
    }
    try {
      viewer.destroy();
    } catch {
      // ignore
    }
  };

  return { viewer, destroy };
}
