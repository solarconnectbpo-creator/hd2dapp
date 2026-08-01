import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { getScopedStorageKey } from "../lib/userScopedStorage";
import {
  applyRemote,
  commitPush,
  diffLocal,
  emptySyncMeta,
  type PushRecord,
  type SyncMeta,
  type WorkspaceKind,
} from "../lib/workspaceSyncEngine";
import { pullWorkspaceRecords, pushWorkspaceRecords } from "../lib/workspaceSyncClient";
import {
  type DamagePhoto,
  type DamagePhotoAiSummary,
  type FieldPipelineStage,
  type FieldProject,
  MAX_FIELD_PROJECT_PHOTOS,
  normalizeFieldProject,
  normalizeTagList,
  optHttpsUrl,
  isFieldPipelineStage,
} from "../lib/fieldProjectTypes";
import { inferRoofFormType } from "../lib/roofGeometryFromPolygons";
import type { FormState } from "../features/measurement/measurementFormTypes";
import type { ProposalState } from "../features/measurement/proposalTypes";

export type RoofFormKind = "gable" | "hip" | "flat" | "mansard" | "complex";

/** Snapshot so a printed proposal can be reopened in Proposal Builder. */
export interface ContractBuilderSnapshot {
  form: FormState;
  proposal: ProposalState;
}

export interface Measurement {
  id: string;
  projectName: string;
  date: string;
  /** Roofing material / system from intake (e.g. "TPO 60-mil MA", "Asphalt Shingle"). */
  roofMaterial: string;
  /** Diagram / geometry model (gable, hip, flat, etc.). */
  roofForm: RoofFormKind;
  length: number;
  width: number;
  pitch: number;
  totalArea: number;
  wastePercentage: number;
  adjustedArea: number;
}

export interface Estimate {
  id: string;
  measurementId: string;
  projectName: string;
  date: string;
  materials: {
    name: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }[];
  labor: {
    description: string;
    hours: number;
    hourlyRate: number;
    totalCost: number;
  }[];
  subtotal: number;
  tax: number;
  /** Line items + tax before +50% estimate adjustment (when present). */
  rcvBeforeMarkup?: number;
  /** Dollar amount added for +50% RCV adjustment (when present). */
  estimateMarkup?: number;
  total: number;
}

export interface Contract {
  id: string;
  estimateId: string;
  projectName: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  date: string;
  startDate: string;
  completionDate: string;
  terms: string;
  totalAmount: number;
  depositAmount: number;
  status: "draft" | "sent" | "signed";
  /** Present when created/updated from New Measurement Proposal Builder. */
  builderSnapshot?: ContractBuilderSnapshot;
}

export type { DamagePhoto, DamagePhotoAiSummary, FieldPipelineStage, FieldProject };

interface RoofingContextType {
  measurements: Measurement[];
  estimates: Estimate[];
  contracts: Contract[];
  fieldProjects: FieldProject[];
  addMeasurement: (measurement: Measurement) => void;
  addEstimate: (estimate: Estimate) => void;
  addContract: (contract: Contract) => void;
  updateContract: (id: string, patch: Partial<Omit<Contract, "id">>) => void;
  updateEstimate: (id: string, patch: Partial<Omit<Estimate, "id">>) => void;
  getContractById: (id: string) => Contract | undefined;
  addFieldProject: (input: {
    name: string;
    address?: string;
    notes?: string;
    ghlUrl?: string;
    ghlEmbedUrl?: string;
    monetaryValueUsd?: number;
    ownerLabel?: string;
    tags?: string | string[];
    /** Defaults to intake when omitted or invalid. */
    pipelineStage?: FieldPipelineStage;
  }) => FieldProject;
  updateFieldProject: (
    id: string,
    patch: Partial<
      Pick<FieldProject, "name" | "address" | "notes" | "linkedMeasurementId" | "ghlUrl" | "ghlEmbedUrl">
    > & {
      monetaryValueUsd?: number | null;
      ownerLabel?: string | null;
      tags?: string[] | null;
    },
  ) => void;
  deleteFieldProject: (id: string) => void;
  setFieldProjectPipelineStage: (id: string, stage: FieldPipelineStage) => void;
  addFieldProjectPhoto: (projectId: string, imageDataUrl: string, caption?: string) => boolean;
  removeFieldProjectPhoto: (projectId: string, photoId: string) => void;
  updateFieldProjectPhotoCaption: (projectId: string, photoId: string, caption: string) => void;
  setFieldProjectPhotoAiSummary: (
    projectId: string,
    photoId: string,
    summary: DamagePhotoAiSummary,
  ) => void;
  /** Replaces all persisted roofing data (used after JSON backup import). */
  replaceAllRoofingData: (payload: {
    measurements: Measurement[];
    estimates: Estimate[];
    contracts: Contract[];
    fieldProjects: FieldProject[];
  }) => void;
  getMeasurementById: (id: string) => Measurement | undefined;
  getEstimateById: (id: string) => Estimate | undefined;
  getFieldProjectById: (id: string) => FieldProject | undefined;
  /** Remove an estimate (and any measurement no longer referenced by another estimate). */
  deleteEstimate: (id: string) => void;
  deleteContract: (id: string) => void;
  deleteMeasurement: (id: string) => void;
  /** Server sync state for the "saved to your account" indicator. */
  sync: WorkspaceSyncState;
  /** Force a pull+push cycle (e.g. a Retry button). */
  syncNow: () => void;
}

