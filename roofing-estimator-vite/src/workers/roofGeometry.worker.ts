import type { Feature, Polygon } from "geojson";
import { computePolygonRoofGeometry, type RoofStructureMode } from "../lib/roofGeometryFromPolygons";

type PolyFeature = Feature<Polygon>;

type AutoCalcRequest = {
  type: "compute";
  requestId: number;
  polygons: PolyFeature[];
  roofType: string;
  roofStructure: RoofStructureMode;
  roofPitch: string;
  manualSums: Record<string, number>;
};

type AutoCalcResponse =
  | {
      type: "result";
      requestId: number;
      geo: ReturnType<typeof computePolygonRoofGeometry>;
      manualSums: Record<string, number>;
    }
  | {
      type: "error";
      requestId: number;
      message: string;
    };

self.onmessage = (ev: MessageEvent<AutoCalcRequest>) => {
  const msg = ev.data;
  if (!msg || msg.type !== "compute") return;
  try {
    const geo = computePolygonRoofGeometry(msg.polygons, msg.roofType, msg.roofStructure, msg.roofPitch);
    const out: AutoCalcResponse = {
      type: "result",
      requestId: msg.requestId,
      geo,
      manualSums: msg.manualSums,
    };
    self.postMessage(out);
  } catch (err) {
    const out: AutoCalcResponse = {
      type: "error",
      requestId: msg.requestId,
      message: err instanceof Error ? err.message : "Worker geometry compute failed",
    };
    self.postMessage(out);
  }
};
