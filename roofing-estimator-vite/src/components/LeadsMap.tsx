import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ContactRecord } from "../lib/contactsCsv";
import { loadEmbeddedExplorerScript, type EmbeddedExplorerMapHandle } from "../lib/embeddedExplorer";
import { getEagleViewEmbeddedAuthToken } from "../lib/eagleViewEmbeddedAuth";
import { useMapProvider } from "../lib/useMapProvider";
import { FallbackMap, type FallbackMapPoint } from "./FallbackMap";

type Props = {
  contacts: ContactRecord[];
  selectedId: string | null;
  onSelectContact: (id: string) => void;
  onOpenContact?: (id: string) => void;
};

export function LeadsMap({ contacts, selectedId, onSelectContact, onOpenContact }: Props) {
  const mapProvider = useMapProvider();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<EmbeddedExplorerMapHandle | null>(null);
  const withCoordsRef = useRef<ContactRecord[]>([]);
  const [eeReady, setEeReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [eeId] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `ee-leads-${crypto.randomUUID().replace(/-/g, "")}`
      : `ee-leads-${Date.now()}`,
  );

  const withCoords = useMemo(
    () =>
      contacts.filter(
        (c) => typeof c.lat === "number" && typeof c.lng === "number" && !Number.isNaN(c.lat) && !Number.isNaN(c.lng),
      ),
    [contacts],
  );
  withCoordsRef.current = withCoords;

  const points = useMemo(() => withCoords.map((c) => [c.lat!, c.lng!] as [number, number]), [withCoords]);

  const onSelectRef = useRef(onSelectContact);
  useEffect(() => {
    onSelectRef.current = onSelectContact;
  }, [onSelectContact]);

  useLayoutEffect(() => {
    if (mapProvider !== "eagleview") return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    let disposed = false;
    const el = containerRef.current;
    el.id = eeId;
    setMapError("");

    void (async () => {
      try {
        await loadEmbeddedExplorerScript();
        if (disposed || !containerRef.current) return;
        const Ev = window.ev?.EmbeddedExplorer;
        if (!Ev) return;

        const wc = withCoordsRef.current;
        const lat = wc[0]?.lat ?? 39.8283;
        const lon = wc[0]?.lng ?? -98.5795;
        const authToken = await getEagleViewEmbeddedAuthToken();
        const map = new Ev().mount(eeId, {
          authToken,
          view: { lonLat: { lon, lat, z: wc.length <= 1 ? 15 : 5 } },
        }) as EmbeddedExplorerMapHandle;
        mapRef.current = map;

        let once = false;
        const ready = () => {
          if (disposed || once) return;
          once = true;
          try {
            map.enableMeasurementPanel(false);
            map.enableSearchBar(true);
          } catch {
            /* ignore */
          }
          setEeReady(true);
        };

        map.on("onMapReady", ready);
        map.on("featureClick", (raw: unknown) => {
          const arr = Array.isArray(raw) ? raw : [];
          for (const item of arr) {
            const props = (item as GeoJSON.Feature).properties as Record<string, unknown> | undefined;
            if (props?.["__leadsMap"] != null && props["id"] != null) {
              onSelectRef.current(String(props["id"]));
              return;
            }
          }
        });
        map.on("Errors", (err: unknown) => {
          console.error("LeadsMap EagleView:", err);
        });
        window.setTimeout(() => {
          if (!disposed && !once) ready();
        }, 2500);
      } catch (e) {
        setMapError(e instanceof Error ? e.message : "Could not start EagleView map.");
      }
    })();

    return () => {
      disposed = true;
      setEeReady(false);
      try {
        mapRef.current?.off?.("onMapReady");
        mapRef.current?.off?.("featureClick");
        mapRef.current?.off?.("Errors");
      } catch {
        /* ignore */
      }
      mapRef.current = null;
      el.innerHTML = "";
      el.removeAttribute("id");
    };
  }, [eeId, mapProvider]);

  useEffect(() => {
    if (mapProvider !== "eagleview") return;
    const map = mapRef.current;
    if (!map?.addFeatures || !eeReady) return;
    try {
      map.removeFeatures?.({
        geoJson: (f) => Boolean((f.properties as Record<string, unknown> | undefined)?.__leadsMap),
      });
    } catch {
      /* ignore */
    }
    const feats: GeoJSON.Feature[] = withCoords.map((c) => ({
      type: "Feature",
      properties: {
        __leadsMap: true,
        id: c.id,
        name: c.name || "Lead",
        selected: c.id === selectedId,
      },
      geometry: { type: "Point", coordinates: [c.lng!, c.lat!] },
    }));
    if (feats.length) map.addFeatures({ geoJson: feats });

    if (points.length === 1) {
      map.setLonLat?.({ lat: points[0][0], lon: points[0][1], z: 16 });
    } else if (points.length > 1) {
      const avgLat = points.reduce((s, p) => s + p[0], 0) / points.length;
      const avgLon = points.reduce((s, p) => s + p[1], 0) / points.length;
      map.setLonLat?.({ lat: avgLat, lon: avgLon, z: 6 });
    }
  }, [withCoords, points, eeReady, selectedId, mapProvider]);

  const osmPoints = useMemo<FallbackMapPoint[]>(
    () =>
      withCoords.map((c) => ({
        id: c.id,
        lat: c.lat!,
        lng: c.lng!,
        label: c.name || "Lead",
      })),
    [withCoords],
  );

  const osmCenter = useMemo(() => {
    if (!withCoords.length) return { lat: 39.8283, lng: -98.5795 };
    const avgLat = withCoords.reduce((s, c) => s + c.lat!, 0) / withCoords.length;
    const avgLng = withCoords.reduce((s, c) => s + c.lng!, 0) / withCoords.length;
    return { lat: avgLat, lng: avgLng };
  }, [withCoords]);

  const handleOsmPointClick = useCallback(
    (id: string) => onSelectContact(id),
    [onSelectContact],
  );

  if (mapProvider === "checking") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-black">
        Loading map...
      </div>
    );
  }

  if (withCoords.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-black">
        No leads with map coordinates yet. Use &quot;Geocode addresses&quot; or ensure CSV includes latitude/longitude columns.
      </div>
    );
  }

  const selected = selectedId ? withCoords.find((c) => c.id === selectedId) : null;

  if (mapProvider === "osm-fallback") {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <FallbackMap
          center={osmCenter}
          zoom={withCoords.length <= 1 ? 15 : 5}
          points={osmPoints}
          height={380}
          enableGps
          onPointClick={handleOsmPointClick}
        />
        {selected ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-sm text-black">
            <div className="min-w-0">
              <div className="font-semibold truncate">{selected.name || "Lead"}</div>
              <div className="text-xs text-slate-600 truncate">
                {[selected.address, selected.city, selected.state, selected.zip].filter(Boolean).join(", ")}
              </div>
            </div>
            {onOpenContact ? (
              <button
                type="button"
                className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-black hover:bg-slate-50"
                onClick={() => onOpenContact(selected.id)}
              >
                Open in estimator
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-black">
        Leads map unavailable: {mapError}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
      <div ref={containerRef} style={{ height: 380, width: "100%" }} />
      {selected ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-sm text-black">
          <div className="min-w-0">
            <div className="font-semibold truncate">{selected.name || "Lead"}</div>
            <div className="text-xs text-slate-600 truncate">
              {[selected.address, selected.city, selected.state, selected.zip].filter(Boolean).join(", ")}
            </div>
          </div>
          {onOpenContact ? (
            <button
              type="button"
              className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs text-black hover:bg-slate-50"
              onClick={() => onOpenContact(selected.id)}
            >
              Open in estimator
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
