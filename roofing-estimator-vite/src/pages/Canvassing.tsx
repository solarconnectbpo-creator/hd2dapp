import "mapbox-gl/dist/mapbox-gl.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  FileJson,
  FileSpreadsheet,
  Layers,
  MapPin,
  Navigation,
  Ruler,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { parseContactsCsv, type ContactRecord } from "../lib/contactsCsv";
import { geocodeContactsMissing } from "../lib/geocodeContact";
import { parseLeadsFromGeoJson } from "../lib/canvassingGeoJson";
import { applyMapboxCspWorker } from "../lib/mapboxViteWorker";
import { fetchStlIntelAtPoint, isInMissouriBbox } from "../lib/canvassingIntel";
import {
  buildParcelHandoffNotes,
  extractOwnerFromParcel,
  extractParcelAutoFill,
  extractParcelIdFromParcel,
  extractSiteAddressFromParcel,
  debugLogParcelEnrichment,
  mergeParcelAttributes,
  parcelRowsForDisplay,
} from "../lib/canvassingParcelOwner";
import {
  type CanvassLeadState,
  type CanvassVisitStatus,
  loadCanvassLeads,
  loadCanvassStates,
  saveCanvassLeads,
  saveCanvassStates,
} from "../lib/canvassingStorage";
import {
  emptyPropertyImportPayload,
  inferStateCodeFromAddressLine,
  mapPropertyType,
  PENDING_PROPERTY_IMPORT_KEY,
  type PropertyImportPayload,
} from "../lib/propertyScraper";
import {
  fetchArcgisLayerAsGeoJson,
  normalizeArcgisFeatureLayerUrl,
  resolveArcgisApiKey,
  resolveArcgisFeatureLayerUrl,
} from "../lib/arcgisFeatureLayer";
import { loadOrgSettings } from "../lib/orgSettings";