export type WorkspaceSyncState = {
  /** 'off' when signed out or the API is unreachable-by-config. */
  status: "off" | "idle" | "syncing" | "error";
  lastSyncedAt: number | null;
  error: string | null;
};

const RoofingContext = createContext<RoofingContextType | undefined>(undefined);

const LS_KEY_BASE = "roofing-pro-context-v1";

const ROOF_FORMS = new Set<RoofFormKind>(["gable", "hip", "flat", "mansard", "complex"]);

function isRoofForm(s: string): s is RoofFormKind {
  return ROOF_FORMS.has(s as RoofFormKind);
}

/** Migrate older saves that stored only structural `roofType` instead of material + form. */
export function normalizeMeasurement(raw: Record<string, unknown>): Measurement | null {
  const id = raw.id;
  const projectName = raw.projectName;
  const date = raw.date;
  if (typeof id !== "string" || typeof projectName !== "string" || typeof date !== "string") return null;

  const num = (k: string, d: number) => {
    const v = raw[k];
    return typeof v === "number" && Number.isFinite(v) ? v : d;
  };

  let roofMaterial: string;
  let roofForm: RoofFormKind;

  if (typeof raw.roofMaterial === "string") {
    roofMaterial = raw.roofMaterial;
    roofForm =
      typeof raw.roofForm === "string" && isRoofForm(raw.roofForm)
        ? raw.roofForm
        : inferRoofFormType(roofMaterial, "auto");
  } else {
    const legacy = typeof raw.roofType === "string" ? raw.roofType : "";
    if (legacy && isRoofForm(legacy)) {
      roofMaterial = "Asphalt Shingle";
      roofForm = legacy;
    } else {
      roofMaterial = legacy || "Asphalt Shingle";
      roofForm = inferRoofFormType(roofMaterial, "auto");
    }
  }

  return {
    id,
    projectName,
    date,
    roofMaterial,
    roofForm,
    length: num("length", 0),
    width: num("width", 0),
    pitch: num("pitch", 0),
    totalArea: num("totalArea", 0),
    wastePercentage: num("wastePercentage", 0),
    adjustedArea: num("adjustedArea", 0),
  };
}

