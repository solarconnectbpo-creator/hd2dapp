import { useEffect, useRef, useState } from "react";
import L from "../lib/leafletGlobal";

/** Lazy-load Leaflet.draw only when drawing is enabled (Contacts map does not need it). */
async function ensureLeafletDraw(): Promise<typeof L> {
  const g = globalThis as typeof globalThis & { L?: typeof L };
  g.L = L;
  await import("leaflet-draw");
  await import("leaflet-draw/dist/leaflet.draw.css");
  return L;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/** Keep tile URLs in one object so minifiers do not collide short names with React state. */
const MAP_TILES = {
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  satelliteAttr: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
  street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  streetAttr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  labels: "https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png",
} as const;

export type FallbackMapPoint = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: string;
};

type Props = {
  center?: { lat: number; lng: number };
  zoom?: number;
  points?: FallbackMapPoint[];
  height?: number | string;
  enableDraw?: boolean;
  enableGps?: boolean;
  polylineColor?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onPointClick?: (id: string) => void;
  onMoveEnd?: (lat: number, lng: number) => void;
  onPolygonDrawn?: (feature: GeoJSON.Feature<GeoJSON.Polygon>) => void;
  onPolylineDrawn?: (feature: GeoJSON.Feature<GeoJSON.LineString>) => void;
  onFeaturesCleared?: () => void;
  onGpsUpdate?: (lat: number, lng: number) => void;
  className?: string;
  style?: React.CSSProperties;
};

function layerToGeoJsonFeature(layer: L.Layer): GeoJSON.Feature | null {
  if (typeof (layer as any).toGeoJSON !== "function") return null;
  return (layer as any).toGeoJSON() as GeoJSON.Feature;
}