const MAPBOX_TOKEN_KEY = "roofing-estimator-vite-mapbox-token-v1";
const LEADS_SOURCE_ID = "canvass-leads";
const LEADS_LAYER_ID = "canvass-leads-circles";
const ARCGIS_SOURCE_ID = "canvass-arcgis-overlay";
const ARCGIS_FILL_LAYER_ID = "canvass-arcgis-fill";
const ARCGIS_LINE_LAYER_ID = "canvass-arcgis-line";
const ARCGIS_POINT_LAYER_ID = "canvass-arcgis-points";

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function findNearestLead(
  leads: ContactRecord[],
  lat: number,
  lng: number,
  maxM = 45,
): ContactRecord | null {
  let best: ContactRecord | null = null;
  let bestD = Infinity;
  for (const c of leads) {
    if (c.lat == null || c.lng == null) continue;
    const d = haversineMeters(lat, lng, c.lat, c.lng);
    if (d < bestD && d <= maxM) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

function contactToImportBase(c: ContactRecord): PropertyImportPayload {
  const line = [c.address, c.city, c.state, c.zip].filter(Boolean).join(", ");
  const notesParts = [c.notes?.trim(), c.company?.trim() ? `Company (CSV): ${c.company.trim()}` : ""].filter(Boolean);
  return emptyPropertyImportPayload("csv-upload", {
    address: line,
    stateCode: (c.state || "").toUpperCase().slice(0, 2),
    latitude: c.lat != null ? String(c.lat) : "",
    longitude: c.lng != null ? String(c.lng) : "",
    ownerName: c.name || "",
    ownerPhone: c.phone || "",
    ownerEmail: c.email || "",
    notes: notesParts.join("\n"),
    areaSqFt: c.areaSqFt || "",
  } as Partial<PropertyImportPayload>);
}

const STATUS_RANK: Record<CanvassVisitStatus, number> = {
  new: 0,
  interested: 1,
  visited: 2,
  skip: 3,
};

export function Canvassing() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  /** Bumps when the map container DOM node attaches so layout effect can init Mapbox reliably. */
  const [mapContainerEl, setMapContainerEl] = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const styleLoadedRef = useRef(false);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const geoInputRef = useRef<HTMLInputElement | null>(null);

  const [mapboxToken, setMapboxToken] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(MAPBOX_TOKEN_KEY);
      if (saved?.trim()) return saved;
    }
    return import.meta.env.VITE_MAPBOX_TOKEN ?? "";
  });
  const [showTokenRow, setShowTokenRow] = useState(false);
  const [leads, setLeads] = useState<ContactRecord[]>(() => loadCanvassLeads());
  const [states, setStates] = useState<Record<string, CanvassLeadState>>(() => loadCanvassStates());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [panelBusy, setPanelBusy] = useState(false);
  const [panelHint, setPanelHint] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [ownerDisplay, setOwnerDisplay] = useState("");
  const [parcelIdDisplay, setParcelIdDisplay] = useState("");
  const [stlParcel, setStlParcel] = useState<Record<string, unknown> | null>(null);
  const [lastPayload, setLastPayload] = useState<PropertyImportPayload | null>(null);
  const [focusLatLng, setFocusLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [geoBusy, setGeoBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [mapInitError, setMapInitError] = useState("");
  const [arcgisBusy, setArcgisBusy] = useState(false);
  const [arcgisHint, setArcgisHint] = useState("");

  useEffect(() => {
    saveCanvassLeads(leads);
  }, [leads]);
  useEffect(() => {
    saveCanvassStates(states);
  }, [states]);
  useEffect(() => {
    if (!mapboxToken.trim()) {
      window.localStorage.removeItem(MAPBOX_TOKEN_KEY);
      return;
    }
    window.localStorage.setItem(MAPBOX_TOKEN_KEY, mapboxToken.trim());
  }, [mapboxToken]);

  const queue = useMemo(() => {
    return [...leads].sort((a, b) => {
      const sa = (states[a.id]?.status ?? "new") as CanvassVisitStatus;
      const sb = (states[b.id]?.status ?? "new") as CanvassVisitStatus;
      return STATUS_RANK[sa] - STATUS_RANK[sb];
    });
  }, [leads, states]);

  const selectedLead = useMemo(
    () => (selectedId ? leads.find((l) => l.id === selectedId) ?? null : null),
    [leads, selectedId],
  );

  const leadsGeoJson = useMemo(() => {
    const features = leads
      .filter((c) => c.lat != null && c.lng != null && Number.isFinite(c.lat) && Number.isFinite(c.lng))
      .map((c) => {
        const st = states[c.id]?.status ?? "new";
        return {
          type: "Feature" as const,
          properties: {
            id: c.id,
            status: st,
            label: c.name || c.address || "Lead",
          },
          geometry: {
            type: "Point" as const,
            coordinates: [c.lng!, c.lat!],
          },
        };
      });
    return { type: "FeatureCollection" as const, features };
  }, [leads, states]);

  const setVisitStatus = useCallback((leadId: string, status: CanvassVisitStatus) => {
    setStates((prev) => ({
      ...prev,
      [leadId]: {
        status,
        notes: prev[leadId]?.notes ?? "",
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const updateNotes = useCallback((leadId: string, notes: string) => {
    setStates((prev) => ({
      ...prev,
      [leadId]: {
        status: (prev[leadId]?.status ?? "new") as CanvassVisitStatus,
        notes,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const enrichAtLatLng = useCallback(
    async (lat: number, lng: number, pref?: ContactRecord | null, arcgisFeatureProps?: Record<string, unknown> | null) => {
      setPanelBusy(true);
      setPanelHint("");
      setAddressLine("");
      setOwnerDisplay("");
      setParcelIdDisplay("");
      setStlParcel(null);
      setLastPayload(null);
      setFocusLatLng({ lat, lng });
      setSheetOpen(true);
      try {
        const url =
          "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
          encodeURIComponent(String(lat)) +
          "&lon=" +
          encodeURIComponent(String(lng));
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Could not resolve address for this point.");
        const data = (await res.json()) as { display_name?: string };
        const line = data.display_name?.trim() || "";
        setAddressLine(line);

        let intelParcel: Record<string, unknown> | null = null;
        if (isInMissouriBbox(lat, lng)) {
          const stl = await fetchStlIntelAtPoint(lat, lng);
          intelParcel = stl?.parcel ?? null;
        }

        const parcel = mergeParcelAttributes(intelParcel, arcgisFeatureProps ?? null);
        setStlParcel(parcel);

        const auto = extractParcelAutoFill(parcel);
        debugLogParcelEnrichment({
          lat,
          lng,
          intelParcel,
          arcgisFeatureProps: arcgisFeatureProps ?? null,
          merged: parcel,
          autoFill: auto,
        });
        const owner = auto.ownerName || extractOwnerFromParcel(parcel);
        const siteFromParcel = extractSiteAddressFromParcel(parcel);
        const pid = extractParcelIdFromParcel(parcel);
        setOwnerDisplay(owner);
        setParcelIdDisplay(pid);

        const addrPrimary = siteFromParcel || line;
        const st = inferStateCodeFromAddressLine(addrPrimary);

        let base: PropertyImportPayload = pref
          ? contactToImportBase(pref)
          : emptyPropertyImportPayload("import", {
              address: addrPrimary,
              latitude: String(lat),
              longitude: String(lng),
            });

        const typeHint = parcel
          ? String(
              parcel.LAND_USE ??
                parcel.land_use ??
                parcel.PropClass ??
                parcel.prop_class ??
                parcel.CLASS ??
                parcel.class_desc ??
                parcel.ZONING ??
                parcel.Zoning ??
                "",
            ).trim()
          : "";

        const parcelNotes = parcel ? buildParcelHandoffNotes(parcel) : "";
        base = {
          ...base,
          latitude: String(lat),
          longitude: String(lng),
          address: addrPrimary || base.address,
          stateCode: st || base.stateCode,
          ownerName: owner.trim() || base.ownerName.trim(),
          ownerPhone: (auto.ownerPhone || base.ownerPhone).trim(),
          ownerEmail: (auto.ownerEmail || base.ownerEmail).trim(),
          ownerMailingAddress: (auto.ownerMailingAddress || base.ownerMailingAddress).trim(),
          areaSqFt: auto.areaSqFt || base.areaSqFt,
          yearBuilt: auto.yearBuilt || base.yearBuilt,
          lotSizeSqFt: auto.lotSizeSqFt || base.lotSizeSqFt,
          propertyType: typeHint ? mapPropertyType(typeHint) : base.propertyType,
          notes: [base.notes, parcelNotes].filter(Boolean).join("\n\n"),
        };

        if (pref) {
          base = {
            ...base,
            ownerName: base.ownerName.trim() || pref.name.trim(),
            ownerPhone: base.ownerPhone.trim() || pref.phone.trim(),
            ownerEmail: base.ownerEmail.trim() || pref.email.trim(),
            contactPersonName: base.contactPersonName.trim() || pref.name.trim(),
          };
        }

        setLastPayload(base);

        const fromGis = arcgisFeatureProps && Object.keys(arcgisFeatureProps).length > 0;
        const intelHit = intelParcel && Object.keys(intelParcel).length > 0;
        if (fromGis && owner && intelHit) {
          setPanelHint(
            "Owner and fields use Missouri parcel intel when present; map layer fills any gaps. Always confirm before quoting.",
          );
        } else if (fromGis && owner) {
          setPanelHint("Owner and property details pulled from the map layer you clicked. Verify before quoting.");
        } else if (fromGis && !owner) {
          setPanelHint("Map layer attributes loaded — owner name not in this layer; check parcel details.");
        } else if (intelHit && owner) {
          setPanelHint("Missouri parcel intel loaded. Confirm owner and building details on the assessor before quoting.");
        } else if (isInMissouriBbox(lat, lng) && !parcel) {
          setPanelHint("No parcel record at this pin — try the building center or a different spot.");
        } else if (!isInMissouriBbox(lat, lng) && !fromGis) {
          setPanelHint(
            "Owner lookup uses Missouri public parcel layers. Outside MO you still get the map address; verify owner locally.",
          );
        } else if (!owner) {
          setPanelHint("Parcel found — owner field not labeled on this layer; see details below.");
        }
      } catch (e) {
        setPanelHint(e instanceof Error ? e.message : "Lookup failed.");
        setAddressLine("");
      } finally {
        setPanelBusy(false);
      }
    },
    [],
  );

  const flyTo = useCallback((lat: number, lng: number, zoom = 17.5) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom, duration: 900 });
  }, []);

  const leadsRef = useRef(leads);
  const enrichRef = useRef(enrichAtLatLng);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);
  useEffect(() => {
    enrichRef.current = enrichAtLatLng;
  }, [enrichAtLatLng]);

  const syncArcgisLayer = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map || !styleLoadedRef.current) return;
    const org = loadOrgSettings();
    const layerUrl = resolveArcgisFeatureLayerUrl(org.arcgisFeatureLayerUrl);
    const normalized = normalizeArcgisFeatureLayerUrl(layerUrl);
    const src = map.getSource(ARCGIS_SOURCE_ID) as
      | { setData?: (d: GeoJSON.FeatureCollection) => void }
      | undefined;
    if (!normalized) {
      src?.setData?.({ type: "FeatureCollection", features: [] });
      setArcgisHint("");
      return;
    }
    const token = resolveArcgisApiKey(org.arcgisApiKey);
    setArcgisBusy(true);
    try {
      const fc = await fetchArcgisLayerAsGeoJson(layerUrl, { token: token || undefined });
      src?.setData?.(fc);
      setArcgisHint(`${fc.features.length} features from ArcGIS`);
    } catch (e) {
      setArcgisHint(e instanceof Error ? e.message : "ArcGIS layer failed");
    } finally {
      setArcgisBusy(false);
    }
  }, []);

  useEffect(() => {
    const onOrg = () => void syncArcgisLayer();
    window.addEventListener("roofing-org-updated", onOrg);
    return () => window.removeEventListener("roofing-org-updated", onOrg);
  }, [syncArcgisLayer]);

  useEffect(() => {
    if (!arcgisHint) return;
    const t = window.setTimeout(() => setArcgisHint(""), 8000);
    return () => window.clearTimeout(t);
  }, [arcgisHint]);

  useLayoutEffect(() => {
    if (!mapboxToken.trim()) {
      setMapInitError("");
      return;
    }
    if (!mapContainerEl) return;

    let disposed = false;
    styleLoadedRef.current = false;
    let resizeObserver: ResizeObserver | null = null;
    setMapInitError("");

    (async () => {
      try {
        const { default: mapboxgl } = await import("mapbox-gl");
        if (disposed || !mapRef.current) return;
        applyMapboxCspWorker(mapboxgl);
        mapboxgl.accessToken = mapboxToken.trim();

        const container = mapRef.current!;
        const map = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          center: [-90.2, 38.63],
          zoom: 11,
        });
        map.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
            trackUserLocation: true,
            showUserLocation: true,
            showAccuracyCircle: true,
          }),
          "top-right",
        );
        mapInstanceRef.current = map;

        const scheduleResize = () => {
          if (disposed) return;
          map.resize();
          requestAnimationFrame(() => {
            if (!disposed) map.resize();
          });
        };

        map.on("error", (e: { error?: Error }) => {
          const msg = e?.error?.message ?? "Map error";
          setMapInitError(msg);
        });

        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => scheduleResize());
          resizeObserver.observe(container);
        }

        queueMicrotask(() => scheduleResize());

      map.on("load", () => {
        if (disposed) return;
        scheduleResize();

        map.addSource(ARCGIS_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: ARCGIS_FILL_LAYER_ID,
          type: "fill",
          source: ARCGIS_SOURCE_ID,
          filter: ["match", ["geometry-type"], ["Polygon", "MultiPolygon"], true, false],
          paint: {
            "fill-color": "#2563eb",
            "fill-opacity": 0.14,
            "fill-outline-color": "#1e40af",
          },
        });
        map.addLayer({
          id: ARCGIS_LINE_LAYER_ID,
          type: "line",
          source: ARCGIS_SOURCE_ID,
          filter: ["match", ["geometry-type"], ["LineString", "MultiLineString"], true, false],
          paint: {
            "line-color": "#1e40af",
            "line-width": 2,
            "line-opacity": 0.65,
          },
        });
        map.addLayer({
          id: ARCGIS_POINT_LAYER_ID,
          type: "circle",
          source: ARCGIS_SOURCE_ID,
          filter: ["match", ["geometry-type"], ["Point", "MultiPoint"], true, false],
          paint: {
            "circle-radius": 5,
            "circle-color": "#1d4ed8",
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.addSource(LEADS_SOURCE_ID, {
          type: "geojson",
          data: leadsGeoJson,
        });
        map.addLayer({
          id: LEADS_LAYER_ID,
          type: "circle",
          source: LEADS_SOURCE_ID,
          paint: {
            "circle-radius": ["match", ["get", "status"], "visited", 7, "skip", 6, "interested", 9, 8],
            "circle-color": [
              "match",
              ["get", "status"],
              "visited",
              "#94a3b8",
              "skip",
              "#64748b",
              "interested",
              "#22c55e",
              "#3b82f6",
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        const arcgisLayerIds = [ARCGIS_FILL_LAYER_ID, ARCGIS_LINE_LAYER_ID, ARCGIS_POINT_LAYER_ID];

        map.on("click", LEADS_LAYER_ID, (e: any) => {
          const f = e.features?.[0];
          const id = f?.properties?.id as string | undefined;
          if (!id) return;
          setSelectedId(id);
          const lead = leadsRef.current.find((l) => l.id === id);
          if (lead?.lat != null && lead.lng != null) {
            const under = map.queryRenderedFeatures(e.point, { layers: arcgisLayerIds });
            const gis = (under?.[0]?.properties as Record<string, unknown> | undefined) ?? null;
            void enrichRef.current(lead.lat, lead.lng, lead, gis);
          }
        });

        map.on("click", (e: any) => {
          const feats = map.queryRenderedFeatures(e.point, { layers: [LEADS_LAYER_ID] });
          if (feats?.length) return;
          const gisFeats = map.queryRenderedFeatures(e.point, { layers: arcgisLayerIds });
          const gisProps = (gisFeats?.[0]?.properties as Record<string, unknown> | undefined) ?? null;
          const { lng, lat } = e.lngLat;
          const list = leadsRef.current;
          const near = findNearestLead(list, lat, lng);
          if (near?.lat != null && near.lng != null) {
            setSelectedId(near.id);
            void enrichRef.current(near.lat, near.lng, near, gisProps);
            return;
          }
          setSelectedId(null);
          void enrichRef.current(lat, lng, null, gisProps);
        });

        map.on("mouseenter", LEADS_LAYER_ID, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", LEADS_LAYER_ID, () => {
          map.getCanvas().style.cursor = "";
        });
        for (const lid of arcgisLayerIds) {
          map.on("mouseenter", lid, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", lid, () => {
            map.getCanvas().style.cursor = "";
          });
        }

        styleLoadedRef.current = true;
        map.once("idle", () => {
          if (!disposed) scheduleResize();
        });

        if (normalizeArcgisFeatureLayerUrl(resolveArcgisFeatureLayerUrl(loadOrgSettings().arcgisFeatureLayerUrl))) {
          queueMicrotask(() => {
            if (!disposed) void syncArcgisLayer();
          });
        }
      });
      } catch (e) {
        if (!disposed) {
          setMapInitError(e instanceof Error ? e.message : "Could not start map.");
        }
      }
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      resizeObserver = null;
      styleLoadedRef.current = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapboxToken, mapContainerEl, syncArcgisLayer]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !styleLoadedRef.current) return;
    const src = map.getSource(LEADS_SOURCE_ID) as any;
    if (src?.setData) src.setData(leadsGeoJson);
  }, [leadsGeoJson]);

  const goNext = useCallback(() => {
    if (!queue.length) return;
    const idx = selectedId ? queue.findIndex((l) => l.id === selectedId) : -1;
    const next = queue[(idx + 1) % queue.length];
    if (!next) return;
    setSelectedId(next.id);
    if (next.lat != null && next.lng != null) {
      flyTo(next.lat, next.lng);
      void enrichAtLatLng(next.lat, next.lng, next);
    }
  }, [queue, selectedId, flyTo, enrichAtLatLng]);

  const goPrev = useCallback(() => {
    if (!queue.length) return;
    const idx = selectedId ? queue.findIndex((l) => l.id === selectedId) : 0;
    const next = queue[(idx - 1 + queue.length) % queue.length];
    if (!next) return;
    setSelectedId(next.id);
    if (next.lat != null && next.lng != null) {
      flyTo(next.lat, next.lng);
      void enrichAtLatLng(next.lat, next.lng, next);
    }
  }, [queue, selectedId, flyTo, enrichAtLatLng]);

  const onUploadCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseContactsCsv(String(reader.result || ""));
      setLeads((prev) => [...parsed, ...prev]);
      setToast(`Added ${parsed.length} from CSV`);
      if (parsed[0]) setSelectedId(parsed[0].id);
    };
    reader.readAsText(file);
  };

  const onUploadGeoJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseLeadsFromGeoJson(String(reader.result || ""));
      setLeads((prev) => [...parsed, ...prev]);
      setToast(`Added ${parsed.length} from GeoJSON`);
      if (parsed[0]) setSelectedId(parsed[0].id);
    };
    reader.readAsText(file);
  };

  const runGeocode = async () => {
    if (!leads.length) return;
    setGeoBusy(true);
    setToast("");
    try {
      const { next, updated } = await geocodeContactsMissing(leads);
      setLeads(next);
      setToast(updated ? `Geocoded ${updated} leads` : "No addresses to geocode");
    } finally {
      setGeoBusy(false);
    }
  };

  const clearList = () => {
    if (!window.confirm("Remove all route pins and visit marks on this device?")) return;
    setLeads([]);
    setStates({});
    setSelectedId(null);
    setToast("Cleared");
  };

  const openInEstimator = () => {
    if (!lastPayload) return;
    try {
      window.localStorage.setItem(PENDING_PROPERTY_IMPORT_KEY, JSON.stringify(lastPayload));
      navigate("/measurement/new");
    } catch {
      window.alert("Could not open measurement — storage blocked.");
    }
  };

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const parcelDetailRows = stlParcel ? parcelRowsForDisplay(stlParcel, 14) : [];

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] min-h-[calc(100dvh-3.5rem)] w-full shrink-0 flex-col overflow-hidden bg-black lg:h-[100dvh] lg:min-h-[100dvh]">
      <input
        ref={csvInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onUploadCsv(f);
        }}
      />
      <input
        ref={geoInputRef}
        type="file"
        accept=".json,.geojson,application/geo+json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onUploadGeoJson(f);
        }}
      />

      {!mapboxToken.trim() ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-slate-200">
          <MapPin className="h-12 w-12 opacity-80" />
          <p className="max-w-sm text-sm text-slate-300">Mapbox token (same as New Measurement). Stored in this browser.</p>
          <input
            className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
            placeholder="pk.…"
            value={mapboxToken}
            onChange={(e) => setMapboxToken(e.target.value)}
          />
          <Button asChild variant="secondary" size="sm">
            <Link to="/">Back</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="relative min-h-0 w-full flex-1">
            <div
              ref={(node) => {
                mapRef.current = node;
                setMapContainerEl(node);
              }}
              className="absolute inset-0 z-0 min-h-[240px] w-full"
              style={{ height: "100%" }}
            />
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-0">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/55 px-3 py-2 backdrop-blur-md">
              <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <Link to="/">← Back</Link>
              </Button>
              <span className="text-sm font-medium text-white">Canvassing</span>
              <span className="hidden text-xs text-white/60 sm:inline">Tap a roof or lot — Missouri parcels load public owner data</span>
              <div className="ml-auto flex flex-wrap items-center gap-1">
                {leads.length > 0 ? (
                  <span className="mr-1 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white">{leads.length} pins</span>
                ) : null}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/15"
                  title="Add leads CSV"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/15"
                  title="Add GeoJSON points"
                  onClick={() => geoInputRef.current?.click()}
                >
                  <FileJson className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={geoBusy || !leads.length}
                  className="h-8 w-8 text-white hover:bg-white/15"
                  title="Geocode addresses"
                  onClick={() => void runGeocode()}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={!leads.length}
                  className="h-8 w-8 text-white hover:bg-white/15"
                  title="Clear pins"
                  onClick={clearList}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={arcgisBusy}
                  className="h-8 w-8 text-white hover:bg-white/15"
                  title="Refresh ArcGIS overlay (Contacts & settings)"
                  onClick={() => void syncArcgisLayer()}
                >
                  <Layers className={`h-4 w-4 ${arcgisBusy ? "opacity-50" : ""}`} />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-white hover:bg-white/15"
                  title="Mapbox token"
                  onClick={() => setShowTokenRow((v) => !v)}
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {showTokenRow ? (
              <div className="pointer-events-auto border-b border-white/10 bg-black/70 px-3 py-2 backdrop-blur-md">
                <input
                  className="w-full rounded border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white placeholder:text-white/40"
                  placeholder="Mapbox public token"
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                />
              </div>
            ) : null}
            {mapInitError ? (
              <div className="pointer-events-auto border-b border-amber-500/40 bg-amber-950/90 px-3 py-2 text-xs text-amber-100 backdrop-blur-md">
                Map: {mapInitError} — check token URL restrictions at account.mapbox.com
              </div>
            ) : null}
            {arcgisHint ? (
              <div className="pointer-events-none border-b border-white/10 bg-black/50 px-3 py-1.5 text-center text-[11px] text-sky-200/95 backdrop-blur-md">
                ArcGIS: {arcgisHint}
              </div>
            ) : null}
          </div>

          {toast ? (
            <div className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full bg-slate-900/90 px-4 py-1.5 text-xs text-white shadow-lg">
              {toast}
            </div>
          ) : null}

          {!sheetOpen ? (
            <button
              type="button"
              className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-black/60 px-5 py-2.5 text-sm text-white shadow-lg backdrop-blur-md"
              onClick={() => setSheetOpen(true)}
            >
              Tap the map to load owner &amp; parcel
            </button>
          ) : (
            <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 max-h-[min(52vh,420px)] overflow-y-auto rounded-t-2xl border border-gray-200/80 bg-white/95 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {panelBusy ? "Loading…" : "Property"}
                </span>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
                  aria-label="Close"
                  onClick={() => setSheetOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 px-4 pb-5 pt-3 text-sm">
                {panelHint ? <p className="text-xs text-amber-800">{panelHint}</p> : null}
                {focusLatLng ? (
                  <p className="flex items-center gap-1 text-xs text-gray-500">
                    <Navigation className="h-3.5 w-3.5 shrink-0" />
                    {focusLatLng.lat.toFixed(5)}, {focusLatLng.lng.toFixed(5)}
                  </p>
                ) : null}

                <div>
                  <div className="text-xs font-medium text-gray-500">Owner (assessor / map layer)</div>
                  <div className="text-base font-semibold text-gray-900">{ownerDisplay || "—"}</div>
                </div>

                {lastPayload &&
                (lastPayload.ownerPhone ||
                  lastPayload.ownerEmail ||
                  lastPayload.areaSqFt ||
                  lastPayload.yearBuilt ||
                  lastPayload.ownerMailingAddress) ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-gray-800">
                    <div className="mb-1.5 font-semibold text-blue-900">Auto-filled for estimator</div>
                    <ul className="space-y-1">
                      {lastPayload.ownerPhone ? (
                        <li>
                          <span className="text-gray-500">Phone: </span>
                          {lastPayload.ownerPhone}
                        </li>
                      ) : null}
                      {lastPayload.ownerEmail ? (
                        <li>
                          <span className="text-gray-500">Email: </span>
                          {lastPayload.ownerEmail}
                        </li>
                      ) : null}
                      {lastPayload.ownerMailingAddress ? (
                        <li>
                          <span className="text-gray-500">Mailing: </span>
                          {lastPayload.ownerMailingAddress}
                        </li>
                      ) : null}
                      {lastPayload.areaSqFt ? (
                        <li>
                          <span className="text-gray-500">Area: </span>
                          {lastPayload.areaSqFt} sq ft
                        </li>
                      ) : null}
                      {lastPayload.yearBuilt ? (
                        <li>
                          <span className="text-gray-500">Year built: </span>
                          {lastPayload.yearBuilt}
                        </li>
                      ) : null}
                      {lastPayload.lotSizeSqFt ? (
                        <li>
                          <span className="text-gray-500">Lot: </span>
                          {lastPayload.lotSizeSqFt} sq ft
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                {parcelIdDisplay ? (
                  <div className="text-xs text-gray-600">
                    <span className="font-medium text-gray-500">Parcel / ID: </span>
                    {parcelIdDisplay}
                  </div>
                ) : null}

                {addressLine ? (
                  <div>
                    <div className="text-xs font-medium text-gray-500">Address</div>
                    <p className="whitespace-pre-wrap text-gray-800">{addressLine}</p>
                  </div>
                ) : null}

                {stlParcel && parcelDetailRows.length > 0 ? (
                  <details className="rounded-lg border border-gray-100 bg-gray-50/80">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-700">Parcel details</summary>
                    <ul className="max-h-32 space-y-1 overflow-y-auto px-3 pb-2 text-xs text-gray-700">
                      {parcelDetailRows.map((r) => (
                        <li key={r.key}>
                          <span className="text-gray-500">{r.key}: </span>
                          {r.value}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}

                {queue.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                    <Button type="button" variant="outline" size="sm" onClick={goPrev}>
                      <ChevronUp className="h-4 w-4" /> Prev
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={goNext}>
                      Next <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                ) : null}

                {selectedLead ? (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="text-xs font-medium text-gray-600">Route pin</div>
                    <div className="font-medium text-gray-900">{selectedLead.name || selectedLead.address || "Lead"}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(["visited", "skip", "interested", "new"] as const).map((s) => {
                        const active = (states[selectedLead.id]?.status ?? "new") === s;
                        return (
                          <Button
                            key={s}
                            type="button"
                            size="sm"
                            variant={active ? "default" : "outline"}
                            className="h-7 text-xs capitalize"
                            onClick={() => setVisitStatus(selectedLead.id, s)}
                          >
                            {s}
                          </Button>
                        );
                      })}
                    </div>
                    <textarea
                      className="mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                      rows={2}
                      placeholder="Quick note…"
                      value={states[selectedLead.id]?.notes ?? ""}
                      onChange={(e) => updateNotes(selectedLead.id, e.target.value)}
                    />
                  </div>
                ) : null}

                <Button type="button" className="w-full" disabled={!lastPayload || panelBusy} onClick={openInEstimator}>
                  <Ruler className="h-4 w-4" />
                  Open in New Measurement
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