function newFieldProjectId(): string {
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newPhotoId(): string {
  return `ph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Collections mirrored to the Worker, in the order they are pulled. */
const SYNC_KINDS: WorkspaceKind[] = ["measurement", "estimate", "contract", "field_project"];

const SYNC_META_KEY_BASE = "roofing-workspace-sync-meta-v1";

type SyncMetaByKind = Partial<Record<WorkspaceKind, SyncMeta>>;

function loadSyncMeta(): SyncMetaByKind {
  if (typeof window === "undefined") return {};
  const key = getScopedStorageKey(SYNC_META_KEY_BASE);
  if (!key) return {};
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SyncMetaByKind) : {};
  } catch {
    return {};
  }
}

function saveSyncMeta(meta: SyncMetaByKind): void {
  if (typeof window === "undefined") return;
  const key = getScopedStorageKey(SYNC_META_KEY_BASE);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(meta));
  } catch {
    // Quota exceeded — sync still works, it just re-pushes more than needed next time.
  }
}

function metaFor(all: SyncMetaByKind, kind: WorkspaceKind): SyncMeta {
  return all[kind] ?? emptySyncMeta();
}

export function RoofingProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const storageUserId = user?.id ?? null;
  const token = session?.token ?? "";

  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [fieldProjects, setFieldProjects] = useState<FieldProject[]>([]);

  useEffect(() => {
    setMeasurements([]);
    setEstimates([]);
    setContracts([]);
    setFieldProjects([]);
    if (typeof window === "undefined" || !storageUserId) return;
    const key = getScopedStorageKey(LS_KEY_BASE);
    if (!key) return;
    const raw = window.localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        measurements?: unknown[];
        estimates?: Estimate[];
        contracts?: Contract[];
        fieldProjects?: unknown[];
      };
      if (Array.isArray(parsed.measurements)) {
        const next: Measurement[] = [];
        for (const row of parsed.measurements) {
          if (row && typeof row === "object") {
            const m = normalizeMeasurement(row as Record<string, unknown>);
            if (m) next.push(m);
          }
        }
        setMeasurements(next);
      }
      if (Array.isArray(parsed.estimates)) setEstimates(parsed.estimates);
      if (Array.isArray(parsed.contracts)) setContracts(parsed.contracts);
      if (Array.isArray(parsed.fieldProjects)) {
        const fp: FieldProject[] = [];
        for (const row of parsed.fieldProjects) {
          if (row && typeof row === "object") {
            const p = normalizeFieldProject(row as Record<string, unknown>);
            if (p) fp.push(p);
          }
        }
        setFieldProjects(fp);
      }
    } catch {
      // ignore invalid storage
    }
  }, [storageUserId]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageUserId) return;
    const key = getScopedStorageKey(LS_KEY_BASE);
    if (!key) return;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ measurements, estimates, contracts, fieldProjects }),
      );
    } catch (e) {
      // Local cache is best-effort; the server copy is the durable one.
      console.warn("[roofing] local cache write failed (quota?)", e);
    }
  }, [measurements, estimates, contracts, fieldProjects, storageUserId]);

  // ---- Server sync -------------------------------------------------------
  // localStorage above is a fast offline cache; D1 via /api/workspace is the source of truth.

  const [sync, setSync] = useState<WorkspaceSyncState>({
    status: "off",
    lastSyncedAt: null,
    error: null,
  });

  const syncMetaRef = useRef<SyncMetaByKind>({});
  const runningRef = useRef(false);
  const rerunRef = useRef(false);
  const hydratedRef = useRef(false);
  // Read collections inside the sync loop without making it a dependency.
  const latestRef = useRef({ measurements, estimates, contracts, fieldProjects });
  latestRef.current = { measurements, estimates, contracts, fieldProjects };

  useEffect(() => {
    hydratedRef.current = false;
    syncMetaRef.current = storageUserId ? loadSyncMeta() : {};
    setSync({ status: storageUserId ? "idle" : "off", lastSyncedAt: null, error: null });
  }, [storageUserId]);

  const runSync = useCallback(async () => {
    if (!token || !storageUserId) return;
    if (runningRef.current) {
      rerunRef.current = true;
      return;
    }
    runningRef.current = true;
    setSync((s) => ({ ...s, status: "syncing", error: null }));

    try {
      const meta = { ...syncMetaRef.current };

      // 1) Pull anything changed on other devices since our watermark.
      const lowestWatermark = SYNC_KINDS.reduce(
        (min, kind) => Math.min(min, metaFor(meta, kind).watermark),
        Number.POSITIVE_INFINITY,
      );
      const since = Number.isFinite(lowestWatermark) ? lowestWatermark : 0;
      const pulled = await pullWorkspaceRecords(token, SYNC_KINDS, since);

      const byKind = new Map<WorkspaceKind, typeof pulled.records>();
      for (const rec of pulled.records) {
        const list = byKind.get(rec.kind) ?? [];
        list.push(rec);
        byKind.set(rec.kind, list);
      }

      const applyKind = <T,>(
        kind: WorkspaceKind,
        items: T[],
        getId: (t: T) => string,
        toItem: (d: unknown) => T | null,
        setItems: (next: T[]) => void,
      ) => {
        const res = applyRemote(items, byKind.get(kind) ?? [], getId, metaFor(meta, kind), toItem);
        meta[kind] = res.nextMeta;
        if (res.changed) setItems(res.items);
        return res.items;
      };

      const cur = latestRef.current;
      const nextMeasurements = applyKind<Measurement>(
        "measurement",
        cur.measurements,
        (m) => m.id,
        (d) => (d && typeof d === "object" ? normalizeMeasurement(d as Record<string, unknown>) : null),
        setMeasurements,
      );
      const nextEstimates = applyKind<Estimate>(
        "estimate",
        cur.estimates,
        (e) => e.id,
        (d) => (d && typeof d === "object" && typeof (d as Estimate).id === "string" ? (d as Estimate) : null),
        setEstimates,
      );
      const nextContracts = applyKind<Contract>(
        "contract",
        cur.contracts,
        (c) => c.id,
        (d) => (d && typeof d === "object" && typeof (d as Contract).id === "string" ? (d as Contract) : null),
        setContracts,
      );
      const nextFieldProjects = applyKind<FieldProject>(
        "field_project",
        cur.fieldProjects,
        (p) => p.id,
        (d) => (d && typeof d === "object" ? normalizeFieldProject(d as Record<string, unknown>) : null),
        setFieldProjects,
      );

      // 2) Push local creates/edits/deletes.
      const nowSec = Math.floor(Date.now() / 1000);
      const outgoing: PushRecord[] = [];
      const stageDiff = <T,>(kind: WorkspaceKind, items: T[], getId: (t: T) => string) => {
        const d = diffLocal(kind, items, getId, metaFor(meta, kind), nowSec);
        meta[kind] = d.nextMeta;
        outgoing.push(...d.push);
        return d.push;
      };

      const pushed: PushRecord[] = [
        ...stageDiff<Measurement>("measurement", nextMeasurements, (m) => m.id),
        ...stageDiff<Estimate>("estimate", nextEstimates, (e) => e.id),
        ...stageDiff<Contract>("contract", nextContracts, (c) => c.id),
        ...stageDiff<FieldProject>("field_project", nextFieldProjects, (p) => p.id),
      ];

      if (outgoing.length > 0) {
        const result = await pushWorkspaceRecords(token, outgoing);
        for (const kind of SYNC_KINDS) {
          const forKind = pushed.filter((r) => r.kind === kind);
          if (forKind.length > 0) {
            meta[kind] = commitPush(metaFor(meta, kind), forKind, result.watermark);
          }
        }
        if (result.rejected.length > 0) {
          console.warn("[roofing] server rejected records", result.rejected);
        }
      }

      for (const kind of SYNC_KINDS) {
        const m = metaFor(meta, kind);
        meta[kind] = { ...m, watermark: Math.max(m.watermark, pulled.watermark) };
      }

      syncMetaRef.current = meta;
      saveSyncMeta(meta);
      hydratedRef.current = true;
      setSync({ status: "idle", lastSyncedAt: Date.now(), error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed.";
      // Offline or a 5xx is expected sometimes — local cache still holds the work.
      setSync((s) => ({ status: "error", lastSyncedAt: s.lastSyncedAt, error: message }));
    } finally {
      runningRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        void runSync();
      }
    }
  }, [token, storageUserId]);

  // Initial hydrate on sign-in.
  useEffect(() => {
    if (!token || !storageUserId) return;
    void runSync();
  }, [token, storageUserId, runSync]);

  // Debounced push after local edits settle.
  useEffect(() => {
    if (!token || !storageUserId || !hydratedRef.current) return;
    const t = window.setTimeout(() => void runSync(), 1500);
    return () => window.clearTimeout(t);
  }, [measurements, estimates, contracts, fieldProjects, token, storageUserId, runSync]);

  const syncNow = useCallback(() => {
    void runSync();
  }, [runSync]);

  const api = useMemo<RoofingContextType>(
    () => ({
      measurements,
      estimates,
      contracts,
      fieldProjects,
      addMeasurement: (measurement: Measurement) =>
        setMeasurements((prev) => [...prev, measurement]),
      addEstimate: (estimate: Estimate) => setEstimates((prev) => [...prev, estimate]),
      addContract: (contract: Contract) => setContracts((prev) => [...prev, contract]),
      updateContract: (id, patch) =>
        setContracts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...patch, id: c.id } : c)),
        ),
      updateEstimate: (id, patch) =>
        setEstimates((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...patch, id: e.id } : e)),
        ),
      getContractById: (id) => contracts.find((c) => c.id === id),
      addFieldProject: (input) => {
        const now = new Date().toISOString();
        const ghlUrl = input.ghlUrl ? optHttpsUrl(input.ghlUrl.trim()) : undefined;
        const ghlEmbedUrl = input.ghlEmbedUrl ? optHttpsUrl(input.ghlEmbedUrl.trim()) : undefined;
        const tags = normalizeTagList(input.tags);
        const ownerLabel = input.ownerLabel?.trim().slice(0, 120);
        const initialStage =
          input.pipelineStage && isFieldPipelineStage(input.pipelineStage) ? input.pipelineStage : "intake";
        let monetaryValueUsd: number | undefined;
        if (typeof input.monetaryValueUsd === "number" && Number.isFinite(input.monetaryValueUsd)) {
          const v = Math.max(0, input.monetaryValueUsd);
          monetaryValueUsd = Math.round(v * 100) / 100;
        }
        const p: FieldProject = {
          id: newFieldProjectId(),
          name: input.name.trim().slice(0, 200),
          address: input.address?.trim().slice(0, 500),
          notes: input.notes?.trim().slice(0, 2000),
          createdAt: now,
          updatedAt: now,
          pipelineStage: initialStage,
          photos: [],
          linkedMeasurementId: null,
          tags,
          ...(monetaryValueUsd != null ? { monetaryValueUsd } : {}),
          ...(ownerLabel ? { ownerLabel } : {}),
          ...(ghlUrl ? { ghlUrl } : {}),
          ...(ghlEmbedUrl ? { ghlEmbedUrl } : {}),
        };
        setFieldProjects((prev) => [...prev, p]);
        return p;
      },
      updateFieldProject: (id, patch) => {
        setFieldProjects((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            const now = new Date().toISOString();
            let next = { ...p, updatedAt: now };
            if (patch.name !== undefined) next = { ...next, name: patch.name.trim().slice(0, 200) };
            if (patch.address !== undefined) {
              const a = patch.address?.trim().slice(0, 500);
              next = { ...next, address: a || undefined };
            }
            if (patch.notes !== undefined) {
              const n = patch.notes?.trim().slice(0, 2000);
              next = { ...next, notes: n || undefined };
            }
            if (patch.linkedMeasurementId !== undefined) {
              next = { ...next, linkedMeasurementId: patch.linkedMeasurementId ?? null };
            }
            if (patch.ghlUrl !== undefined) {
              const raw = typeof patch.ghlUrl === "string" ? patch.ghlUrl.trim() : "";
              const u = raw ? optHttpsUrl(raw) : undefined;
              next = { ...next, ...(u ? { ghlUrl: u } : {}) };
              if (!u) delete next.ghlUrl;
            }
            if (patch.ghlEmbedUrl !== undefined) {
              const raw = typeof patch.ghlEmbedUrl === "string" ? patch.ghlEmbedUrl.trim() : "";
              const u = raw ? optHttpsUrl(raw) : undefined;
              next = { ...next, ...(u ? { ghlEmbedUrl: u } : {}) };
              if (!u) delete next.ghlEmbedUrl;
            }
            if (patch.monetaryValueUsd !== undefined) {
              if (patch.monetaryValueUsd === null) {
                delete next.monetaryValueUsd;
              } else if (typeof patch.monetaryValueUsd === "number" && Number.isFinite(patch.monetaryValueUsd)) {
                const v = Math.max(0, patch.monetaryValueUsd);
                next = { ...next, monetaryValueUsd: Math.round(v * 100) / 100 };
              }
            }
            if (patch.ownerLabel !== undefined) {
              if (patch.ownerLabel === null || patch.ownerLabel === "") {
                delete next.ownerLabel;
              } else {
                next = { ...next, ownerLabel: patch.ownerLabel.trim().slice(0, 120) };
              }
            }
            if (patch.tags !== undefined) {
              next = {
                ...next,
                tags: patch.tags === null ? [] : normalizeTagList(patch.tags),
              };
            }
            return next;
          }),
        );
      },
      deleteFieldProject: (id) => setFieldProjects((prev) => prev.filter((p) => p.id !== id)),
      setFieldProjectPipelineStage: (id, stage) => {
        const now = new Date().toISOString();
        setFieldProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, pipelineStage: stage, updatedAt: now } : p)),
        );
      },
      addFieldProjectPhoto: (projectId, imageDataUrl, caption) => {
        let added = false;
        setFieldProjects((prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            if (p.photos.length >= MAX_FIELD_PROJECT_PHOTOS) return p;
            const now = new Date().toISOString();
            const photo: DamagePhoto = {
              id: newPhotoId(),
              capturedAt: now,
              caption: caption?.trim().slice(0, 500),
              imageDataUrl,
            };
            added = true;
            return { ...p, photos: [...p.photos, photo], updatedAt: now };
          }),
        );
        return added;
      },
      removeFieldProjectPhoto: (projectId, photoId) => {
        const now = new Date().toISOString();
        setFieldProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? { ...p, photos: p.photos.filter((x) => x.id !== photoId), updatedAt: now }
              : p,
          ),
        );
      },
      updateFieldProjectPhotoCaption: (projectId, photoId, caption) => {
        const now = new Date().toISOString();
        setFieldProjects((prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              photos: p.photos.map((ph) =>
                ph.id === photoId ? { ...ph, caption: caption.trim().slice(0, 500) } : ph,
              ),
              updatedAt: now,
            };
          }),
        );
      },
      setFieldProjectPhotoAiSummary: (projectId, photoId, summary) => {
        const now = new Date().toISOString();
        setFieldProjects((prev) =>
          prev.map((p) => {
            if (p.id !== projectId) return p;
            return {
              ...p,
              photos: p.photos.map((ph) =>
                ph.id === photoId ? { ...ph, aiSummary: summary } : ph,
              ),
              updatedAt: now,
            };
          }),
        );
      },
      replaceAllRoofingData: (payload) => {
        setMeasurements(payload.measurements);
        setEstimates(payload.estimates);
        setContracts(payload.contracts);
        setFieldProjects(payload.fieldProjects ?? []);
      },
      getMeasurementById: (id: string) => measurements.find((m) => m.id === id),
      getEstimateById: (id: string) => estimates.find((e) => e.id === id),
      getFieldProjectById: (id: string) => fieldProjects.find((p) => p.id === id),
      deleteEstimate: (id: string) => {
        const removed = estimates.find((e) => e.id === id);
        setEstimates((prev) => prev.filter((e) => e.id !== id));
        setContracts((prev) => prev.filter((c) => c.estimateId !== id));
        // Drop the measurement too when no other estimate still references it.
        if (removed?.measurementId) {
          const stillUsed = estimates.some(
            (e) => e.id !== id && e.measurementId === removed.measurementId,
          );
          if (!stillUsed) {
            setMeasurements((prev) => prev.filter((m) => m.id !== removed.measurementId));
          }
        }
      },
      deleteContract: (id: string) => setContracts((prev) => prev.filter((c) => c.id !== id)),
      deleteMeasurement: (id: string) => setMeasurements((prev) => prev.filter((m) => m.id !== id)),
      sync,
      syncNow,
    }),
    [contracts, estimates, fieldProjects, measurements, sync, syncNow],
  );

  return <RoofingContext.Provider value={api}>{children}</RoofingContext.Provider>;
}

export function useRoofing() {
  const context = useContext(RoofingContext);
  if (!context) throw new Error("useRoofing must be used within a RoofingProvider");
  return context;
}

