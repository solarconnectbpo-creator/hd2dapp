import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

interface RoofingContextType {
  measurements: Measurement[];
  estimates: Estimate[];
  contracts: Contract[];
  addMeasurement: (measurement: Measurement) => void;
  addEstimate: (estimate: Estimate) => void;
  addContract: (contract: Contract) => void;
  getMeasurementById: (id: string) => Measurement | undefined;
  getEstimateById: (id: string) => Estimate | undefined;
}

const RoofingContext = createContext<RoofingContextType | undefined>(undefined);

const LS_KEY = "roofing-pro-context-v1";

const ROOF_FORMS = new Set<RoofFormKind>(["gable", "hip", "flat", "mansard", "complex"]);

function isRoofForm(s: string): s is RoofFormKind {
  return ROOF_FORMS.has(s as RoofFormKind);
}

/** Migrate older saves that stored only structural `roofType` instead of material + form. */
function normalizeMeasurement(raw: Record<string, unknown>): Measurement | null {
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

export function RoofingProvider({ children }: { children: ReactNode }) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        measurements?: unknown[];
        estimates?: Estimate[];
        contracts?: Contract[];
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
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LS_KEY,
      JSON.stringify({ measurements, estimates, contracts }),
    );
  }, [measurements, estimates, contracts]);

  const api = useMemo<RoofingContextType>(
    () => ({
      measurements,
      estimates,
      contracts,
      addMeasurement: (measurement: Measurement) =>
        setMeasurements((prev) => [...prev, measurement]),
      addEstimate: (estimate: Estimate) => setEstimates((prev) => [...prev, estimate]),
      addContract: (contract: Contract) => setContracts((prev) => [...prev, contract]),
      getMeasurementById: (id: string) => measurements.find((m) => m.id === id),
      getEstimateById: (id: string) => estimates.find((e) => e.id === id),
    }),
    [contracts, estimates, measurements],
  );

  return <RoofingContext.Provider value={api}>{children}</RoofingContext.Provider>;
}

export function useRoofing() {
  const context = useContext(RoofingContext);
  if (!context) throw new Error("useRoofing must be used within a RoofingProvider");
  return context;
}

