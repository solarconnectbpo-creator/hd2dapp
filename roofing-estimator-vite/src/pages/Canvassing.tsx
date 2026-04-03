import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronUp,
  FileJson,
  FileSpreadsheet,
  Layers,
  Navigation,
  Ruler,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { parseContactsCsv, type ContactRecord } from "../lib/contactsCsv";
import { geocodeContactsMissing } from "../lib/geocodeContact";
import { parseLeadsFromGeoJson } from "../lib/canvassingGeoJson";
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
  type CanvassLeadEnrichment,
  type CanvassLeadState,
  type CanvassVisitStatus,
  loadCanvassEnrichment,
  loadCanvassLeads,
  loadCanvassStates,
  mergeCanvassEnrichment,
  pruneCanvassEnrichmentToLeadIds,
  saveCanvassEnrichment,
  saveCanvassLeads,
  saveCanvassStates,
} from "../lib/canvassingStorage";
import {
  emptyPropertyImportPayload,
  inferStateCodeFromAddressLine,
  mapPropertyType,
  normalizePropertyImportPayloadContacts,
  stashPendingPropertyImport,
  type PropertyImportPayload,
} from "../lib/propertyScraper";
import {
  PROPERTY_SCRAPER_BATCHDATA_KEY_STORAGE,
  fetchBatchDataPropertyByAddress,
  nominatimReverseToBatchDataCriteria,
  parseUsAddressLineForBatchData,
} from "../lib/propertyBatchDataLookup";
import {
  buildCriteriaCandidates,
  runOwnerFallbackLookup,
  type OwnerEnrichmentSource,
} from "../lib/propertyOwnerLookup";
import {
  fetchArcgisLayerAsGeoJson,
  normalizeArcgisFeatureLayerUrl,
  resolveArcgisApiKey,
  resolveArcgisFeatureLayerUrl,
} from "../lib/arcgisFeatureLayer";
import { fetchParcelAttributesAtPoint, mergeArcgisFeatureSources } from "../lib/arcgisParcelAtPoint";
import { loadOrgSettings } from "../lib/orgSettings";
import { loadEmbeddedExplorerScript, type EmbeddedExplorerMapHandle } from "../lib/embeddedExplorer";
import { getEagleViewEmbeddedAuthToken } from "../lib/eagleViewEmbeddedAuth";
import { useMapProvider } from "../lib/useMapProvider";
import { Map3D, type Map3DPoint } from "../components/Map3D";

function canvassTagFeature(f: GeoJSON.Feature, extra: Record<string, unknown>): GeoJSON.Feature {
  const base =
    f.properties && typeof f.properties === "object" && !Array.isArray(f.properties)
      ? { ...(f.properties as Record<string, unknown>) }
      : {};
  return { ...f, properties: { ...base, ...extra } };
}

