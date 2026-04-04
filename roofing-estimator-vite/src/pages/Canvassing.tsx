import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast as sonnerToast } from "sonner";
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
import { parseJsonResponse } from "../lib/readJsonResponse";
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
  nominatimReverseToAddressCriteria,
  parseUsAddressLineForSearch,
} from "../lib/propertyAddressCriteria";
import {
  getArcgisMapServerTileConfig,
  hydrateDealMachineCapabilitiesFromHealth,
  fetchDealMachinePropertyByAddress,
} from "../lib/propertyDealMachineLookup";
import {
  buildCriteriaCandidates,
  runOwnerFallbackLookup,
  type OwnerEnrichmentSource,
} from "../lib/propertyOwnerLookup";
import { loadOrgSettings } from "../lib/orgSettings";
import { fetchArcgisParcelGeoJsonViaBackend, queryArcgisAtPointViaBackend } from "../lib/arcgisBackendClient";
import { mergeArcgisFeatureSources } from "../lib/arcgisParcelAtPoint";
import { fetchUsBuildingFootprintAtPoint, formatBuildingFootprintNotes } from "../lib/esriBuildingFootprint";
import { fetchOsmBuildingFootprintAtPoint, formatOsmBuildingFootprintNotes } from "../lib/osmBuildingFootprint";
import {
  estimateRoofSqFtFromLotSqFtConservative,
  footprintFeaturePlanAreaSqFt,
  type BuildingFootprintFeature,
} from "../lib/geoFootprintMeasure";
import { Map3D, type Map3DPoint } from "../components/Map3D";

const AUTO_OPEN_ESTIMATE_KEY = "roofing-canvass-auto-open-estimate-v1";
const REQUIRE_OWNER_INFO_KEY = "roofing-canvass-require-owner-info-v1";