export function FallbackMap({
  center,
  zoom = 13,
  points,
  height = 520,
  enableDraw = false,
  enableGps = false,
  polylineColor = "#ef4444",
  onMapClick,
  onPointClick,
  onMoveEnd,
  onPolygonDrawn,
  onPolylineDrawn,
  onFeaturesCleared,
  onGpsUpdate,
  className,
  style,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  const drawControlRef = useRef<L.Control.Draw | null>(null);
  const gpsMarkerRef = useRef<L.CircleMarker | null>(null);
  const gpsAccuracyRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  const onPolygonRef = useRef(onPolygonDrawn);
  const onPolylineRef = useRef(onPolylineDrawn);
  const onClearedRef = useRef(onFeaturesCleared);
  const onGpsRef = useRef(onGpsUpdate);
  useEffect(() => {
    onPolygonRef.current = onPolygonDrawn;
  }, [onPolygonDrawn]);
  useEffect(() => {
    onPolylineRef.current = onPolylineDrawn;
  }, [onPolylineDrawn]);
  useEffect(() => {
    onClearedRef.current = onFeaturesCleared;
  }, [onFeaturesCleared]);
  useEffect(() => {
    onGpsRef.current = onGpsUpdate;
  }, [onGpsUpdate]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;
    const lat = center?.lat ?? 39.8283;
    const lng = center?.lng ?? -98.5795;
    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom,
      zoomControl: true,
      attributionControl: true,
      maxZoom: 20,
    });

    const satelliteLayer = L.tileLayer(MAP_TILES.satellite, {
      maxZoom: 20,
      attribution: MAP_TILES.satelliteAttr,
    });
    const streetLayer = L.tileLayer(MAP_TILES.street, {
      maxZoom: 19,
      attribution: MAP_TILES.streetAttr,
    });
    const labelsLayer = L.tileLayer(MAP_TILES.labels, {
      maxZoom: 19,
      attribution: "",
    });

    satelliteLayer.addTo(map);

    L.control
      .layers(
        { Satellite: satelliteLayer, Street: streetLayer },
        { Labels: labelsLayer },
        { position: "topleft", collapsed: true },
      )
      .addTo(map);

    const lg = L.layerGroup().addTo(map);
    markersRef.current = lg;
    mapRef.current = map;

    const setupDraw = async () => {
      if (!enableDraw || cancelled) return;
      await ensureLeafletDraw();
      if (cancelled || !mapRef.current) return;

      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);
      drawnRef.current = drawnItems;

      const drawControl = new L.Control.Draw({
        position: "topright",
        draw: {
          polygon: {
            allowIntersection: false,
            shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.15 },
          },
          polyline: {
            shapeOptions: { color: polylineColor, weight: 3 },
          },
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
        },
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });
      map.addControl(drawControl);
      drawControlRef.current = drawControl;

      map.on(L.Draw.Event.CREATED, (e: any) => {
        const layer = e.layer as L.Layer;
        drawnItems.addLayer(layer);
        const feat = layerToGeoJsonFeature(layer);
        if (!feat) return;
        if (feat.geometry.type === "Polygon" && onPolygonRef.current) {
          onPolygonRef.current(feat as GeoJSON.Feature<GeoJSON.Polygon>);
        } else if (feat.geometry.type === "LineString" && onPolylineRef.current) {
          onPolylineRef.current(feat as GeoJSON.Feature<GeoJSON.LineString>);
        }
      });

      map.on(L.Draw.Event.EDITED, () => {
        const layers = drawnItems.getLayers();
        let hasPolygon = false;
        for (const layer of layers) {
          const feat = layerToGeoJsonFeature(layer);
          if (feat?.geometry.type === "Polygon" && onPolygonRef.current) {
            onPolygonRef.current(feat as GeoJSON.Feature<GeoJSON.Polygon>);
            hasPolygon = true;
          }
        }
        if (!hasPolygon && onClearedRef.current) onClearedRef.current();
      });

      map.on(L.Draw.Event.DELETED, () => {
        const layers = drawnItems.getLayers();
        if (layers.length === 0 && onClearedRef.current) {
          onClearedRef.current();
        } else {
          let hasPolygon = false;
          for (const layer of layers) {
            const feat = layerToGeoJsonFeature(layer);
            if (feat?.geometry.type === "Polygon" && onPolygonRef.current) {
              onPolygonRef.current(feat as GeoJSON.Feature<GeoJSON.Polygon>);
              hasPolygon = true;
            }
          }
          if (!hasPolygon && onClearedRef.current) onClearedRef.current();
        }
      });
    };

    void setupDraw();

    if (enableGps && "geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          if (!gpsMarkerRef.current) {
            gpsMarkerRef.current = L.circleMarker([latitude, longitude], {
              radius: 8,
              color: "#fff",
              weight: 2,
              fillColor: "#3b82f6",
              fillOpacity: 1,
            }).addTo(map);
            gpsMarkerRef.current.bindTooltip("You are here");
          } else {
            gpsMarkerRef.current.setLatLng([latitude, longitude]);
          }
          if (!gpsAccuracyRef.current) {
            gpsAccuracyRef.current = L.circle([latitude, longitude], {
              radius: accuracy,
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.08,
              weight: 1,
            }).addTo(map);
          } else {
            gpsAccuracyRef.current.setLatLng([latitude, longitude]);
            gpsAccuracyRef.current.setRadius(accuracy);
          }
          onGpsRef.current?.(latitude, longitude);
        },
        (err) => {
          console.warn("GPS unavailable:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
      );
      watchIdRef.current = id;
    }

    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }
    if (onMoveEnd) {
      map.on("moveend", () => {
        const c = map.getCenter();
        onMoveEnd(c.lat, c.lng);
      });
    }

    setReady(true);

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
      drawnRef.current = null;
      drawControlRef.current = null;
      gpsMarkerRef.current = null;
      gpsAccuracyRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center?.lat, center?.lng, ready]);

  useEffect(() => {
    const lg = markersRef.current;
    if (!lg || !ready) return;
    lg.clearLayers();
    if (!points?.length) return;
    for (const pt of points) {
      const marker = L.marker([pt.lat, pt.lng]);
      if (pt.label) marker.bindTooltip(pt.label);
      if (onPointClick) {
        marker.on("click", () => onPointClick(pt.id));
      }
      lg.addLayer(marker);
    }
  }, [points, ready, onPointClick]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height, width: "100%", ...style }}
    />
  );
}

export function useFallbackMapCenter() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 39.8283,
    lng: -98.5795,
  });
  return { center, setCenter };
}