const AUTO_OPEN_ESTIMATE_KEY = "roofing-canvass-auto-open-estimate-v1";
const REQUIRE_OWNER_INFO_KEY = "roofing-canvass-require-owner-info-v1";

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
  const mapProvider = useMapProvider();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement | null>(null);
  /** Bumps when the map container DOM node attaches so layout effect can init the viewer reliably. */
  const [mapContainerEl, setMapContainerEl] = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<EmbeddedExplorerMapHandle | null>(null);
  const styleLoadedRef = useRef(false);
  const viewCenterRef = useRef<{ lat: number; lon: number }>({ lat: 38.63, lon: -90.2 });
  const [eeMapReady, setEeMapReady] = useState(false);
  const [eeContainerId] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? `ee-canvass-${crypto.randomUUID().replace(/-/g, "")}`
      : `ee-canvass-${Date.now()}`,
  );
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const geoInputRef = useRef<HTMLInputElement | null>(null);

  const [leads, setLeads] = useState<ContactRecord[]>(() => loadCanvassLeads());
  const [states, setStates] = useState<Record<string, CanvassLeadState>>(() => loadCanvassStates());
  const [enrichment, setEnrichment] = useState<Record<string, CanvassLeadEnrichment>>(() => loadCanvassEnrichment());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [panelBusy, setPanelBusy] = useState(false);
  const [panelHint, setPanelHint] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [ownerDisplay, setOwnerDisplay] = useState("");
  const [parcelIdDisplay, setParcelIdDisplay] = useState("");
  const [stlParcel, setStlParcel] = useState<Record<string, unknown> | null>(null);
  const [lastPayload, setLastPayload] = useState<PropertyImportPayload | null>(null);
  const [lastOwnerSource, setLastOwnerSource] = useState<OwnerEnrichmentSource>("base");
  const [focusLatLng, setFocusLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [geoBusy, setGeoBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [mapInitError, setMapInitError] = useState("");

  const resolveBatchDataKey = useCallback((): string => {
    const fromStorage = window.localStorage.getItem(PROPERTY_SCRAPER_BATCHDATA_KEY_STORAGE)?.trim() || "";
    if (fromStorage) return fromStorage;
    return String(import.meta.env.VITE_BATCHDATA_API_KEY ?? "").trim();
  }, []);
  const [autoOpenEstimate, setAutoOpenEstimate] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return true;
      const raw = window.localStorage.getItem(AUTO_OPEN_ESTIMATE_KEY);
      return raw == null ? true : raw === "1";
    } catch {
      return true;
    }
  });
  const [requireOwnerInfoBeforeOpen, setRequireOwnerInfoBeforeOpen] = useState<boolean>(() => {
    try {
      if (typeof window === "undefined") return true;
      const raw = window.localStorage.getItem(REQUIRE_OWNER_INFO_KEY);
      return raw == null ? true : raw === "1";
    } catch {
      return true;
    }
  });
  const [arcgisBusy, setArcgisBusy] = useState(false);
  const [arcgisHint, setArcgisHint] = useState("");

  const hasRequiredOwnerInfo = useCallback((payload: PropertyImportPayload | null): boolean => {
    if (!payload) return false;
    const owner = payload.ownerName.trim();
    const hasContact = Boolean(
      payload.ownerPhone.trim() ||
        payload.ownerEmail.trim() ||
        payload.ownerMailingAddress.trim() ||
        payload.contactPersonPhone.trim() ||
        payload.contactPersonName.trim(),
    );
    return Boolean(owner && hasContact);
  }, []);

  useEffect(() => {
    saveCanvassLeads(leads);
  }, [leads]);
  useEffect(() => {
    saveCanvassStates(states);
  }, [states]);
  useEffect(() => {
    saveCanvassEnrichment(enrichment);
  }, [enrichment]);
  useEffect(() => {
    const ids = new Set(leads.map((l) => l.id));
    setEnrichment((prev) => pruneCanvassEnrichmentToLeadIds(prev, ids));
  }, [leads]);
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
        const payloadForComplete = normalizePropertyImportPayloadContacts(
          enrichment[c.id]?.payload ?? contactToImportBase(c),
        );
        const ownerComplete = hasRequiredOwnerInfo(payloadForComplete);
        return {
          type: "Feature" as const,
          properties: {
            id: c.id,
            status: st,
            label: c.name || c.address || "Lead",
            ownerComplete,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [c.lng!, c.lat!],
          },
        };
      });
    return { type: "FeatureCollection" as const, features };
  }, [leads, states, enrichment, hasRequiredOwnerInfo]);

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

  const openPayloadInEstimator = useCallback(
    (payload: PropertyImportPayload) => {
      try {
        stashPendingPropertyImport(payload, { autoEstimate: true, importFootprint: true });
        navigate("/measurement/new?auto=1");
      } catch {
        window.alert("Could not open measurement — storage blocked.");
      }
    },
    [navigate],
  );

  const leadsRef = useRef(leads);
  const enrichmentRef = useRef(enrichment);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);
  useEffect(() => {
    enrichmentRef.current = enrichment;
  }, [enrichment]);

  const enrichAtLatLng = useCallback(
    async (lat: number, lng: number, pref?: ContactRecord | null, arcgisFeatureProps?: Record<string, unknown> | null) => {
      const cached = pref?.id ? enrichmentRef.current[pref.id] : undefined;
      setPanelBusy(true);
      setPanelHint("");
      if (cached) {
        const p = normalizePropertyImportPayloadContacts({ ...cached.payload });
        setLastPayload(p);
        setStlParcel(cached.parcel);
        setOwnerDisplay(p.ownerName || extractOwnerFromParcel(cached.parcel ?? {}));
        setParcelIdDisplay(extractParcelIdFromParcel(cached.parcel ?? {}));
        setAddressLine(p.address || "");
        setLastOwnerSource("base");
      } else {
        setAddressLine("");
        setOwnerDisplay("");
        setParcelIdDisplay("");
        setStlParcel(null);
        setLastPayload(null);
        setLastOwnerSource("base");
      }
      setFocusLatLng({ lat, lng });
      setSheetOpen(!autoOpenEstimate);
      try {
        const url =
          "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" +
          encodeURIComponent(String(lat)) +
          "&lon=" +
          encodeURIComponent(String(lng));
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Could not resolve address for this point.");
        const data = (await res.json()) as {
          display_name?: string;
          address?: Record<string, string | undefined>;
        };
        const line = data.display_name?.trim() || "";
        setAddressLine(line);

        let intelParcel: Record<string, unknown> | null = null;
        let ownerSource: OwnerEnrichmentSource = "base";
        if (isInMissouriBbox(lat, lng)) {
          const stl = await fetchStlIntelAtPoint(lat, lng);
          intelParcel = stl?.parcel ?? null;
          if (intelParcel && Object.keys(intelParcel).length > 0) {
            ownerSource = "stl";
          }
        }

        const orgForArcgis = loadOrgSettings();
        const arcgisLayerUrl = resolveArcgisFeatureLayerUrl(orgForArcgis.arcgisFeatureLayerUrl);
        let arcgisRestAttrs: Record<string, unknown> | null = null;
        if (normalizeArcgisFeatureLayerUrl(arcgisLayerUrl)) {
          const token = resolveArcgisApiKey(orgForArcgis.arcgisApiKey);
          const restOut = await fetchParcelAttributesAtPoint(arcgisLayerUrl, lat, lng, { token });
          if (restOut.ok) {
            arcgisRestAttrs = restOut.attributes;
          } else if (restOut.reason === "network" || restOut.reason === "api") {
            setPanelHint((curr) =>
              curr
                ? `${curr} ArcGIS parcel query: ${restOut.message ?? restOut.reason}`
                : `ArcGIS parcel query: ${restOut.message ?? restOut.reason}`,
            );
          }
        }

        const arcgisMerged = mergeArcgisFeatureSources(arcgisFeatureProps, arcgisRestAttrs);
        const mapHitEmpty = !arcgisFeatureProps || Object.keys(arcgisFeatureProps).length === 0;

        const parcel = mergeParcelAttributes(intelParcel, arcgisMerged);
        setStlParcel(parcel);

        const auto = extractParcelAutoFill(parcel);
        debugLogParcelEnrichment({
          lat,
          lng,
          intelParcel,
          arcgisFeatureProps: arcgisMerged,
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

        const key = resolveBatchDataKey();
        if (key) {
          const primary =
            nominatimReverseToBatchDataCriteria({
              display_name: data.display_name,
              address: data.address,
            }) ?? parseUsAddressLineForBatchData(base.address);
          const fromBuilder = buildCriteriaCandidates({
            payload: base,
            nominatimDisplayName: data.display_name,
            nominatimAddress: data.address,
            lat,
            lng,
          });
          const toTry =
            fromBuilder.length > 0 ? fromBuilder : primary ? [primary] : [];
          let batchDataHit = false;
          let lastBdMsg = "";
          for (const criteria of toTry) {
            const bd = await fetchBatchDataPropertyByAddress(key, criteria);
            if (bd.ok) {
              const p = bd.payload;
              base = {
                ...base,
                ownerName: p.ownerName.trim() || p.ownerPmEntityLabel?.trim() || base.ownerName,
                ownerPhone: p.ownerPhone.trim() || p.contactPersonPhone.trim() || base.ownerPhone,
                ownerEmail: p.ownerEmail.trim() || base.ownerEmail,
                ownerMailingAddress: p.ownerMailingAddress.trim() || base.ownerMailingAddress,
                areaSqFt: p.areaSqFt.trim() || base.areaSqFt,
                yearBuilt: p.yearBuilt.trim() || base.yearBuilt,
                lotSizeSqFt: p.lotSizeSqFt.trim() || base.lotSizeSqFt,
                ownerEntityType: p.ownerEntityType.trim() || base.ownerEntityType,
                contactPersonName: p.contactPersonName.trim() || base.contactPersonName,
                contactPersonPhone: p.contactPersonPhone.trim() || base.contactPersonPhone,
                ownerPmEntityLabel: p.ownerPmEntityLabel?.trim() || base.ownerPmEntityLabel,
                notes: [base.notes, p.notes].filter(Boolean).join("\n\n"),
              };
              ownerSource = "batchdata";
              batchDataHit = true;
              break;
            }
            lastBdMsg = bd.message;
          }
          if (!batchDataHit && toTry.length && lastBdMsg) {
            setPanelHint((curr) => (curr ? `${curr} BatchData: ${lastBdMsg}` : `BatchData: ${lastBdMsg}`));
          }
        }

        base = normalizePropertyImportPayloadContacts(base);

        if (!hasRequiredOwnerInfo(base)) {
          const org = loadOrgSettings();
          const fallback = await runOwnerFallbackLookup(org, key, {
            payload: base,
            nominatimDisplayName: data.display_name,
            nominatimAddress: data.address,
            lat,
            lng,
          });
          if (fallback.ok) {
            base = normalizePropertyImportPayloadContacts(fallback.payload);
            ownerSource = fallback.source;
            if (fallback.note) {
              const note = fallback.note;
              setPanelHint((curr) => (curr ? `${curr} ${note}` : note));
            }
          } else if (org.ownerFallbackProvider !== "none") {
            setPanelHint((curr) =>
              curr ? `${curr} Fallback: ${fallback.message}` : `Fallback: ${fallback.message}`,
            );
          }
        }

        base = normalizePropertyImportPayloadContacts(base);

        setOwnerDisplay(base.ownerName || owner);
        setLastPayload(base);
        setLastOwnerSource(ownerSource);
        if (pref?.id) {
          setEnrichment((prev) => mergeCanvassEnrichment(prev, pref.id, { payload: base, parcel }));
        }
        if (autoOpenEstimate) {
          if (requireOwnerInfoBeforeOpen && !hasRequiredOwnerInfo(base)) {
            setSheetOpen(true);
            setPanelHint(
              "Owner lock: add owner name plus phone, email, or mailing address before opening Measurement. Add a BatchData API key under Contacts & settings (or enable Owner fallback) to pull owner data from public records when available.",
            );
          } else {
          openPayloadInEstimator(base);
          }
        }

        const fromGis = Boolean(arcgisMerged && Object.keys(arcgisMerged).length > 0);
        const intelHit = intelParcel && Object.keys(intelParcel).length > 0;
        if (fromGis && owner && intelHit) {
          setPanelHint(
            "Owner and fields use Missouri parcel intel when present; map layer fills any gaps. Always confirm before quoting.",
          );
        } else if (fromGis && owner) {
          setPanelHint(
            mapHitEmpty && arcgisRestAttrs
              ? "Owner and property details from ArcGIS REST (point query). Verify before quoting."
              : "Owner and property details pulled from the map layer you clicked. Verify before quoting.",
          );
        } else if (fromGis && !owner) {
          setPanelHint(
            mapHitEmpty && arcgisRestAttrs
              ? "ArcGIS REST returned parcel attributes — owner name not in this layer; check assessor or parcel details."
              : "Map layer attributes loaded — owner name not in this layer; check parcel details.",
          );
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
        if (!cached) {
          setAddressLine("");
          setOwnerDisplay("");
          setParcelIdDisplay("");
          setStlParcel(null);
          setLastPayload(null);
        }
      } finally {
        setPanelBusy(false);
      }
    },
    [autoOpenEstimate, hasRequiredOwnerInfo, openPayloadInEstimator, requireOwnerInfoBeforeOpen, resolveBatchDataKey],
  );

  const flyTo = useCallback((lat: number, lng: number, zoom = 17.5) => {
    const map = mapInstanceRef.current;
    if (!map?.setLonLat) return;
    viewCenterRef.current = { lat, lon: lng };
    map.setLonLat({ lat, lon: lng, z: zoom });
  }, []);

  const enrichRef = useRef(enrichAtLatLng);
  useEffect(() => {
    enrichRef.current = enrichAtLatLng;
  }, [enrichAtLatLng]);

  const syncArcgisLayer = useCallback(async () => {
    const ee = mapInstanceRef.current;
    if (!ee?.addFeatures || !styleLoadedRef.current) return;
    const org = loadOrgSettings();
    const layerUrl = resolveArcgisFeatureLayerUrl(org.arcgisFeatureLayerUrl);
    const normalized = normalizeArcgisFeatureLayerUrl(layerUrl);
    try {
      ee.removeFeatures?.({
        geoJson: (f) => Boolean((f.properties as Record<string, unknown> | undefined)?.__canvassArcgis),
      });
    } catch {
      /* ignore */
    }
    if (!normalized) {
      setArcgisHint("");
      return;
    }
    const token = resolveArcgisApiKey(org.arcgisApiKey);
    setArcgisBusy(true);
    try {
      const fc = await fetchArcgisLayerAsGeoJson(layerUrl, { token: token || undefined });
      if (fc.features.length) {
        ee.addFeatures({
          geoJson: fc.features.map((f) => canvassTagFeature(f, { __canvassArcgis: true })),
        });
      }
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

  const enrichAtMapCenter = useCallback(() => {
    const c = viewCenterRef.current;
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lon)) return;
    const near = findNearestLead(leadsRef.current, c.lat, c.lon);
    if (near?.lat != null && near?.lng != null) {
      setSelectedId(near.id);
      void enrichRef.current(near.lat, near.lng, near, null);
    } else {
      setSelectedId(null);
      void enrichRef.current(c.lat, c.lon, null, null);
    }
  }, []);

  useLayoutEffect(() => {
    if (!mapContainerEl || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    let disposed = false;
    styleLoadedRef.current = false;
    setEeMapReady(false);
    setMapInitError("");

    const run = async () => {
      try {
        await loadEmbeddedExplorerScript();
        if (disposed || !mapRef.current) return;
        const Ev = window.ev?.EmbeddedExplorer;
        if (!Ev) {
          setMapInitError("EagleView Embedded Explorer script failed to load (network or blocker).");
          return;
        }

        const el = mapRef.current;
        el.id = eeContainerId;

        let lat = 38.63;
        let lon = -90.2;
        const first = leadsRef.current.find((l) => l.lat != null && l.lng != null);
        if (first?.lat != null && first.lng != null) {
          lat = first.lat;
          lon = first.lng;
        }
        viewCenterRef.current = { lat, lon };

        const map = new Ev().mount(eeContainerId, {
          authToken: await getEagleViewEmbeddedAuthToken(),
          view: { lonLat: { lon, lat } },
        }) as EmbeddedExplorerMapHandle;

        mapInstanceRef.current = map;

        let readyOnce = false;
        const onFeatureClick = (raw: unknown) => {
          const arr = Array.isArray(raw) ? raw : [];
          for (const item of arr) {
            const f = item as GeoJSON.Feature;
            const props = f?.properties as Record<string, unknown> | undefined;
            if (props?.["__canvassLead"] != null && props["id"] != null) {
              const id = String(props["id"]);
              setSelectedId(id);
              const lead = leadsRef.current.find((l) => l.id === id);
              if (lead?.lat != null && lead?.lng != null) {
                void enrichRef.current(lead.lat, lead.lng, lead, null);
              }
              return;
            }
          }
        };

        const onReady = () => {
          if (disposed || readyOnce) return;
          readyOnce = true;
          try {
            map.enableMeasurementPanel(false);
            map.enableSearchBar(true);
          } catch {
            /* optional widget toggles */
          }
          styleLoadedRef.current = true;
          setEeMapReady(true);
          setMapInitError("");
          try {
            map.on("featureClick", onFeatureClick);
          } catch {
            /* ignore */
          }
          if (
            normalizeArcgisFeatureLayerUrl(resolveArcgisFeatureLayerUrl(loadOrgSettings().arcgisFeatureLayerUrl))
          ) {
            queueMicrotask(() => {
              if (!disposed) void syncArcgisLayer();
            });
          }
        };

        map.on("onMapReady", onReady);
        map.on("onViewUpdate", (u: unknown) => {
          const v = u as { lonLat?: { lat: number; lon: number } };
          if (v?.lonLat) viewCenterRef.current = v.lonLat;
        });
        map.on("Errors", (err: unknown) => {
          console.error("EagleView Canvassing:", err);
          const msg =
            err && typeof err === "object" && "message" in err && typeof (err as Error).message === "string"
              ? (err as Error).message
              : String(err);
          setMapInitError(msg || "EagleView map error");
        });

        window.setTimeout(() => {
          if (disposed || styleLoadedRef.current) return;
          onReady();
        }, 2500);
      } catch (e) {
        if (!disposed) {
          setMapInitError(e instanceof Error ? e.message : "Could not start EagleView map.");
        }
      }
    };

    void run();

    return () => {
      disposed = true;
      styleLoadedRef.current = false;
      setEeMapReady(false);
      try {
        const m = mapInstanceRef.current;
        m?.off?.("onMapReady");
        m?.off?.("onViewUpdate");
        m?.off?.("Errors");
        m?.off?.("featureClick");
      } catch {
        /* ignore */
      }
      mapInstanceRef.current = null;
      const node = mapRef.current;
      if (node) {
        node.innerHTML = "";
        node.removeAttribute("id");
      }
    };
  }, [mapContainerEl, syncArcgisLayer, eeContainerId]);

  useEffect(() => {
    const ee = mapInstanceRef.current;
    if (!ee?.addFeatures || !eeMapReady) return;
    try {
      ee.removeFeatures?.({
        geoJson: (f) => Boolean((f.properties as Record<string, unknown> | undefined)?.__canvassLead),
      });
    } catch {
      /* ignore */
    }
    if (leadsGeoJson.features.length) {
      ee.addFeatures({
        geoJson: leadsGeoJson.features.map((f) => canvassTagFeature(f, { __canvassLead: true })),
      });
    }
  }, [leadsGeoJson, eeMapReady]);

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
    setEnrichment({});
    setSelectedId(null);
    setToast("Cleared");
  };

  const openInEstimator = () => {
    if (!lastPayload) return;
    if (requireOwnerInfoBeforeOpen && !hasRequiredOwnerInfo(lastPayload)) {
      setSheetOpen(true);
      setPanelHint("Owner lock: add owner name plus phone/email/mailing info before opening Measurement.");
      return;
    }
    openPayloadInEstimator(lastPayload);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(AUTO_OPEN_ESTIMATE_KEY, autoOpenEstimate ? "1" : "0");
    } catch {
      // ignore
    }
  }, [autoOpenEstimate]);

  useEffect(() => {
    try {
      window.localStorage.setItem(REQUIRE_OWNER_INFO_KEY, requireOwnerInfoBeforeOpen ? "1" : "0");
    } catch {
      // ignore
    }
  }, [requireOwnerInfoBeforeOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const parcelDetailRows = stlParcel ? parcelRowsForDisplay(stlParcel, 150) : [];

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

      <>
          <div className="relative min-h-0 w-full flex-1">
            {mapProvider === "osm-fallback" ? (
              <Map3D
                center={viewCenterRef.current ? { lat: viewCenterRef.current.lat, lng: viewCenterRef.current.lon } : undefined}
                zoom={16}
                pitch={45}
                bearing={0}
                height="100%"
                enableGps
                style={{ position: "absolute", inset: 0 }}
                points={leads
                  .filter((c) => c.lat != null && c.lng != null)
                  .map((c) => {
                    const st = states[c.id]?.status ?? "new";
                    return {
                      id: c.id,
                      lat: c.lat!,
                      lng: c.lng!,
                      label: c.name || c.address || "Lead",
                      color: st === "interested" ? "#22c55e" : st === "visited" ? "#3b82f6" : st === "skip" ? "#6b7280" : "#ef4444",
                    };
                  }) as Map3DPoint[]}
                onMapClick={(lat, lng) => {
                  viewCenterRef.current = { lat, lon: lng };
                  void enrichAtLatLng(lat, lng, findNearestLead(leads, lat, lng));
                }}
                onPointClick={(id) => {
                  const lead = leads.find((l) => l.id === id);
                  if (lead) {
                    setSelectedId(id);
                    if (lead.lat != null && lead.lng != null) {
                      void enrichAtLatLng(lead.lat, lead.lng, lead);
                    }
                  }
                }}
                onMoveEnd={(lat, lng) => {
                  viewCenterRef.current = { lat, lon: lng };
                }}
              />
            ) : (
              <>
                <div
                  ref={(node) => {
                    mapRef.current = node;
                    setMapContainerEl(node);
                  }}
                  className="absolute inset-0 z-0 min-h-[240px] w-full"
                  style={{ height: "100%" }}
                />
                {mapInitError ? (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 p-4 text-center">
                    <div className="max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-4 text-black shadow-xl">
                      <h3 className="mb-2 text-base font-semibold">Canvassing map unavailable</h3>
                      <p className="text-sm">{mapInitError}</p>
                      <p className="mt-2 text-xs text-black/80">
                        Update EagleView embedded credentials on backend, restart services, then refresh this page.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-0">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white/90 px-3 py-2 backdrop-blur-md">
              <Button asChild variant="ghost" size="sm" className="text-black hover:bg-gray-100">
                <Link to="/">← Back</Link>
              </Button>
              <span className="text-sm font-medium text-black">Canvassing</span>
              <span className="hidden text-xs text-black sm:inline">Tap a roof or lot — Missouri parcels load public owner data</span>
              <div className="ml-auto flex flex-wrap items-center gap-1">
                {leads.length > 0 ? (
                  <span className="mr-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-black" title="Emerald = owner + contact ready">
                    {leads.length} pins
                  </span>
                ) : null}
                <span className="hidden text-[11px] text-black/80 sm:inline" title="Route leads with owner + contact show emerald">
                  Emerald = ready
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-black hover:bg-gray-100"
                  title="Add leads CSV"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-black hover:bg-gray-100"
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
                  className="h-8 w-8 text-black hover:bg-gray-100"
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
                  className="h-8 w-8 text-black hover:bg-gray-100"
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
                  className="h-8 w-8 text-black hover:bg-gray-100"
                  title="Refresh ArcGIS overlay (Contacts & settings)"
                  onClick={() => void syncArcgisLayer()}
                >
                  <Layers className={`h-4 w-4 ${arcgisBusy ? "opacity-50" : ""}`} />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs text-black"
                  title="Run owner/parcel lookup at current map center"
                  disabled={mapProvider === "eagleview" ? !eeMapReady : false}
                  onClick={() => enrichAtMapCenter()}
                >
                  Use map center
                </Button>
              </div>
            </div>
            {mapInitError ? (
              <div className="pointer-events-auto border-b border-amber-300 bg-amber-50 px-3 py-2 text-xs text-black backdrop-blur-md">
                Map blocked: {mapInitError}
              </div>
            ) : null}
            {arcgisHint ? (
              <div className="pointer-events-none border-b border-sky-200 bg-sky-50 px-3 py-1.5 text-center text-[11px] text-black backdrop-blur-md">
                ArcGIS: {arcgisHint}
              </div>
            ) : null}
          </div>

          {toast ? (
            <div className="pointer-events-none absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs text-black shadow-lg">
              {toast}
            </div>
          ) : null}

          {!sheetOpen ? (
            <button
              type="button"
              className="pointer-events-auto absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm text-black shadow-lg backdrop-blur-md"
              onClick={() => setSheetOpen(true)}
            >
              Tap a lead pin or Use map center — then load owner &amp; parcel
            </button>
          ) : (
            <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 max-h-[min(52vh,420px)] overflow-y-auto rounded-t-2xl border border-gray-200/80 bg-white/95 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm">
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-black">
                  {panelBusy ? "Loading…" : "Property"}
                </span>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-black hover:bg-gray-100"
                  aria-label="Close"
                  onClick={() => setSheetOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3 px-4 pb-5 pt-3 text-sm">
                {panelHint ? <p className="text-xs text-amber-800">{panelHint}</p> : null}
                {focusLatLng ? (
                  <p className="flex items-center gap-1 text-xs text-black">
                    <Navigation className="h-3.5 w-3.5 shrink-0" />
                    {focusLatLng.lat.toFixed(5)}, {focusLatLng.lng.toFixed(5)}
                  </p>
                ) : null}

                <div>
                  <div className="text-xs font-medium text-black">Owner (assessor / map layer)</div>
                  <div className="text-base font-semibold text-black">{ownerDisplay || "—"}</div>
                </div>
                <div
                  className={[
                    "rounded-md border px-2.5 py-1.5 text-xs font-medium",
                    hasRequiredOwnerInfo(lastPayload)
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800",
                  ].join(" ")}
                >
                  {hasRequiredOwnerInfo(lastPayload)
                    ? "Owner Ready: owner + contact info complete"
                    : "Owner Ready: missing owner/contact info"}
                </div>
                {lastPayload ? (
                  <div className="text-[11px] text-black">
                    <span className="font-medium text-black">Source: </span>
                    {lastOwnerSource === "stl"
                      ? "STL Parcel Intel"
                      : lastOwnerSource === "batchdata"
                        ? "BatchData"
                        : lastOwnerSource === "fallback"
                          ? "Fallback Provider"
                          : "Base map/lead"}
                  </div>
                ) : null}

                {lastPayload &&
                (lastPayload.ownerPhone ||
                  lastPayload.ownerEmail ||
                  lastPayload.areaSqFt ||
                  lastPayload.yearBuilt ||
                  lastPayload.ownerMailingAddress ||
                  lastPayload.contactPersonName.trim() ||
                  lastPayload.contactPersonPhone.trim() ||
                  lastPayload.ownerEntityType.trim() ||
                  (lastPayload.ownerPmEntityLabel ?? "").trim()) ? (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-black">
                    <div className="mb-1.5 font-semibold text-black">Auto-filled for estimator</div>
                    <ul className="space-y-1">
                      {lastPayload.contactPersonName.trim() ? (
                        <li>
                          <span className="text-black">Contact person: </span>
                          {lastPayload.contactPersonName}
                        </li>
                      ) : null}
                      {lastPayload.contactPersonPhone.trim() ? (
                        <li>
                          <span className="text-black">Contact phone: </span>
                          {lastPayload.contactPersonPhone}
                        </li>
                      ) : null}
                      {(lastPayload.ownerPmEntityLabel ?? "").trim() ? (
                        <li>
                          <span className="text-black">PM / entity: </span>
                          {lastPayload.ownerPmEntityLabel}
                        </li>
                      ) : null}
                      {lastPayload.ownerEntityType.trim() ? (
                        <li>
                          <span className="text-black">Owner type: </span>
                          {lastPayload.ownerEntityType}
                        </li>
                      ) : null}
                      {lastPayload.ownerPhone ? (
                        <li>
                          <span className="text-black">Phone: </span>
                          {lastPayload.ownerPhone}
                        </li>
                      ) : null}
                      {lastPayload.ownerEmail ? (
                        <li>
                          <span className="text-black">Email: </span>
                          {lastPayload.ownerEmail}
                        </li>
                      ) : null}
                      {lastPayload.ownerMailingAddress ? (
                        <li>
                          <span className="text-black">Mailing: </span>
                          {lastPayload.ownerMailingAddress}
                        </li>
                      ) : null}
                      {lastPayload.areaSqFt ? (
                        <li>
                          <span className="text-black">Area: </span>
                          {lastPayload.areaSqFt} sq ft
                        </li>
                      ) : null}
                      {lastPayload.yearBuilt ? (
                        <li>
                          <span className="text-black">Year built: </span>
                          {lastPayload.yearBuilt}
                        </li>
                      ) : null}
                      {lastPayload.lotSizeSqFt ? (
                        <li>
                          <span className="text-black">Lot: </span>
                          {lastPayload.lotSizeSqFt} sq ft
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                {parcelIdDisplay ? (
                  <div className="text-xs text-black">
                    <span className="font-medium text-black">Parcel / ID: </span>
                    {parcelIdDisplay}
                  </div>
                ) : null}

                {addressLine ? (
                  <div>
                    <div className="text-xs font-medium text-black">Address</div>
                    <p className="whitespace-pre-wrap text-black">{addressLine}</p>
                  </div>
                ) : null}

                {stlParcel && parcelDetailRows.length > 0 ? (
                  <details className="rounded-lg border border-gray-100 bg-gray-50/80">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-black">
                      Tax assessor / parcel attributes
                    </summary>
                    <ul className="max-h-[min(42vh,360px)] space-y-1 overflow-y-auto px-3 pb-2 text-xs text-black">
                      {parcelDetailRows.map((r) => (
                        <li key={r.key}>
                          <span className="text-black">{r.key}: </span>
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
                    <div className="text-xs font-medium text-black">Route pin</div>
                    <div className="font-medium text-black">{selectedLead.name || selectedLead.address || "Lead"}</div>
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

                <Button
                  type="button"
                  className="w-full"
                  disabled={!lastPayload || panelBusy || (requireOwnerInfoBeforeOpen && !hasRequiredOwnerInfo(lastPayload))}
                  onClick={openInEstimator}
                >
                  <Ruler className="h-4 w-4" />
                  Instant Estimate in Measurement
                </Button>
                <label className="flex items-center gap-2 text-xs text-black">
                  <input
                    type="checkbox"
                    checked={autoOpenEstimate}
                    onChange={(e) => setAutoOpenEstimate(e.target.checked)}
                  />
                  Auto-open instant estimate when I click a property
                </label>
                <label className="flex items-center gap-2 text-xs text-black">
                  <input
                    type="checkbox"
                    checked={requireOwnerInfoBeforeOpen}
                    onChange={(e) => setRequireOwnerInfoBeforeOpen(e.target.checked)}
                  />
                  Require owner + contact info before opening Measurement
                </label>
              </div>
            </div>
          )}
      </>
    </div>
  );
}
