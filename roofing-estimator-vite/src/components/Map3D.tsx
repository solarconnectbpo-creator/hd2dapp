import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getHd2dApiBase } from "../lib/hd2dApiBase";

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
  onMapClick?: (lat: number, lng: number) => void;
  onPointClick?: (id: string) => void;
  onMoveEnd?: (lat: number, lng: number) => void;
  onGpsUpdate?: (lat: number, lng: number) => void;
  onPolygonDrawn?: (feature: GeoJSON.Feature<GeoJSON.Polygon>) => void;
  onPolylineDrawn?: (feature: GeoJSON.Feature<GeoJSON.LineString>) => void;
  onFeaturesCleared?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

function feetLabel(meters: number): string {
  const ft = meters * 3.28084;
  return ft >= 1000 ? `${(ft / 1000).toFixed(1)}k ft` : `${Math.round(ft)} ft`;
}

function sqFtLabel(sqMeters: number): string {
  const sqFt = sqMeters * 10.7639;
  return sqFt >= 10000 ? `${(sqFt / 1000).toFixed(1)}k sq ft` : `${Math.round(sqFt)} sq ft`;
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

function ringAreaM2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;
  const toR = (d: number) => (d * Math.PI) / 180;
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    area += toR(ring[j][0] - ring[i][0]) * (2 + Math.sin(toR(ring[i][1])) + Math.sin(toR(ring[j][1])));
  }
  return Math.abs((area * 6371000 * 6371000) / 2);
}

function perimeterM(ring: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    total += haversineM(ring[i], ring[i + 1]);
  }
  return total;
}