/** Best-effort lot size (ft²) from assessor-style parcel attributes for footprint fallback. */
function guessLotSqFtFromParcel(parcel: Record<string, unknown> | null): number | null {
  if (!parcel) return null;
  const tryNum = (v: unknown) => {
    const n = Number.parseFloat(String(v ?? ""));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  for (const k of ["LOT_SQFT", "lot_sqft", "LOT_SIZE_SQFT", "LOTAREA", "LotSqFt", "LOT_SQ_FT"]) {
    const n = tryNum(parcel[k]);
    if (n != null && n >= 500 && n <= 2_000_000) return n;
  }
  const acres = tryNum(parcel.ACRES ?? parcel.acres ?? parcel.CALC_ACRE);
  if (acres != null && acres >= 0.01 && acres < 500) return acres * 43560;
  return null;
}

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

/** ~120m — geocoded pins are often street-center; door-to-door clicks can be farther from the pin. */
const NEAR_LEAD_MAX_M = 120;

function findNearestLead(
  leads: ContactRecord[],
  lat: number,
  lng: number,
  maxM = NEAR_LEAD_MAX_M,
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

/** Match a CSV lead when reverse-geocode text overlaps the lead’s address (same property, pin was off). */
function findLeadMatchingReverseAddress(displayName: string, leads: ContactRecord[]): ContactRecord | null {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const d = norm(displayName);
  if (d.length < 12) return null;
  let best: ContactRecord | null = null;
  let bestScore = 0;
  for (const c of leads) {
    const a = norm([c.address, c.city, c.state, c.zip].filter(Boolean).join(", "));
    if (a.length < 8) continue;
    const head = a.slice(0, Math.min(42, a.length));
    const dhead = d.slice(0, Math.min(48, d.length));
    let score = 0;
    if (d.includes(head) || head.includes(dhead.slice(0, Math.min(28, dhead.length)))) score = 3;
    else {
      const num = a.match(/^\s*(\d+)/)?.[1];
      const street = a.replace(/^\s*\d+\s+/, "").split(",")[0]?.trim() ?? "";
      if (num && street.length > 4 && d.includes(num) && d.includes(street.slice(0, Math.min(18, street.length)))) {
        score = 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 2 ? best : null;
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
  const viewCenterRef = useRef<{ lat: number; lon: number }>({ lat: 38.63, lon: -90.2 });
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(() => ({
    lat: viewCenterRef.current.lat,
    lng: viewCenterRef.current.lon,
  }));
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const geoInputRef = useRef<HTMLInputElement | null>(null);
  /** Map viewport for bbox-scoped parcel GeoJSON (St. Louis County layer). */
  const mapBoundsRef = useRef<{ west: number; south: number; east: number; north: number } | null>(null);
  const arcgisSyncDebounceRef = useRef<number | null>(null);

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
  const [lastBuildingFootprint, setLastBuildingFootprint] = useState<BuildingFootprintFeature | null>(null);
  const [lastOwnerSource, setLastOwnerSource] = useState<OwnerEnrichmentSource>("base");
  const [focusLatLng, setFocusLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [geoBusy, setGeoBusy] = useState(false);
  const [toast, setToast] = useState("");

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
  /** GeoJSON from Contacts & settings parcel layer — rendered on the satellite map. */
  const [arcgisParcelOverlay, setArcgisParcelOverlay] = useState<GeoJSON.FeatureCollection | null>(null);
  /** USGS/Esri building footprint polygon at the last lookup point (cyan on map). */
  const [buildingFootprintOverlay, setBuildingFootprintOverlay] = useState<GeoJSON.FeatureCollection | null>(null);
  /** Optional ArcGIS Server raster overlay (XYZ tiles from Worker /api/health). */
  const [arcgisMapTile, setArcgisMapTile] = useState<ReturnType<typeof getArcgisMapServerTileConfig> | null>(null);

  useEffect(() => {
    void hydrateDealMachineCapabilitiesFromHealth().then(() => {
      setArcgisMapTile(getArcgisMapServerTileConfig());
    });
  }, []);

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
    (payload: PropertyImportPayload, buildingFootprint?: BuildingFootprintFeature | null) => {
      try {
        stashPendingPropertyImport(
          payload,
          { autoEstimate: true, importFootprint: true },
          buildingFootprint ?? undefined,
        );
        navigate("/measurement/new?auto=1");
      } catch {
        sonnerToast.error("Could not open measurement — storage blocked.");
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
      if (pref?.id) setSelectedId(pref.id);
      else setSelectedId(null);
      if (cached) {
        const p = normalizePropertyImportPayloadContacts({ ...cached.payload });
        setLastPayload(p);
        setStlParcel(cached.parcel);
        setLastBuildingFootprint(cached.buildingFootprint ?? null);
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
        setLastBuildingFootprint(null);
        setLastOwnerSource("base");
      }
      setFocusLatLng({ lat, lng });
      setSheetOpen(true);
      try {
        setBuildingFootprintOverlay(null);
        let footprintForStash: BuildingFootprintFeature | null = null;
        const url =
          "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=" +
          encodeURIComponent(String(lat)) +
          "&lon=" +
          encodeURIComponent(String(lng));
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Could not resolve address for this point.");
        const data = await parseJsonResponse<{
          display_name?: string;
          address?: Record<string, string | undefined>;
        }>(res, "Nominatim reverse");
        const line = data.display_name?.trim() || "";
        setAddressLine(line);

        let prefForMerge: ContactRecord | null = pref ?? null;
        if (!prefForMerge?.id && line) {
          const byAddr = findLeadMatchingReverseAddress(line, leadsRef.current);
          if (byAddr) {
            prefForMerge = byAddr;
            setSelectedId(byAddr.id);
          }
        }

        let intelParcel: Record<string, unknown> | null = null;
        let ownerSource: OwnerEnrichmentSource = "base";
        if (isInMissouriBbox(lat, lng)) {
          const stl = await fetchStlIntelAtPoint(lat, lng);
          intelParcel = stl?.parcel ?? null;
          if (intelParcel && Object.keys(intelParcel).length > 0) {
            ownerSource = "stl";
          }
        }

        let arcgisRestAttrs: Record<string, unknown> | null = null;
        const parcelOut = await queryArcgisAtPointViaBackend("parcel", lat, lng);
        if (parcelOut.ok) {
          arcgisRestAttrs = parcelOut.attributes;
        } else if (parcelOut.reason === "network" || parcelOut.reason === "api") {
          setPanelHint((curr) =>
            curr
              ? `${curr} Parcel lookup: ${parcelOut.message ?? parcelOut.reason}`
              : `Parcel lookup: ${parcelOut.message ?? parcelOut.reason}`,
          );
        }

        const arcgisMerged = mergeArcgisFeatureSources(arcgisFeatureProps, arcgisRestAttrs);
        const mapHitEmpty = !arcgisFeatureProps || Object.keys(arcgisFeatureProps).length === 0;

        const parcel = mergeParcelAttributes(intelParcel, arcgisMerged);
        const buildingOut = await fetchUsBuildingFootprintAtPoint(lat, lng);
        let buildingNotes = "";
        const buildingFlat: Record<string, unknown> = {};
        let hadFootprintGeometry = false;

        if (buildingOut.ok && buildingOut.geometry) {
          const g = buildingOut.geometry;
          if (g.type === "Polygon" || g.type === "MultiPolygon") {
            footprintForStash = {
              type: "Feature",
              properties: { source: "usgs-building-footprint" },
              geometry: g,
            };
            setBuildingFootprintOverlay({
              type: "FeatureCollection",
              features: [footprintForStash],
            });
            hadFootprintGeometry = true;
            buildingNotes =
              buildingOut.ok && buildingOut.attributes ? formatBuildingFootprintNotes(buildingOut.attributes) : "";
            if (buildingOut.ok && buildingOut.attributes) {
              for (const [k, v] of Object.entries(buildingOut.attributes)) {
                buildingFlat[`BLDG_${k}`] = v;
              }
            }
          }
        }

        if (!hadFootprintGeometry) {
          const osmOut = await fetchOsmBuildingFootprintAtPoint(lat, lng);
          if (osmOut.ok && osmOut.geometry) {
            const g = osmOut.geometry;
            if (g.type === "Polygon" || g.type === "MultiPolygon") {
              footprintForStash = {
                type: "Feature",
                properties: { source: "osm-building" },
                geometry: g,
              };
              setBuildingFootprintOverlay({
                type: "FeatureCollection",
                features: [footprintForStash],
              });
              hadFootprintGeometry = true;
              buildingNotes = osmOut.attributes
                ? formatOsmBuildingFootprintNotes(osmOut.attributes)
                : formatOsmBuildingFootprintNotes({});
              if (osmOut.attributes) {
                for (const [k, v] of Object.entries(osmOut.attributes)) {
                  buildingFlat[`OSM_${k}`] = v;
                }
              }
            }
          }
        }

        if (!hadFootprintGeometry) {
          const lotSq = guessLotSqFtFromParcel(parcel);
          if (lotSq != null) {
            const est = estimateRoofSqFtFromLotSqFtConservative(lotSq);
            if (est) {
              buildingFlat.EST_roof_sqft_plan = est.midpointSqFt;
              buildingNotes = buildingNotes ? `${buildingNotes}\n\n${est.note}` : est.note;
            }
          }
        }
        const parcelForUi =
          parcel && Object.keys(buildingFlat).length ? { ...parcel, ...buildingFlat } : parcel ?? (Object.keys(buildingFlat).length ? buildingFlat : null);
        setStlParcel(parcelForUi);

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

        let base: PropertyImportPayload = prefForMerge
          ? contactToImportBase(prefForMerge)
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
          notes: [base.notes, parcelNotes, buildingNotes].filter(Boolean).join("\n\n"),
        };

        if (prefForMerge) {
          base = {
            ...base,
            ownerName: base.ownerName.trim() || prefForMerge.name.trim(),
            ownerPhone: base.ownerPhone.trim() || prefForMerge.phone.trim(),
            ownerEmail: base.ownerEmail.trim() || prefForMerge.email.trim(),
            contactPersonName: base.contactPersonName.trim() || prefForMerge.name.trim(),
          };
        }

        base = normalizePropertyImportPayloadContacts(base);

        let dealMachineHit = false;
        const primary =
          nominatimReverseToAddressCriteria({
            display_name: data.display_name,
            address: data.address,
          }) ?? parseUsAddressLineForSearch(base.address);
        const fromBuilder = buildCriteriaCandidates({
          payload: base,
          nominatimDisplayName: data.display_name,
          nominatimAddress: data.address,
          lat,
          lng,
        });
        const toTryDm =
          fromBuilder.length > 0 ? fromBuilder : primary ? [primary] : [];
        let lastDmMsg = "";
        for (const criteria of toTryDm) {
          const dm = await fetchDealMachinePropertyByAddress(criteria);
          if (dm.ok) {
            const p = dm.payload;
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
            ownerSource = "dealmachine";
            dealMachineHit = true;
            break;
          }
          lastDmMsg = dm.message;
        }
        if (!dealMachineHit && toTryDm.length && lastDmMsg) {
          setPanelHint((curr) => (curr ? `${curr} Property lookup: ${lastDmMsg}` : `Property lookup: ${lastDmMsg}`));
        } else if (!dealMachineHit && toTryDm.length === 0) {
          setPanelHint((curr) =>
            curr
              ? `${curr} Could not build a full U.S. street address from this pin — try the building or street front.`
              : "Could not build a full U.S. street address from this pin — try the building or street front.",
          );
        }

        base = normalizePropertyImportPayloadContacts(base);

        const org = loadOrgSettings();
        const ownerFallbackOff = org.ownerFallbackProvider === "none" && org.ownerFallbackLockedOff;
        if (!ownerFallbackOff && (!dealMachineHit || !hasRequiredOwnerInfo(base))) {
          const fb = await runOwnerFallbackLookup(org, {
            payload: base,
            nominatimDisplayName: data.display_name,
            nominatimAddress: data.address,
            lat,
            lng,
          });
          if (fb.ok) {
            base = normalizePropertyImportPayloadContacts(fb.payload);
            if (fb.source === "fallback") ownerSource = "fallback";
            if (fb.note) {
              setPanelHint((curr) => (curr ? `${curr} ${fb.note}` : fb.note!));
            }
          }
        }

        base = normalizePropertyImportPayloadContacts(base);

        if (footprintForStash) {
          const gisSq = Math.round(footprintFeaturePlanAreaSqFt(footprintForStash));
          const existing = Number.parseFloat(String(base.areaSqFt).replace(/,/g, ""));
          if (!base.areaSqFt.trim() || !Number.isFinite(existing) || existing <= 0) {
            base = { ...base, areaSqFt: String(gisSq) };
          } else if (Number.isFinite(existing) && gisSq > 400 && existing > gisSq * 2.5) {
            base = {
              ...base,
              areaSqFt: String(gisSq),
              notes: [
                base.notes,
                `Plan area from GIS building footprint (${gisSq} sf); assessor total/living was ${Math.round(existing)} sf — verify before quoting.`,
              ]
                .filter(Boolean)
                .join("\n\n"),
            };
          }
        }

        setOwnerDisplay(base.ownerName || owner);
        setLastPayload(base);
        setLastBuildingFootprint(footprintForStash);
        setLastOwnerSource(ownerSource);
        if (prefForMerge?.id) {
          setEnrichment((prev) =>
            mergeCanvassEnrichment(prev, prefForMerge.id, {
              payload: base,
              parcel: parcelForUi ?? parcel,
              buildingFootprint: footprintForStash,
            }),
          );
        }
        if (autoOpenEstimate) {
          if (requireOwnerInfoBeforeOpen && !hasRequiredOwnerInfo(base)) {
            setSheetOpen(true);
            setPanelHint(
              "Add owner name plus phone, email, or mailing address before opening Measurement, or enter owner details manually.",
            );
          } else {
            openPayloadInEstimator(base, footprintForStash);
          }
        }

        const fromGis = Boolean(arcgisMerged && Object.keys(arcgisMerged).length > 0);
        const intelHit = intelParcel && Object.keys(intelParcel).length > 0;
        if (fromGis && owner && intelHit) {
          setPanelHint(
            "Owner and fields use regional parcel data when available; the map layer fills gaps. Confirm before quoting.",
          );
        } else if (fromGis && owner) {
          setPanelHint(
            mapHitEmpty && arcgisRestAttrs
              ? "Owner and property details from the parcel record at this point. Verify before quoting."
              : "Owner and property details from the map layer you tapped. Verify before quoting.",
          );
        } else if (fromGis && !owner) {
          setPanelHint(
            mapHitEmpty && arcgisRestAttrs
              ? "Parcel attributes found — owner name is not on this layer; check assessor or parcel details."
              : "Map layer loaded — owner name is not on this layer; check parcel details.",
          );
        } else if (intelHit && owner) {
          setPanelHint("Regional parcel record loaded. Confirm owner and building details on the assessor before quoting.");
        } else if (isInMissouriBbox(lat, lng) && !parcel) {
          setPanelHint("No parcel record at this pin — try the building center or a different spot.");
        } else if (!isInMissouriBbox(lat, lng) && !fromGis) {
          setPanelHint(
            "Parcel coverage is strongest in Missouri. Elsewhere you still get the map address — verify the owner locally.",
          );
        } else if (!owner) {
          setPanelHint("Parcel found — owner field not labeled on this layer; see details below.");
        }
        if (buildingOut.ok && (buildingOut.attributes || buildingOut.geometry)) {
          setPanelHint((curr) =>
            curr
              ? `${curr} Building outline from public map data — shown on the map and in details.`
              : "Building outline from public map data — shown on the map and in details.",
          );
        }
      } catch (e) {
        setPanelHint(e instanceof Error ? e.message : "Lookup failed.");
        if (!cached) {
          setAddressLine("");
          setOwnerDisplay("");
          setParcelIdDisplay("");
          setStlParcel(null);
          setLastPayload(null);
          setLastBuildingFootprint(null);
        }
      } finally {
        setPanelBusy(false);
      }
    },
    [autoOpenEstimate, hasRequiredOwnerInfo, openPayloadInEstimator, requireOwnerInfoBeforeOpen],
  );

  const flyTo = useCallback((lat: number, lng: number) => {
    viewCenterRef.current = { lat, lon: lng };
    setMapCenter({ lat, lng });
  }, []);

  const enrichRef = useRef(enrichAtLatLng);
  useEffect(() => {
    enrichRef.current = enrichAtLatLng;
  }, [enrichAtLatLng]);

  const syncArcgisLayer = useCallback(async () => {
    setArcgisBusy(true);
    try {
      const bbox = mapBoundsRef.current;
      const result = await fetchArcgisParcelGeoJsonViaBackend(bbox);
      if (!result.ok) {
        setArcgisParcelOverlay(null);
        setArcgisHint(result.message);
        return;
      }
      const fc = result.data;
      setArcgisParcelOverlay(fc);
      setArcgisHint(
        `${fc.features.length} parcel outlines in this view — tap a boundary for owner details. Outside covered areas, add owner info manually.`,
      );
    } finally {
      setArcgisBusy(false);
    }
  }, []);

  const scheduleArcgisSync = useCallback(() => {
    if (arcgisSyncDebounceRef.current != null) window.clearTimeout(arcgisSyncDebounceRef.current);
    arcgisSyncDebounceRef.current = window.setTimeout(() => {
      arcgisSyncDebounceRef.current = null;
      void syncArcgisLayer();
    }, 400);
  }, [syncArcgisLayer]);

  const handleMapBounds = useCallback(
    (b: { west: number; south: number; east: number; north: number }) => {
      mapBoundsRef.current = b;
      scheduleArcgisSync();
    },
    [scheduleArcgisSync],
  );

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
      setPanelHint("Add owner name plus phone, email, or mailing address before opening Measurement.");
      return;
    }
    openPayloadInEstimator(lastPayload, lastBuildingFootprint);
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

  const contactOwnerPhone = lastPayload?.ownerPhone.trim() ?? "";
  const contactPersonPhoneDisplay = lastPayload?.contactPersonPhone.trim() ?? "";
  const contactPrimaryPhone = contactOwnerPhone || contactPersonPhoneDisplay || "—";
  const contactShowSecondPhone =
    Boolean(contactOwnerPhone && contactPersonPhoneDisplay && contactOwnerPhone !== contactPersonPhoneDisplay);

  return (
    <div
      data-canvass-route
      className="relative flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] min-h-0 w-full shrink-0 flex-col overflow-hidden bg-black text-zinc-950 lg:h-[100dvh] lg:min-h-0"
    >
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

      <div className="canvass-paper shrink-0 flex flex-wrap items-center gap-2 border-b border-gray-200/80 bg-white/98 px-3 py-2.5 shadow-[0_4px_24px_rgba(15,23,42,0.08)] backdrop-blur-md">
              <Button asChild variant="ghost" size="sm" className="text-zinc-950 hover:bg-gray-100">
                <Link to="/">← Back</Link>
              </Button>
              <span className="text-sm font-semibold text-zinc-950">Canvassing</span>
              <span className="hidden text-xs text-zinc-700 sm:inline">
                Tap parcel or pin — owner + lead match (120m) — property panel opens without covering map controls
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-1">
                {leads.length > 0 ? (
                  <span className="mr-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-zinc-950" title="Emerald = owner + contact ready">
                    {leads.length} pins
                  </span>
                ) : null}
                <span className="hidden text-[11px] text-zinc-950 sm:inline" title="Route leads with owner + contact show emerald">
                  Emerald = ready
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-zinc-950 hover:bg-gray-100"
                  title="Add leads CSV"
                  onClick={() => csvInputRef.current?.click()}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-zinc-950 hover:bg-gray-100"
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
                  className="h-8 w-8 text-zinc-950 hover:bg-gray-100"
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
                  className="h-8 w-8 text-zinc-950 hover:bg-gray-100"
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
                  className="h-8 w-8 text-zinc-950 hover:bg-gray-100"
                  title="Refresh parcel outlines on the map"
                  onClick={() => void syncArcgisLayer()}
                >
                  <Layers className={`h-4 w-4 ${arcgisBusy ? "opacity-50" : ""}`} />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs text-zinc-950"
                  title="Run owner/parcel lookup at current map center"
                  onClick={() => enrichAtMapCenter()}
                >
                  Use map center
                </Button>
              </div>
            </div>
            {arcgisHint ? (
              <div className="shrink-0 border-b border-sky-200 bg-sky-50 px-3 py-1.5 text-center text-[11px] text-zinc-950 backdrop-blur-md">
                Parcels: {arcgisHint}
              </div>
            ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2 pb-2 sm:p-2.5 sm:pb-2.5 lg:flex-row lg:items-stretch">
            <div className="relative h-full min-h-[10rem] min-w-0 flex-1 overflow-hidden rounded-2xl border border-zinc-800/85 bg-zinc-950 shadow-[0_12px_48px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.06] lg:min-h-0 [&_.maplibregl-ctrl-top-left]:mt-2 [&_.maplibregl-ctrl-top-left]:ml-2">
            <Map3D
              center={mapCenter}
              zoom={17}
              pitch={50}
              bearing={0}
              height="100%"
              enableGps
              parcelOverlay={arcgisParcelOverlay}
              buildingFootprintOverlay={buildingFootprintOverlay}
              arcgisServerTileUrl={arcgisMapTile?.url ?? undefined}
              arcgisServerTileOpacity={arcgisMapTile?.opacity}
              arcgisServerTileAttribution={arcgisMapTile?.attribution}
              style={{ position: "absolute", inset: 0 }}
              points={leads
                .filter((c) => c.lat != null && c.lng != null)
                .map((c) => {
                  const st = states[c.id]?.status ?? "new";
                  const ownerReady = hasRequiredOwnerInfo(
                    normalizePropertyImportPayloadContacts(
                      enrichment[c.id]?.payload ?? contactToImportBase(c),
                    ),
                  );
                  const color = ownerReady
                    ? "#10b981"
                    : st === "interested"
                      ? "#22c55e"
                      : st === "visited"
                        ? "#3b82f6"
                        : st === "skip"
                          ? "#6b7280"
                          : "#ef4444";
                  return {
                    id: c.id,
                    lat: c.lat!,
                    lng: c.lng!,
                    label: c.name || c.address || "Lead",
                    color,
                  };
                }) as Map3DPoint[]}
              onMapClick={(lat, lng, parcelHit) => {
                viewCenterRef.current = { lat, lon: lng };
                void enrichAtLatLng(lat, lng, findNearestLead(leads, lat, lng), parcelHit ?? null);
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
              onBoundsChange={handleMapBounds}
            />
            <div className="pointer-events-none absolute bottom-3 left-3 z-[5] max-w-[min(92vw,260px)] rounded-xl border border-white/25 bg-white/[0.94] px-2.5 py-2 text-[10px] leading-snug text-zinc-950 shadow-lg backdrop-blur-sm sm:bottom-4 sm:left-4 sm:text-xs">
              <div className="font-semibold tracking-wide text-zinc-950">Canvass map</div>
              <ul className="mt-1.5 space-y-0.5 text-zinc-800">
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-sm bg-emerald-500" aria-hidden />
                  <span>Emerald pin — owner + contact ready for estimate</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-sm bg-red-500" aria-hidden />
                  <span>Red / blue / gray — route status (new → visited)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-sm border border-emerald-600 bg-emerald-500/30" aria-hidden />
                  <span>Green outline — parcel boundary (tap for owner)</span>
                </li>
                {arcgisMapTile?.url ? (
                  <li className="flex items-start gap-1.5 text-zinc-700">
                    <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-sm bg-amber-400/90" aria-hidden />
                    <span>Faint overlay — optional reference layer from your organization</span>
                  </li>
                ) : null}
              </ul>
            </div>
            {toast ? (
              <div className="canvass-paper pointer-events-none absolute left-1/2 top-14 z-[25] -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-xs text-zinc-950 shadow-lg sm:top-16">
                {toast}
              </div>
            ) : null}
            {!sheetOpen ? (
              <button
                type="button"
                className="canvass-paper pointer-events-auto absolute bottom-4 left-1/2 z-[25] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-center text-sm text-zinc-950 shadow-lg backdrop-blur-md sm:px-5"
                onClick={() => setSheetOpen(true)}
              >
                Tap a lead pin or Use map center — then load owner &amp; parcel
              </button>
            ) : null}
            </div>

            {sheetOpen ? (
            <aside className="canvass-light-sheet flex max-h-[min(44vh,420px)] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white pb-[env(safe-area-inset-bottom,0px)] text-zinc-950 shadow-md ring-1 ring-black/[0.04] lg:h-auto lg:max-h-none lg:w-[min(100%,400px)] lg:min-w-[min(100%,320px)] lg:shrink-0">
              <div className="canvass-sheet-header flex shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-slate-50 via-white to-white px-4 py-2.5">
                <span className="text-sm font-semibold uppercase tracking-wide text-zinc-950">
                  {panelBusy ? "Loading…" : "Property"}
                </span>
                <button
                  type="button"
                  className="rounded-full p-1.5 text-zinc-950 hover:bg-gray-100"
                  aria-label="Close"
                  onClick={() => setSheetOpen(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="canvass-sheet-body min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 pb-6 pt-3 text-sm text-zinc-950">
                {panelHint ? <p className="text-xs text-amber-900">{panelHint}</p> : null}
                <p className="text-[11px] leading-snug text-zinc-950">
                  Owner and contact fields come from public parcel and map data where available, plus automated property
                  lookup when we can match a full U.S. address — not generic web search.
                </p>
                {focusLatLng ? (
                  <p className="flex items-center gap-1 text-xs text-zinc-950">
                    <Navigation className="h-3.5 w-3.5 shrink-0" />
                    {focusLatLng.lat.toFixed(5)}, {focusLatLng.lng.toFixed(5)}
                  </p>
                ) : null}

                <div>
                  <div className="text-xs font-medium text-zinc-950">Owner (assessor / map layer)</div>
                  <div className="text-base font-semibold text-zinc-950">{ownerDisplay || "—"}</div>
                </div>
                {lastPayload ? (
                  <div>
                    <div className="text-xs font-medium text-zinc-950">Contact info</div>
                    <div className="mt-0.5 space-y-1 text-sm text-zinc-950">
                      <div>
                        <span className="text-zinc-600">Phone: </span>
                        {contactPrimaryPhone}
                      </div>
                      {contactShowSecondPhone ? (
                        <div>
                          <span className="text-zinc-600">Contact phone: </span>
                          {contactPersonPhoneDisplay}
                        </div>
                      ) : null}
                      {lastPayload.ownerEmail.trim() ? (
                        <div>
                          <span className="text-zinc-600">Email: </span>
                          {lastPayload.ownerEmail.trim()}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {hasRequiredOwnerInfo(lastPayload) ? (
                  <div className="canvass-lock-hint rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-zinc-950">
                    Owner ready: name + phone or email on file.
                  </div>
                ) : null}
                {lastPayload ? (
                  <div className="text-[11px] text-zinc-950">
                    <span className="font-medium text-zinc-950">Source: </span>
                    {lastOwnerSource === "stl"
                      ? "Regional parcel supplement"
                      : lastOwnerSource === "dealmachine"
                          ? "Property records lookup"
                          : lastOwnerSource === "fallback"
                            ? "Supplemental lookup"
                            : "Map / lead"}
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
                  <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-zinc-950">
                    <div className="mb-1.5 font-semibold text-zinc-950">Auto-filled for estimator</div>
                    <ul className="space-y-1">
                      {lastPayload.contactPersonName.trim() ? (
                        <li>
                          <span className="text-zinc-950">Contact person: </span>
                          {lastPayload.contactPersonName}
                        </li>
                      ) : null}
                      {lastPayload.contactPersonPhone.trim() ? (
                        <li>
                          <span className="text-zinc-950">Contact phone: </span>
                          {lastPayload.contactPersonPhone}
                        </li>
                      ) : null}
                      {(lastPayload.ownerPmEntityLabel ?? "").trim() ? (
                        <li>
                          <span className="text-zinc-950">PM / entity: </span>
                          {lastPayload.ownerPmEntityLabel}
                        </li>
                      ) : null}
                      {lastPayload.ownerEntityType.trim() ? (
                        <li>
                          <span className="text-zinc-950">Owner type: </span>
                          {lastPayload.ownerEntityType}
                        </li>
                      ) : null}
                      {lastPayload.ownerPhone ? (
                        <li>
                          <span className="text-zinc-950">Phone: </span>
                          {lastPayload.ownerPhone}
                        </li>
                      ) : null}
                      {lastPayload.ownerEmail ? (
                        <li>
                          <span className="text-zinc-950">Email: </span>
                          {lastPayload.ownerEmail}
                        </li>
                      ) : null}
                      {lastPayload.ownerMailingAddress ? (
                        <li>
                          <span className="text-zinc-950">Mailing: </span>
                          {lastPayload.ownerMailingAddress}
                        </li>
                      ) : null}
                      {lastPayload.areaSqFt ? (
                        <li>
                          <span className="text-zinc-950">Area: </span>
                          {lastPayload.areaSqFt} sq ft
                        </li>
                      ) : null}
                      {lastPayload.yearBuilt ? (
                        <li>
                          <span className="text-zinc-950">Year built: </span>
                          {lastPayload.yearBuilt}
                        </li>
                      ) : null}
                      {lastPayload.lotSizeSqFt ? (
                        <li>
                          <span className="text-zinc-950">Lot: </span>
                          {lastPayload.lotSizeSqFt} sq ft
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                {parcelIdDisplay ? (
                  <div className="text-xs text-zinc-950">
                    <span className="font-medium text-zinc-950">Parcel / ID: </span>
                    {parcelIdDisplay}
                  </div>
                ) : null}

                {addressLine ? (
                  <div>
                    <div className="text-xs font-medium text-zinc-950">Address</div>
                    <p className="whitespace-pre-wrap text-zinc-950">{addressLine}</p>
                  </div>
                ) : null}

                {stlParcel && parcelDetailRows.length > 0 ? (
                  <details className="canvass-parcel-details rounded-lg border border-gray-100 bg-gray-50/80">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-zinc-950">
                      Tax assessor / parcel attributes
                    </summary>
                    <ul className="max-h-[min(42vh,360px)] space-y-1 overflow-y-auto px-3 pb-2 text-xs text-zinc-950">
                      {parcelDetailRows.map((r) => (
                        <li key={r.key}>
                          <span className="text-zinc-950">{r.key}: </span>
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
                  <div className="canvass-route-block rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="text-xs font-medium text-zinc-950">Route pin</div>
                    <div className="font-medium text-zinc-950">{selectedLead.name || selectedLead.address || "Lead"}</div>
                    {selectedLead.phone.trim() ? (
                      <div className="mt-1 text-sm text-zinc-950">
                        <span className="text-zinc-600">Phone: </span>
                        {selectedLead.phone.trim()}
                      </div>
                    ) : null}
                    {selectedLead.email.trim() ? (
                      <div className="text-sm text-zinc-950">
                        <span className="text-zinc-600">Email: </span>
                        {selectedLead.email.trim()}
                      </div>
                    ) : null}
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
                      className="mt-2 w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs text-zinc-950 placeholder:text-zinc-600 [color-scheme:light]"
                      rows={2}
                      placeholder="Quick note…"
                      value={states[selectedLead.id]?.notes ?? ""}
                      onChange={(e) => updateNotes(selectedLead.id, e.target.value)}
                    />
                  </div>
                ) : null}

                <Button
                  type="button"
                  size="lg"
                  className="w-full gap-2 bg-zinc-900 font-semibold text-white shadow-md hover:bg-zinc-800"
                  disabled={!lastPayload || panelBusy || (requireOwnerInfoBeforeOpen && !hasRequiredOwnerInfo(lastPayload))}
                  onClick={openInEstimator}
                >
                  <Ruler className="h-4 w-4" />
                  Instant Estimate in Measurement
                </Button>
                <label className="flex items-center gap-2 text-xs text-zinc-950">
                  <input
                    type="checkbox"
                    checked={autoOpenEstimate}
                    onChange={(e) => setAutoOpenEstimate(e.target.checked)}
                  />
                  Auto-open instant estimate when I click a property
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-950">
                  <input
                    type="checkbox"
                    checked={requireOwnerInfoBeforeOpen}
                    onChange={(e) => setRequireOwnerInfoBeforeOpen(e.target.checked)}
                  />
                  Require owner + contact info before opening Measurement
                </label>
              </div>
            </aside>
            ) : null}
          </div>
    </div>
  );
}
