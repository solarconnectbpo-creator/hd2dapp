import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  type CSSProperties,
} from "react";
import maplibregl, { type MapGeoJSONFeature } from "maplibre-gl";
import { getHd2dApiBase } from "../lib/hd2dApiBase";
import { formatWorkerFetchFailure } from "../lib/workerApiError";
import {
  clipPlanRingToBoundary,
  midpointAlongPolylineFt,
  pathLengthFt,
  ringAreaSqM,
  ringPerimeterFt,
} from "../lib/geoFootprintMeasure";
import { extractOwnerFromParcel } from "../lib/canvassingParcelOwner";

/** Esri GeoJSON sometimes nests row fields under `properties.attributes`. */
function flattenParcelFeatureProperties(raw: Record<string, unknown>): Record<string, unknown> {
  const base = { ...raw };
  const nested = base.attributes;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const a = nested as Record<string, unknown>;
    delete base.attributes;
    return { ...base, ...a };
  }
  return base;
}

/** When stacked polygons share a click, prefer the feature that actually carries assessor attributes / owner. */
function bestParcelPropertiesFromHits(hits: MapGeoJSONFeature[]): Record<string, unknown> | null {
  let best: Record<string, unknown> | null = null;
  let bestScore = -1;
  for (const h of hits) {
    const raw = h.properties;
    if (!raw || typeof raw !== "object") continue;
    const flat = flattenParcelFeatureProperties({ ...(raw as Record<string, unknown>) });
    const ownerLen = extractOwnerFromParcel(flat).length;
    const score = ownerLen * 25 + Object.keys(flat).length;
    if (score > bestScore) {
      bestScore = score;
      best = flat;
    }
  }
  return best;
}

export type Map3DHandle = {
  getCanvas: () => HTMLCanvasElement | null;
  /** Fly to the property marker or map center at a roof-friendly zoom. */
  flyToProperty: () => void;
  /** Top-down satellite (easier tracing). */
  setTopDownView: () => void;
  /** Default oblique 3D view for context. */
  setObliqueView: () => void;
};

export type Map3DPoint = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: string;
};

type DrawMode = "none" | "polygon" | "polyline" | "auto-trace";