export function Map3D({
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
  onGpsUpdate,
  onPolygonDrawn,
  onPolylineDrawn,
  onFeaturesCleared,
  className,
  style: styleProp,
}: Props) {
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

  const onClickRef = useRef(onMapClick);
  const onPointClickRef = useRef(onPointClick);
  const onMoveEndRef = useRef(onMoveEnd);
  const onGpsRef = useRef(onGpsUpdate);
  const onPolygonRef = useRef(onPolygonDrawn);
  const onPolylineRef = useRef(onPolylineDrawn);
  const onClearedRef = useRef(onFeaturesCleared);
  const drawModeRef = useRef(drawMode);
  const polylineColorRef = useRef(polylineColor);
  useEffect(() => { onClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onPointClickRef.current = onPointClick; }, [onPointClick]);
  useEffect(() => { onMoveEndRef.current = onMoveEnd; }, [onMoveEnd]);
  useEffect(() => { onGpsRef.current = onGpsUpdate; }, [onGpsUpdate]);
  useEffect(() => { onPolygonRef.current = onPolygonDrawn; }, [onPolygonDrawn]);
  useEffect(() => { onPolylineRef.current = onPolylineDrawn; }, [onPolylineDrawn]);
  useEffect(() => { onClearedRef.current = onFeaturesCleared; }, [onFeaturesCleared]);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { polylineColorRef.current = polylineColor; }, [polylineColor]);

  const updateDrawSource = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts = drawPointsRef.current;
    const mode = drawModeRef.current;
    const src = map.getSource("draw-source") as maplibregl.GeoJSONSource | undefined;
    const labelSrc = map.getSource("draw-labels") as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features: GeoJSON.Feature[] = [];
    const labels: GeoJSON.Feature[] = [];

    if (pts.length >= 2) {
      const coords = mode === "polygon" && pts.length >= 3 ? [...pts, pts[0]] : pts;
      if (mode === "polygon" && pts.length >= 3) {
        features.push({
          type: "Feature",
          properties: { kind: "polygon" },
          geometry: { type: "Polygon", coordinates: [coords] },
        });
      }
      features.push({
        type: "Feature",
        properties: { kind: "line" },
        geometry: { type: "LineString", coordinates: coords },
      });

      for (let i = 0; i < coords.length - 1; i++) {
        const dist = haversineM(coords[i], coords[i + 1]);
        const mid = midpoint(coords[i], coords[i + 1]);
        labels.push({
          type: "Feature",
          properties: { label: feetLabel(dist) },
          geometry: { type: "Point", coordinates: mid },
        });
      }
    }
    for (const pt of pts) {
      features.push({
        type: "Feature",
        properties: { kind: "vertex" },
        geometry: { type: "Point", coordinates: pt },
      });
    }
    src.setData({ type: "FeatureCollection", features });
    labelSrc?.setData({ type: "FeatureCollection", features: labels });

    if (mode === "polygon" && pts.length >= 3) {
      const area = ringAreaM2(pts);
      const perim = perimeterM([...pts, pts[0]]);
      setDrawInfo(`Area: ${sqFtLabel(area)} | Perimeter: ${feetLabel(perim)}`);
    } else if (pts.length >= 2) {
      const total = perimeterM(pts);
      setDrawInfo(`Length: ${feetLabel(total)}`);
    } else {
      setDrawInfo(pts.length === 1 ? "Click next point..." : "");
    }
  }, []);

  const clearDraw = useCallback(() => {
    drawPointsRef.current = [];
    for (const m of drawMarkersRef.current) m.remove();
    drawMarkersRef.current = [];
    setDrawInfo("");
    updateDrawSource();
    onClearedRef.current?.();
  }, [updateDrawSource]);

  const undoLastPoint = useCallback(() => {
    if (drawPointsRef.current.length > 0) {
      drawPointsRef.current.pop();
      updateDrawSource();
    }
  }, [updateDrawSource]);

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
      onPolygonRef.current?.(feature);

      const map = mapRef.current;
      if (map) {
        const area = ringAreaM2(pts);
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
                properties: { label: sqFtLabel(area) },
                geometry: { type: "Point", coordinates: centroid },
              },
            ],
          });
        }
      }
    } else if (mode === "polyline" && pts.length >= 2) {
      const feature: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [...pts] },
      };
      onPolylineRef.current?.(feature);
    }
    setDrawMode("none");
  }, []);

  const runAutoTrace = useCallback(async (_clickLngLat: { lng: number; lat: number }, clickPoint: { x: number; y: number }) => {
    const map = mapRef.current;
    if (!map || autoTraceBusy) return;
    setAutoTraceBusy(true);
    setDrawInfo("AI detecting roof...");
    try {
      const canvas = map.getCanvas();
      const cropSize = 512;
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
      const dataUrl = offscreen.toDataURL("image/jpeg", 0.92);
      const b64 = dataUrl.split(",")[1];

      const relX = cx - x0;
      const relY = cy - y0;

      const topLeft = map.unproject([x0, y0]);
      const bottomRight = map.unproject([x1, y1]);

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
      const data = await res.json() as {
        success?: boolean;
        polygon?: [number, number][];
        areaPx?: number;
        confidence?: number;
        imageWidth?: number;
        imageHeight?: number;
        error?: string;
      };
      if (!data.success || !data.polygon?.length) {
        setDrawInfo(data.error || "No roof detected at click point. Try clicking directly on the roof.");
        return;
      }

      const imgW = data.imageWidth || w;
      const imgH = data.imageHeight || h;
      const lngRange = bottomRight.lng - topLeft.lng;
      const latRange = topLeft.lat - bottomRight.lat;

      const geoRing: [number, number][] = data.polygon.map(([px, py]) => [
        topLeft.lng + (px / imgW) * lngRange,
        topLeft.lat - (py / imgH) * latRange,
      ]);
      if (geoRing.length >= 3 && (geoRing[0][0] !== geoRing[geoRing.length - 1][0] || geoRing[0][1] !== geoRing[geoRing.length - 1][1])) {
        geoRing.push(geoRing[0]);
      }

      const feature: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [geoRing] },
      };

      const src = map.getSource("draw-source") as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData({
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { kind: "polygon" }, geometry: feature.geometry },
            { type: "Feature", properties: { kind: "line" }, geometry: { type: "LineString", coordinates: geoRing } },
            ...geoRing.slice(0, -1).map((pt) => ({
              type: "Feature" as const,
              properties: { kind: "vertex" },
              geometry: { type: "Point" as const, coordinates: pt },
            })),
          ],
        });
      }

      const labelSrc = map.getSource("draw-labels") as maplibregl.GeoJSONSource | undefined;
      if (labelSrc) {
        const labels: GeoJSON.Feature[] = [];
        for (let i = 0; i < geoRing.length - 1; i++) {
          const dist = haversineM(geoRing[i], geoRing[i + 1]);
          const mid = midpoint(geoRing[i], geoRing[i + 1]);
          labels.push({
            type: "Feature",
            properties: { label: feetLabel(dist) },
            geometry: { type: "Point", coordinates: mid },
          });
        }
        labelSrc.setData({ type: "FeatureCollection", features: labels });
      }

      const conf = data.confidence ? `${Math.round(data.confidence * 100)}%` : "";
      setDrawInfo(`Roof detected${conf ? ` (${conf} confidence)` : ""} — click Apply to use measurements`);
      onPolygonRef.current?.(feature);
    } catch (e) {
      console.error("Auto-trace failed:", e);
      setDrawInfo(e instanceof Error ? `Auto-trace failed: ${e.message}` : "Auto-trace failed");
    } finally {
      setAutoTraceBusy(false);
      setDrawMode("none");
    }
  }, [autoTraceBusy]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const lat = center?.lat ?? 39.8283;
    const lng = center?.lng ?? -98.5795;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
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
          { id: "satellite-layer", type: "raster", source: "esri-sat", paint: {} },
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
        filter: ["==", ["get", "kind"], "polygon"],
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
          "text-color": "#ffffff",
          "text-halo-color": "#000000",
          "text-halo-width": 2,
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
          "text-color": "#ffff00",
          "text-halo-color": "#000000",
          "text-halo-width": 2.5,
        },
      });
      setReady(true);
    });

    map.on("click", (e) => {
      const mode = drawModeRef.current;
      if (mode === "auto-trace") {
        void runAutoTrace(e.lngLat, e.point);
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
        updateDrawSource();
        return;
      }
      onClickRef.current?.(e.lngLat.lat, e.lngLat.lng);
    });

    map.on("dblclick", (e) => {
      if (drawModeRef.current !== "none") {
        e.preventDefault();
        finishDraw();
      }
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      onMoveEndRef.current?.(c.lat, c.lng);
    });

    map.on("contextmenu", () => {
      if (drawModeRef.current !== "none") {
        finishDraw();
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (center) {
      map.flyTo({ center: [center.lng, center.lat], duration: 800 });
    }
  }, [center?.lat, center?.lng, ready]);

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

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={containerRef}
        className={className}
        style={{ height, width: "100%", ...styleProp }}
      />
      {enableDraw ? (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            background: "rgba(0,0,0,0.82)",
            borderRadius: 10,
            padding: 8,
            backdropFilter: "blur(6px)",
          }}
        >
          <button
            type="button"
            disabled={autoTraceBusy}
            onClick={() => { clearDraw(); setDrawMode(drawMode === "auto-trace" ? "none" : "auto-trace"); }}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: "none",
              cursor: autoTraceBusy ? "wait" : "pointer",
              background: drawMode === "auto-trace" ? "#22c55e" : "#444",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {autoTraceBusy ? "Detecting..." : drawMode === "auto-trace" ? "Click Roof to Trace" : "Auto Trace (AI)"}
          </button>
          <button
            type="button"
            onClick={() => { clearDraw(); setDrawMode(drawMode === "polygon" ? "none" : "polygon"); }}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: drawMode === "polygon" ? "#3b82f6" : "#444",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {drawMode === "polygon" ? "Drawing Roof..." : "Manual Trace"}
          </button>
          <button
            type="button"
            onClick={() => { clearDraw(); setDrawMode(drawMode === "polyline" ? "none" : "polyline"); }}
            style={{
              padding: "7px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: drawMode === "polyline" ? polylineColor : "#444",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            {drawMode === "polyline" ? "Drawing Line..." : "Measure Line"}
          </button>
          {drawMode !== "none" ? (
            <>
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
                  border: "1px solid #22c55e", cursor: "pointer",
                  background: "transparent", color: "#22c55e", fontWeight: 600,
                }}
              >
                Finish
              </button>
              <button
                type="button"
                onClick={() => { clearDraw(); setDrawMode("none"); }}
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
          {drawMode === "none" && drawPointsRef.current.length > 0 ? (
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
      ) : null}
      {drawInfo ? (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 24,
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
            backdropFilter: "blur(6px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
          }}
        >
          {drawInfo}
        </div>
      ) : null}
    </div>
  );
}
