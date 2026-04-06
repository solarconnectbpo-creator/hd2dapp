import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

export type RoofFormKind = "gable" | "hip" | "flat" | "mansard" | "complex";

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
}

const RoofingContext = createContext<RoofingContextType | undefined>(undefined);

const LS_KEY = "roofing-pro-context-v1";

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

export function RoofingProvider({ children }: { children: ReactNode }) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [fieldProjects, setFieldProjects] = useState<FieldProject[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(LS_KEY);
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
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LS_KEY,
      JSON.stringify({ measurements, estimates, contracts, fieldProjects }),
    );
  }, [measurements, estimates, contracts, fieldProjects]);

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
    }),
    [contracts, estimates, fieldProjects, measurements],
  );

  return <RoofingContext.Provider value={api}>{children}</RoofingContext.Provider>;
}

export function useRoofing() {
  const context = useContext(RoofingContext);
  if (!context) throw new Error("useRoofing must be used within a RoofingProvider");
  return context;
}