type Props = {
  center?: { lat: number; lng: number };
  zoom?: number;
  pitch?: number;
  bearing?: number;
  points?: Map3DPoint[];
  height?: number | string;
  enableGps?: boolean;
  enableDraw?: boolean;
  polylineColor?: string;
  /** Third arg: properties from the parcel overlay polygon under the click (assessor attributes), when present. */
  onMapClick?: (lat: number, lng: number, parcelHitProperties?: Record<string, unknown> | null) => void;
  onPointClick?: (id: string) => void;
  onMoveEnd?: (lat: number, lng: number) => void;
  /** Fires after load and on pan/zoom — used to load bbox-scoped parcel GeoJSON on Canvassing. */
  onBoundsChange?: (bounds: { west: number; south: number; east: number; north: number }) => void;
  onGpsUpdate?: (lat: number, lng: number) => void;
  onPolygonDrawn?: (feature: GeoJSON.Feature<GeoJSON.Polygon>) => void;
  onPolylineDrawn?: (feature: GeoJSON.Feature<GeoJSON.LineString>) => void;
  onFeaturesCleared?: () => void;
  /** Parcel / zoning polygons from ArcGIS FeatureServer (Contacts & settings) — drawn under manual trace. */
  parcelOverlay?: GeoJSON.FeatureCollection | null;
  /** USGS/Esri building footprint at the last enrich point (cyan) — drawn above parcel overlay. */
  buildingFootprintOverlay?: GeoJSON.FeatureCollection | null;
  /**
   * Optional ArcGIS Server / MapServer / ImageServer **cached** raster tiles (XYZ `{z}/{y}/{x}`), from Worker GET /api/health.
   * Drawn above satellite imagery, below reference labels and vector overlays.
   */
  arcgisServerTileUrl?: string | null;
  arcgisServerTileOpacity?: number;
  arcgisServerTileAttribution?: string;
  /**
   * Inferred roof line types from roof-segment (ridge/hip/valley/eave/rake) in geo coordinates.
   * SAM does not label lines; the service uses geometry heuristics — verify before quoting.
   */
  onAutoTraceRoofLines?: (
    lines: Array<{ type: string; feature: GeoJSON.Feature<GeoJSON.LineString> }>,
  ) => void;
  /** Stamped on finished manual polylines (ridge/eave/rake/…) for color + estimator totals. */
  manualRoofLineType?: string;
  /** Show Recenter / 2D / 3D shortcuts when drawing (default true with enableDraw). */
  showViewControls?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

function feetLabel(meters: number): string {
  const ft = meters * 3.28084;
  return feetLabelFromFeet(ft);
}

function feetLabelFromFeet(ft: number): string {
  return ft >= 1000 ? `${(ft / 1000).toFixed(1)}k ft` : `${Math.round(ft)} ft`;
}

function sqFtLabel(sqMeters: number): string {
  const sqFt = sqMeters * 10.7639;
  return sqFt >= 10000 ? `${(sqFt / 1000).toFixed(1)}k sq ft` : `${Math.round(sqFt)} sq ft`;
}

/** SAM IoU is usually 0–1 but can slightly exceed 1; never show ">100%". */
function samConfidencePercent(confidence: number | undefined): string {
  if (confidence == null || !Number.isFinite(confidence)) return "";
  const c = Math.min(1, Math.max(0, confidence));
  return `${Math.round(c * 100)}%`;
}

function haversineM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLng = toR(b[0] - a[0]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a[1])) * Math.cos(toR(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export const Map3D = forwardRef<Map3DHandle, Props>(function Map3DInner({
  center,
  zoom = 17,
  pitch = 60,
  bearing = -20,
  points,
  height = 520,
  enableGps = false,
  enableDraw = false,
  polylineColor = "#ef4444",
  onMapClick,
  onPointClick,
  onMoveEnd,
  onBoundsChange,
  onGpsUpdate,
  onPolygonDrawn,
  onPolylineDrawn,
  onFeaturesCleared,
  parcelOverlay = null,
  buildingFootprintOverlay = null,
  arcgisServerTileUrl,
  arcgisServerTileOpacity = 0.55,
  arcgisServerTileAttribution = "",
  onAutoTraceRoofLines,
  manualRoofLineType = "ridge",
  showViewControls = true,
  className,
  style: styleProp,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const gpsMarkerRef = useRef<maplibregl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>("none");
  const drawPointsRef = useRef<[number, number][]>([]);
  const drawMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [drawInfo, setDrawInfo] = useState("");
  const [autoTraceBusy, setAutoTraceBusy] = useState(false);
  /** True when a finished polygon/line or AI trace is on the map (drawPointsRef may be empty for AI). */
  const [hasPersistedDraw, setHasPersistedDraw] = useState(false);
  /** Finished roof polygon + all ridge/eave/… polylines stay here so switching draw modes does not erase them. */
  const committedFeaturesRef = useRef<GeoJSON.Feature[]>([]);
  /** Optional point labels (e.g. AI polygon edge lengths) merged into draw-labels with committed line labels. */
  const committedExtraLabelsRef = useRef<GeoJSON.Feature[]>([]);
  const manualRoofLineTypeRef = useRef(manualRoofLineType);
  manualRoofLineTypeRef.current = manualRoofLineType;

  const pointsRef = useRef(points);
  pointsRef.current = points;
  const centerRef = useRef(center);
  centerRef.current = center;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const finishDrawRef = useRef<() => void>(() => {});

  const onClickRef = useRef(onMapClick);
  const onPointClickRef = useRef(onPointClick);
  const onMoveEndRef = useRef(onMoveEnd);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onGpsRef = useRef(onGpsUpdate);
  const onPolygonRef = useRef(onPolygonDrawn);
  const onPolylineRef = useRef(onPolylineDrawn);
  const onClearedRef = useRef(onFeaturesCleared);
  const onAutoTraceRoofLinesRef = useRef(onAutoTraceRoofLines);
  const drawModeRef = useRef(drawMode);
  const polylineColorRef = useRef(polylineColor);
  useEffect(() => { onClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onPointClickRef.current = onPointClick; }, [onPointClick]);
  useEffect(() => { onMoveEndRef.current = onMoveEnd; }, [onMoveEnd]);
  useEffect(() => { onBoundsChangeRef.current = onBoundsChange; }, [onBoundsChange]);
  useEffect(() => { onGpsRef.current = onGpsUpdate; }, [onGpsUpdate]);
  useEffect(() => { onPolygonRef.current = onPolygonDrawn; }, [onPolygonDrawn]);
  useEffect(() => { onPolylineRef.current = onPolylineDrawn; }, [onPolylineDrawn]);
  useEffect(() => { onClearedRef.current = onFeaturesCleared; }, [onFeaturesCleared]);
  useEffect(() => { onAutoTraceRoofLinesRef.current = onAutoTraceRoofLines; }, [onAutoTraceRoofLines]);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { polylineColorRef.current = polylineColor; }, [polylineColor]);

  const updateCommittedAndSketch = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = drawPointsRef.current;
    const mode = drawModeRef.current;
    const src = map.getSource("draw-source") as maplibregl.GeoJSONSource | undefined;
    const labelSrc = map.getSource("draw-labels") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const sketchFeatures: GeoJSON.Feature[] = [];
    const sketchLabels: GeoJSON.Feature[] = [];

    if (pts.length >= 2) {
      const coords = mode === "polygon" && pts.length >= 3 ? [...pts, pts[0]] : pts;
      if (mode === "polygon" && pts.length >= 3) {
        sketchFeatures.push({
          type: "Feature",
          properties: { kind: "polygon" },
          geometry: { type: "Polygon", coordinates: [coords] },
        });
      }
      sketchFeatures.push({
        type: "Feature",
        properties: { kind: "line" },
        geometry: { type: "LineString", coordinates: coords },
      });

      for (let i = 0; i < coords.length - 1; i++) {
        const dist = haversineM(coords[i], coords[i + 1]);
        const mid = midpoint(coords[i], coords[i + 1]);
        sketchLabels.push({
          type: "Feature",
          properties: { label: feetLabel(dist) },
          geometry: { type: "Point", coordinates: mid },
        });
      }
    }
    for (const pt of pts) {
      sketchFeatures.push({
        type: "Feature",
        properties: { kind: "vertex" },
        geometry: { type: "Point", coordinates: pt },
      });
    }

    const committedLineLabels: GeoJSON.Feature[] = [];
    for (const f of committedFeaturesRef.current) {
      const k = f.properties && typeof f.properties === "object" ? (f.properties as { kind?: string }).kind : undefined;
      if (k !== "line" || f.geometry.type !== "LineString") continue;
      const coords = f.geometry.coordinates as [number, number][];
      if (coords.length < 2) continue;
      const totalFt = pathLengthFt(coords);
      const mid = midpointAlongPolylineFt(coords) ?? midpoint(coords[0]!, coords[coords.length - 1]!);
      const rt = (f.properties as { roofLineType?: string }).roofLineType;
      const pref = typeof rt === "string" && rt.length ? `${rt.slice(0, 3)} ` : "";
      committedLineLabels.push({
        type: "Feature",
        properties: { label: `${pref}${feetLabelFromFeet(totalFt)}` },
        geometry: { type: "Point", coordinates: mid },
      });
    }

    src.setData({
      type: "FeatureCollection",
      features: [...committedFeaturesRef.current, ...sketchFeatures],
    });
    labelSrc?.setData({
      type: "FeatureCollection",
      features: [...committedExtraLabelsRef.current, ...committedLineLabels, ...sketchLabels],
    });

    if (mode === "polygon" && pts.length >= 3) {
      const areaM2 = ringAreaSqM(pts);
      const perimFt = ringPerimeterFt(pts);
      setDrawInfo(
        `Area: ${sqFtLabel(areaM2)} | Perimeter: ${perimFt >= 1000 ? `${(perimFt / 1000).toFixed(1)}k ft` : `${Math.round(perimFt)} ft`}`,
      );
    } else if (pts.length >= 2 && (mode === "polyline" || mode === "polygon")) {
      const totalFt = pathLengthFt(pts);
      setDrawInfo(`Length: ${totalFt >= 1000 ? `${(totalFt / 1000).toFixed(1)}k ft` : `${Math.round(totalFt)} ft`}`);
    } else if (committedFeaturesRef.current.length > 0 && pts.length === 0 && mode === "none") {
      setDrawInfo("Choose line type below, then Measure Line — double-click or Finish each run.");
    } else {
      setDrawInfo(pts.length === 1 ? "Click next point..." : "");
    }
  }, []);

  const clearSketchOnly = useCallback(() => {
    drawPointsRef.current = [];
    for (const m of drawMarkersRef.current) m.remove();
    drawMarkersRef.current = [];
    updateCommittedAndSketch();
  }, [updateCommittedAndSketch]);

  const clearDraw = useCallback(() => {
    committedFeaturesRef.current = [];
    committedExtraLabelsRef.current = [];
    drawPointsRef.current = [];
    for (const m of drawMarkersRef.current) m.remove();
    drawMarkersRef.current = [];
    setDrawInfo("");
    setHasPersistedDraw(false);
    const map = mapRef.current;
    if (map) {
      const areaLabelSrc = map.getSource("area-label-source") as maplibregl.GeoJSONSource | undefined;
      areaLabelSrc?.setData({ type: "FeatureCollection", features: [] });
      const src = map.getSource("draw-source") as maplibregl.GeoJSONSource | undefined;
      const labelSrc = map.getSource("draw-labels") as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: "FeatureCollection", features: [] });
      labelSrc?.setData({ type: "FeatureCollection", features: [] });
    } else {
      updateCommittedAndSketch();
    }
    onClearedRef.current?.();
  }, [updateCommittedAndSketch]);

  const undoLastPoint = useCallback(() => {
    if (drawPointsRef.current.length > 0) {
      drawPointsRef.current.pop();
      updateCommittedAndSketch();
    }
  }, [updateCommittedAndSketch]);

  const finishDraw = useCallback(() => {
    const pts = drawPointsRef.current;
    const mode = drawModeRef.current;
    if (mode === "polygon" && pts.length >= 3) {
      const ring = [...pts, pts[0]];
      const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [ring] },
      };
      committedFeaturesRef.current.push({
        type: "Feature",
        properties: { kind: "polygon" },
        geometry: { type: "Polygon", coordinates: [ring] },
      });
      onPolygonRef.current?.(feature);

      const map = mapRef.current;
      if (map) {
        const areaM2 = ringAreaSqM(pts);
        const centroid = pts.reduce(
          (acc, p) => [acc[0] + p[0] / pts.length, acc[1] + p[1] / pts.length] as [number, number],
          [0, 0] as [number, number],
        );
        const areaLabelSrc = map.getSource("area-label-source") as maplibregl.GeoJSONSource | undefined;
        if (areaLabelSrc) {
          areaLabelSrc.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { label: sqFtLabel(areaM2) },
                geometry: { type: "Point", coordinates: centroid },
              },
            ],
          });
        }
      }
      drawPointsRef.current = [];
      setHasPersistedDraw(true);
      updateCommittedAndSketch();
    } else if (mode === "polyline" && pts.length >= 2) {
      const roofT = manualRoofLineTypeRef.current || "ridge";
      const coords = [...pts];
      const feature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: { roofLineType: roofT },
        geometry: { type: "LineString", coordinates: coords },
      };
      committedFeaturesRef.current.push({
        type: "Feature",
        properties: { kind: "line", roofLineType: roofT },
        geometry: { type: "LineString", coordinates: coords },
      });
      onPolylineRef.current?.(feature);
      drawPointsRef.current = [];
      setHasPersistedDraw(true);
      updateCommittedAndSketch();
    }
    setDrawMode("none");
  }, [updateCommittedAndSketch]);

  finishDrawRef.current = finishDraw;

  useImperativeHandle(ref, () => ({
    getCanvas: () => mapRef.current?.getCanvas() ?? null,
    flyToProperty: () => {
      const map = mapRef.current;
      if (!map) return;
      const pts = pointsRef.current;
      const c = centerRef.current;
      const z = Math.max(17, zoomRef.current ?? 18);
      if (pts?.length) {
        const p = pts[0];
        map.flyTo({ center: [p.lng, p.lat], zoom: z, duration: 900 });
      } else if (c) {
        map.flyTo({ center: [c.lng, c.lat], zoom: z, duration: 900 });
      }
    },
    setTopDownView: () => {
      mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 650 });
    },
    setObliqueView: () => {
      mapRef.current?.easeTo({ pitch: 60, bearing: -20, duration: 650 });
    },
  }), []);

  const runAutoTrace = useCallback(async (_clickLngLat: { lng: number; lat: number }, clickPoint: { x: number; y: number }) => {
    const map = mapRef.current;
    if (!map || autoTraceBusy) return;
    setAutoTraceBusy(true);
    setDrawInfo("AI detecting roof...");
    try {
      const canvas = map.getCanvas();
      /** Tighter crop keeps one roof dominant in frame; large crops make SAM merge neighboring houses. */
      const cropSize = 384;
      const cx = Math.round(clickPoint.x);
      const cy = Math.round(clickPoint.y);
      const x0 = Math.max(0, cx - cropSize / 2);
      const y0 = Math.max(0, cy - cropSize / 2);
      const x1 = Math.min(canvas.width, x0 + cropSize);
      const y1 = Math.min(canvas.height, y0 + cropSize);
      const w = x1 - x0;
      const h = y1 - y0;

      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
      let dataUrl: string;
      try {
        dataUrl = offscreen.toDataURL("image/jpeg", 0.92);
      } catch {
        setDrawInfo(
          "Map capture blocked by browser (cross-origin tiles). Use Manual Trace to draw the roof, or upload a photo for AI.",
        );
        return;
      }
      const b64 = dataUrl.split(",")[1];

      const relX = cx - x0;
      const relY = cy - y0;

      const apiBase = getHd2dApiBase().replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/ai/roof-segment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          imageBase64: b64,
          pointX: relX,
          pointY: relY,
          imageWidth: w,
          imageHeight: h,
        }),
      });
      const rawText = await res.text();
      let data: {
        success?: boolean;
        polygon?: [number, number][];
        roofLines?: Array<{ type: string; coordinates: [number, number][] }>;
        roof_lines?: Array<{ type: string; coordinates: [number, number][] }>;
        areaPx?: number;
        confidence?: number;
        imageWidth?: number;
        imageHeight?: number;
        error?: string;
      };
      try {
        data = JSON.parse(rawText) as typeof data;
      } catch {
        setDrawInfo(
          `${res.ok ? "Invalid response from roof-segment service." : formatWorkerFetchFailure(res, rawText, "Roof-segment request failed")} Use Manual Trace if AI stays unavailable.`,
        );
        return;
      }
      if (!res.ok) {
        setDrawInfo(
          `${formatWorkerFetchFailure(res, rawText, "Roof-segment request failed")} Use Manual Trace to measure the roof.`,
        );
        return;
      }
      if (!data.success || !data.polygon?.length) {
        setDrawInfo(
          `${data.error || "No roof detected at click point. Try clicking the roof surface or zoom in."} Manual Trace always works offline.`,
        );
        return;
      }

      const imgW = data.imageWidth || w;
      const imgH = data.imageHeight || h;
      /** Scale if API image size differs from the crop we sent. */
      const sx = w / imgW;
      const sy = h / imgH;
      /**
       * Georeference each vertex with map.unproject — correct under pitch/bearing/Web Mercator.
       * Linear interpolation from crop corners was measurably wrong on 3D-tilted satellite views.
       */
      const pxToLngLat = (px: number, py: number): [number, number] => {
        const ll = map.unproject([x0 + px * sx, y0 + py * sy]);
        return [ll.lng, ll.lat];
      };

      /** Parcel (property) first, then building footprint — same hit order as map tap enrichment. */
      let boundaryAtClick: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = null;
      const screenPt: [number, number] = [Math.round(clickPoint.x), Math.round(clickPoint.y)];
      try {
        const pickBoundary = (hits: MapGeoJSONFeature[]) => {
          for (const h of hits) {
            const g = h.geometry;
            if (g && (g.type === "Polygon" || g.type === "MultiPolygon")) {
              return {
                type: "Feature" as const,
                geometry: g,
                properties: {},
              } as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
            }
          }
          return null;
        };
        const parcelHits = map.queryRenderedFeatures(screenPt, {
          layers: ["arcgis-overlay-fill", "arcgis-overlay-line"],
        });
        const buildingHits = map.queryRenderedFeatures(screenPt, {
          layers: ["building-overlay-fill", "building-overlay-line"],
        });
        boundaryAtClick = pickBoundary(parcelHits) ?? pickBoundary(buildingHits);
      } catch {
        boundaryAtClick = null;
      }

      let openRing: [number, number][] = data.polygon.map(([px, py]) => pxToLngLat(px, py));
      let clippedToProperty = false;
      let clipFallbackNote: string | null = null;
      if (boundaryAtClick) {
        const clipped = clipPlanRingToBoundary(openRing, boundaryAtClick);
        if (clipped) {
          openRing = clipped.ring;
          clippedToProperty = clipped.clipped;
        } else {
          /** Parcel/building overlay did not intersect SAM outline — still show AI result so trace is usable. */
          clipFallbackNote =
            "AI outline did not overlap the parcel/building overlay here — showing full AI outline; verify edges or zoom and use Manual Trace if needed.";
        }
      }

      const geoRing: [number, number][] = [...openRing];
      if (geoRing.length >= 3 && (geoRing[0][0] !== geoRing[geoRing.length - 1][0] || geoRing[0][1] !== geoRing[geoRing.length - 1][1])) {
        geoRing.push(geoRing[0]);
      }

      const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [geoRing] },
      };

      const roofLinesFromApi = Array.isArray(data.roofLines) && data.roofLines.length
        ? data.roofLines
        : Array.isArray(data.roof_lines) && data.roof_lines.length
          ? data.roof_lines
          : [];

      const roofLineFeatures: GeoJSON.Feature[] = [];
      const roofLinesPayload: Array<{ type: string; feature: GeoJSON.Feature<GeoJSON.LineString> }> = [];
      for (const rl of roofLinesFromApi) {
        if (!rl?.coordinates?.length || rl.coordinates.length < 2) continue;
        const geoCoords = rl.coordinates.map(([px, py]) => pxToLngLat(px, py));
        const lineFeat: GeoJSON.Feature<GeoJSON.LineString> = {
          type: "Feature",
          properties: { roofLineType: rl.type },
          geometry: { type: "LineString", coordinates: geoCoords },
        };
        roofLinesPayload.push({ type: rl.type, feature: lineFeat });
        roofLineFeatures.push({
          type: "Feature",
          properties: { kind: "line" as const, roofLineType: rl.type },
          geometry: lineFeat.geometry,
        });
      }

      const hasInferredRoofLines = roofLineFeatures.length > 0;

      drawPointsRef.current = [];
      const polyCommitted: GeoJSON.Feature = {
        type: "Feature",
        properties: { kind: "polygon", autoTrace: true },
        geometry: feature.geometry,
      };
      const outlineRing: GeoJSON.Feature | null =
        hasInferredRoofLines
          ? null
          : { type: "Feature", properties: { kind: "line" }, geometry: { type: "LineString", coordinates: geoRing } };
      const vertexFeatures: GeoJSON.Feature[] = hasInferredRoofLines
        ? []
        : geoRing.slice(0, -1).map((pt) => ({
            type: "Feature" as const,
            properties: { kind: "vertex" },
            geometry: { type: "Point" as const, coordinates: pt },
          }));
      committedFeaturesRef.current = [
        polyCommitted,
        ...(outlineRing ? [outlineRing] : []),
        ...roofLineFeatures,
        ...vertexFeatures,
      ];

      const extraLabels: GeoJSON.Feature[] = [];
      if (!hasInferredRoofLines) {
        for (let i = 0; i < geoRing.length - 1; i++) {
          const dist = haversineM(geoRing[i], geoRing[i + 1]);
          const mid = midpoint(geoRing[i], geoRing[i + 1]);
          extraLabels.push({
            type: "Feature",
            properties: { label: feetLabel(dist) },
            geometry: { type: "Point", coordinates: mid },
          });
        }
      }
      for (const rl of roofLinesPayload) {
        const coords = rl.feature.geometry.coordinates as [number, number][];
        if (coords.length < 2) continue;
        const totalFt = pathLengthFt(coords);
        const mid =
          midpointAlongPolylineFt(coords) ?? midpoint(coords[0]!, coords[coords.length - 1]!);
        extraLabels.push({
          type: "Feature",
          properties: {
            label: `${rl.type.slice(0, 3)} ${feetLabelFromFeet(totalFt)}`,
          },
          geometry: { type: "Point", coordinates: mid },
        });
      }
      committedExtraLabelsRef.current = extraLabels;
      updateCommittedAndSketch();

      if (roofLinesPayload.length && onAutoTraceRoofLinesRef.current) {
        onAutoTraceRoofLinesRef.current(roofLinesPayload);
      }

      const ringPts = geoRing.length >= 2 &&
        geoRing[0][0] === geoRing[geoRing.length - 1][0] &&
        geoRing[0][1] === geoRing[geoRing.length - 1][1]
        ? geoRing.slice(0, -1)
        : geoRing;
      if (ringPts.length >= 3) {
        const areaM2 = ringAreaSqM(ringPts);
        const centroid = ringPts.reduce(
          (acc, p) => [acc[0] + p[0] / ringPts.length, acc[1] + p[1] / ringPts.length] as [number, number],
          [0, 0] as [number, number],
        );
        const areaLabelSrc = map.getSource("area-label-source") as maplibregl.GeoJSONSource | undefined;
        areaLabelSrc?.setData({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {
                label: `${sqFtLabel(areaM2)}${clippedToProperty ? " on parcel" : " plan est."}`,
              },
              geometry: { type: "Point", coordinates: centroid },
            },
          ],
        });
      }

      const conf = samConfidencePercent(data.confidence);
      const nLines = roofLinesPayload.length;
      const statusParts: string[] = [];
      if (clipFallbackNote) statusParts.push(clipFallbackNote);
      else if (clippedToProperty) statusParts.push("Plan area clipped to the parcel or building you clicked.");
      else
        statusParts.push(
          "Plan footprint (no parcel overlay here — zoom or use manual trace if the outline includes neighbors).",
        );
      if (conf) statusParts.push(`AI mask ${conf}`);
      if (nLines) statusParts.push(`${nLines} inferred roof lines`);
      statusParts.push("Verify pitch and measure on site before bids.");
      setDrawInfo(statusParts.join(" "));
      setHasPersistedDraw(true);
      onPolygonRef.current?.(feature);
    } catch (e) {
      console.error("Auto-trace failed:", e);
      setDrawInfo(e instanceof Error ? `Auto-trace failed: ${e.message}` : "Auto-trace failed");
    } finally {
      setAutoTraceBusy(false);
      setDrawMode("none");
    }
  }, [autoTraceBusy, updateCommittedAndSketch]);

  const runAutoTraceRef = useRef(runAutoTrace);
  runAutoTraceRef.current = runAutoTrace;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const lat = center?.lat ?? 39.8283;
    const lng = center?.lng ?? -98.5795;
    const preferGoogleSat = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim());
    const baseSatSource = preferGoogleSat ? "google-session" : "esri-sat";

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        // Required for symbol/text layers (edge labels, area); without this MapLibre may fail to render labels.
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          "google-session": {
            type: "raster",
            tiles: [
              "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
              "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
              "https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
              "https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
            ],
            tileSize: 256,
            maxzoom: 22,
            attribution: "Imagery &copy; Google",
          },
          "esri-sat": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 20,
            attribution: "Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics",
          },
          "esri-labels": {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            maxzoom: 20,
            attribution: "",
          },
        },
        layers: [
          { id: "satellite-layer", type: "raster", source: baseSatSource, paint: {} },
          { id: "labels-layer", type: "raster", source: "esri-labels", paint: { "raster-opacity": 0.7 } },
        ],
      },
      center: [lng, lat],
      zoom,
      pitch,
      bearing,
      maxZoom: 22,
      maxPitch: 85,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 200, unit: "imperial" }), "bottom-left");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showAccuracyCircle: true,
      }),
      "top-left",
    );

    map.on("load", () => {
      map.addSource("arcgis-overlay", {
        type: "geojson",
        data: parcelOverlay ?? { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "arcgis-overlay-fill",
        type: "fill",
        source: "arcgis-overlay",
        paint: { "fill-color": "#22c55e", "fill-opacity": 0.14 },
      });
      map.addLayer({
        id: "arcgis-overlay-line",
        type: "line",
        source: "arcgis-overlay",
        paint: { "line-color": "#15803d", "line-width": 1.25, "line-opacity": 0.9 },
      });

      map.addSource("building-overlay", {
        type: "geojson",
        data: buildingFootprintOverlay ?? { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "building-overlay-fill",
        type: "fill",
        source: "building-overlay",
        paint: { "fill-color": "#06b6d4", "fill-opacity": 0.22 },
      });
      map.addLayer({
        id: "building-overlay-line",
        type: "line",
        source: "building-overlay",
        paint: { "line-color": "#0891b2", "line-width": 2.25, "line-opacity": 0.95 },
      });

      map.addSource("draw-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addSource("draw-labels", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "draw-fill",
        type: "fill",
        source: "draw-source",
        filter: ["==", ["get", "kind"], "polygon"],
        paint: { "fill-color": "#3b82f6", "fill-opacity": 0.2 },
      });
      map.addLayer({
        id: "draw-outline",
        type: "line",
        source: "draw-source",
        filter: [
          "all",
          ["==", ["get", "kind"], "polygon"],
          ["!=", ["get", "autoTrace"], true],
        ],
        paint: { "line-color": "#2563eb", "line-width": 2, "line-dasharray": [4, 2] },
      });
      map.addLayer({
        id: "draw-line",
        type: "line",
        source: "draw-source",
        filter: ["==", ["get", "kind"], "line"],
        paint: { "line-color": "#3b82f6", "line-width": 3 },
      });
      map.addLayer({
        id: "draw-vertex",
        type: "circle",
        source: "draw-source",
        filter: ["==", ["get", "kind"], "vertex"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#3b82f6",
          "circle-stroke-width": 2.5,
        },
      });
      map.addLayer({
        id: "draw-edge-labels",
        type: "symbol",
        source: "draw-labels",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 13,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-offset": [0, -1],
          "text-allow-overlap": true,
        },
        paint: {
          /* Dark ink + white halo: readable on both bright roofs and dark trees (satellite). */
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2.5,
        },
      });
      map.addSource("area-label-source", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "area-label",
        type: "symbol",
        source: "area-label-source",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 16,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2.75,
        },
      });
      setReady(true);
      const b = map.getBounds();
      onBoundsChangeRef.current?.({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    });

    map.on("click", (e) => {
      const mode = drawModeRef.current;
      if (mode === "auto-trace") {
        void runAutoTraceRef.current(e.lngLat, e.point);
        return;
      }
      if (mode !== "none") {
        const SNAP_PX = 8;
        let coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        const pts = drawPointsRef.current;
        if (pts.length > 0) {
          let bestDist = Infinity;
          for (const existing of pts) {
            const projected = map.project(existing as [number, number]);
            const dx = projected.x - e.point.x;
            const dy = projected.y - e.point.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist && dist <= SNAP_PX) {
              bestDist = dist;
              coord = existing;
            }
          }
        }
        drawPointsRef.current.push(coord);
        updateCommittedAndSketch();
        return;
      }
      let parcelHit: Record<string, unknown> | null = null;
      try {
        const hits = map.queryRenderedFeatures(e.point, {
          layers: ["arcgis-overlay-fill", "arcgis-overlay-line"],
        });
        parcelHit = bestParcelPropertiesFromHits(hits);
      } catch {
        /* queryRenderedFeatures can throw if style not ready */
      }
      onClickRef.current?.(e.lngLat.lat, e.lngLat.lng, parcelHit);
    });

    map.on("dblclick", (e) => {
      if (drawModeRef.current !== "none") {
        e.preventDefault();
        finishDrawRef.current();
      }
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      onMoveEndRef.current?.(c.lat, c.lng);
      const b = map.getBounds();
      onBoundsChangeRef.current?.({
        west: b.getWest(),
        south: b.getSouth(),
        east: b.getEast(),
        north: b.getNorth(),
      });
    });

    map.on("contextmenu", () => {
      if (drawModeRef.current !== "none") {
        finishDrawRef.current();
      }
    });

    mapRef.current = map;

    if (enableGps && "geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (!gpsMarkerRef.current) {
            const el = document.createElement("div");
            el.style.cssText =
              "width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid #fff;box-shadow:0 0 6px rgba(59,130,246,0.6);";
            gpsMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([longitude, latitude])
              .addTo(map);
          } else {
            gpsMarkerRef.current.setLngLat([longitude, latitude]);
          }
          onGpsRef.current?.(latitude, longitude);
        },
        (err) => console.warn("GPS unavailable:", err.message),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
      watchIdRef.current = id;
    }

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
      gpsMarkerRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Manual polylines use `polylineColor`; AI roof lines use `roofLineType` (matches estimator legend). */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty("draw-line", "line-color", [
      "case",
      ["has", "roofLineType"],
      [
        "match",
        ["get", "roofLineType"],
        "ridge",
        "#ef4444",
        "hip",
        "#f97316",
        "valley",
        "#22c55e",
        "eave",
        "#3b82f6",
        "rake",
        "#a855f7",
        "wall-flashing",
        "#eab308",
        "step-flashing",
        "#06b6d4",
        "#888888",
      ],
      polylineColor,
    ]);
    map.setPaintProperty("draw-line", "line-width", [
      "case",
      ["has", "roofLineType"],
      5,
      3,
    ]);
  }, [ready, polylineColor]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const removeArcgisServerTiles = () => {
      try {
        if (map.getLayer("arcgis-server-overlay")) map.removeLayer("arcgis-server-overlay");
        if (map.getSource("arcgis-server-overlay")) map.removeSource("arcgis-server-overlay");
      } catch {
        /* style may be rebuilding */
      }
    };

    removeArcgisServerTiles();

    const raw = arcgisServerTileUrl?.trim();
    if (!raw || !/^https?:\/\//i.test(raw)) return;

    try {
      map.addSource("arcgis-server-overlay", {
        type: "raster",
        tiles: [raw],
        tileSize: 256,
        attribution: arcgisServerTileAttribution?.trim() || "",
        maxzoom: 22,
      });
      const beforeId = map.getLayer("labels-layer") ? "labels-layer" : undefined;
      map.addLayer(
        {
          id: "arcgis-server-overlay",
          type: "raster",
          source: "arcgis-server-overlay",
          paint: {
            "raster-opacity": Math.min(1, Math.max(0.05, arcgisServerTileOpacity ?? 0.55)),
          },
        },
        beforeId,
      );
    } catch (e) {
      console.warn("ArcGIS MapServer tile layer failed:", e instanceof Error ? e.message : e);
    }

    return () => {
      removeArcgisServerTiles();
    };
  }, [ready, arcgisServerTileUrl, arcgisServerTileOpacity, arcgisServerTileAttribution]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("arcgis-overlay") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(parcelOverlay ?? { type: "FeatureCollection", features: [] });
    }
  }, [parcelOverlay, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("building-overlay") as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(buildingFootprintOverlay ?? { type: "FeatureCollection", features: [] });
    }
  }, [buildingFootprintOverlay, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (center) {
      map.flyTo({ center: [center.lng, center.lat], duration: 800 });
    }
  }, [center?.lat, center?.lng, ready]);

  /** Flex / mobile layouts often report 0×0 until after paint — MapLibre needs resize() to render tiles and accept clicks. */
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !ready || !el) return;
    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);
    requestAnimationFrame(() => map.resize());
    return () => ro.disconnect();
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    if (!points?.length) return;
    for (const pt of points) {
      const el = document.createElement("div");
      el.style.cssText = `width:14px;height:14px;border-radius:50%;background:${pt.color || "#ef4444"};border:2px solid #fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.5);`;
      el.title = pt.label || "";
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map);
      if (pt.label) {
        marker.setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setText(pt.label));
      }
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onPointClickRef.current?.(pt.id);
      });
      markersRef.current.push(marker);
    }
  }, [points, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.getCanvas().style.cursor = drawMode !== "none" ? "crosshair" : "";
  }, [drawMode, ready]);

  /** Long-press on map to finish polygon/line when double-tap is awkward on phones. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !enableDraw) return;
    const canvas = map.getCanvas();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    const onStart = () => {
      if (drawModeRef.current === "none" || drawModeRef.current === "auto-trace") return;
      clear();
      timer = setTimeout(() => {
        timer = null;
        finishDrawRef.current();
      }, 750);
    };
    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchend", clear);
    canvas.addEventListener("touchcancel", clear);
    canvas.addEventListener("touchmove", clear);
    return () => {
      clear();
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchend", clear);
      canvas.removeEventListener("touchcancel", clear);
      canvas.removeEventListener("touchmove", clear);
    };
  }, [ready, enableDraw]);

  // Outer wrapper must have real height: absolutely positioned children do not stretch the parent.
  // Canvassing (and other full-bleed layouts) pass height="100%" + absolute inset — without h-full here the map is 0×0.
  const rootStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    minHeight: 0,
    ...(typeof height === "number"
      ? { height }
      : { height: "100%", flex: "1 1 0%" }),
  };

  return (
    <div style={rootStyle}>
      <div
        ref={containerRef}
        className={className}
        style={{ height: typeof height === "number" ? "100%" : height, width: "100%", ...styleProp }}
      />
      {enableDraw ? (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 8,
            maxWidth: "min(220px, 46vw)",
            pointerEvents: "none",
          }}
        >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: "rgba(255,255,255,0.96)",
            borderRadius: 10,
            padding: 8,
            border: "1px solid rgba(15,23,42,0.12)",
            boxShadow: "0 4px 18px rgba(15,23,42,0.12)",
            backdropFilter: "blur(8px)",
            pointerEvents: "auto",
          }}
        >
          {showViewControls ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 4,
                marginBottom: 4,
                paddingBottom: 6,
                borderBottom: "1px solid rgba(15,23,42,0.1)",
              }}
            >
              <button
                type="button"
                title="Fly to property pin"
                onClick={() => {
                  const m = mapRef.current;
                  if (!m) return;
                  const pts = pointsRef.current;
                  const c = centerRef.current;
                  const z = Math.max(17, zoomRef.current ?? 18);
                  if (pts?.length) {
                    const p = pts[0];
                    m.flyTo({ center: [p.lng, p.lat], zoom: z, duration: 800 });
                  } else if (c) m.flyTo({ center: [c.lng, c.lat], zoom: z, duration: 800 });
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background: "#fff",
                  fontWeight: 600,
                }}
              >
                Recenter
              </button>
              <button
                type="button"
                title="Top-down (easier tracing)"
                onClick={() => mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 550 })}
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background: "#fff",
                  fontWeight: 600,
                }}
              >
                2D
              </button>
              <button
                type="button"
                title="Oblique 3D view"
                onClick={() => mapRef.current?.easeTo({ pitch: 60, bearing: -20, duration: 550 })}
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background: "#fff",
                  fontWeight: 600,
                }}
              >
                3D
              </button>
              <button
                type="button"
                title="Zoom in"
                onClick={() => mapRef.current?.zoomIn({ duration: 220 })}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background: "#fff",
                  fontWeight: 700,
                }}
              >
                +
              </button>
              <button
                type="button"
                title="Zoom out"
                onClick={() => mapRef.current?.zoomOut({ duration: 220 })}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background: "#fff",
                  fontWeight: 700,
                }}
              >
                −
              </button>
              <button
                type="button"
                title="Reset north (compass)"
                onClick={() => mapRef.current?.easeTo({ bearing: 0, duration: 400 })}
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  borderRadius: 4,
                  border: "1px solid #cbd5e1",
                  cursor: "pointer",
                  background: "#fff",
                  fontWeight: 700,
                }}
              >
                N
              </button>
            </div>
          ) : null}
          <button
            type="button"
            disabled={autoTraceBusy}
            onClick={() => {
              if (drawMode === "auto-trace") {
                clearSketchOnly();
                setDrawMode("none");
              } else {
                clearDraw();
                setDrawMode("auto-trace");
              }
            }}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: "none",
              cursor: autoTraceBusy ? "wait" : "pointer",
              background: drawMode === "auto-trace" ? "#22c55e" : "#e2e8f0",
              color: drawMode === "auto-trace" ? "#ffffff" : "#0f172a",
              fontWeight: 600,
            }}
          >
            {autoTraceBusy ? "Detecting..." : drawMode === "auto-trace" ? "Click Roof to Trace" : "Auto Trace (AI)"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (drawMode === "polygon") {
                clearSketchOnly();
                setDrawMode("none");
              } else {
                clearSketchOnly();
                setDrawMode("polygon");
              }
            }}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: drawMode === "polygon" ? "#3b82f6" : "#e2e8f0",
              color: drawMode === "polygon" ? "#ffffff" : "#0f172a",
              fontWeight: 600,
            }}
          >
            {drawMode === "polygon" ? "Drawing Roof..." : "Manual Trace"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (drawMode === "polyline") {
                clearSketchOnly();
                setDrawMode("none");
              } else {
                clearSketchOnly();
                setDrawMode("polyline");
              }
            }}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: drawMode === "polyline" ? polylineColor : "#e2e8f0",
              color: drawMode === "polyline" ? "#ffffff" : "#0f172a",
              fontWeight: 600,
            }}
          >
            {drawMode === "polyline" ? "Drawing Line..." : "Measure Line"}
          </button>
          {drawMode !== "none" ? (
            <>
              <p style={{ margin: 0, fontSize: 9, lineHeight: 1.35, color: "#475569", fontWeight: 500 }}>
                {drawMode === "auto-trace"
                  ? "Tap the roof. Other modes: use Finish, double-click, right-click, or hold finger ~1s on the map."
                  : "Finish line/roof: tap Finish, double-click map, right-click, or hold ~1s on map (phones)."}
              </p>
              <button
                type="button"
                onClick={undoLastPoint}
                style={{
                  padding: "6px 12px", fontSize: 11, borderRadius: 6,
                  border: "1px solid #f59e0b", cursor: "pointer",
                  background: "transparent", color: "#f59e0b", fontWeight: 600,
                }}
              >
                Undo Point
              </button>
              <button
                type="button"
                onClick={finishDraw}
                style={{
                  padding: "6px 12px", fontSize: 11, borderRadius: 6,
                  border: "2px solid #22c55e", cursor: "pointer",
                  background: "#ecfdf5", color: "#15803d", fontWeight: 700,
                }}
              >
                Finish
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSketchOnly();
                  setDrawMode("none");
                }}
                style={{
                  padding: "6px 12px", fontSize: 11, borderRadius: 6,
                  border: "1px solid #ef4444", cursor: "pointer",
                  background: "transparent", color: "#ef4444", fontWeight: 600,
                }}
              >
                Cancel
              </button>
            </>
          ) : null}
          {drawMode === "none" && (hasPersistedDraw || drawPointsRef.current.length > 0) ? (
            <button
              type="button"
              onClick={clearDraw}
              style={{
                padding: "6px 12px", fontSize: 11, borderRadius: 6,
                border: "1px solid #ef4444", cursor: "pointer",
                background: "transparent", color: "#ef4444", fontWeight: 600,
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        </div>
      ) : null}
      {drawInfo ? (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 6,
            pointerEvents: "none",
            background: "rgba(255,255,255,0.95)",
            color: "#0f172a",
            border: "1px solid rgba(15,23,42,0.12)",
            padding: "8px 14px",
            borderRadius: 16,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "normal",
            maxWidth: "min(560px, 92vw)",
            textAlign: "center",
            lineHeight: 1.35,
            backdropFilter: "blur(8px)",
            boxShadow: "0 4px 20px rgba(15,23,42,0.15)",
          }}
        >
          {drawInfo}
        </div>
      ) : null}
    </div>
  );
});
