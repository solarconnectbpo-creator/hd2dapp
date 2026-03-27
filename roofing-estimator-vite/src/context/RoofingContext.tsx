import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface Measurement {
  id: string;
  projectName: string;
  date: string;
  roofType: "gable" | "hip" | "flat" | "mansard";
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

export function RoofingProvider({ children }: { children: ReactNode }) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        measurements?: Measurement[];
        estimates?: Estimate[];
        contracts?: Contract[];
      };
      if (Array.isArray(parsed.measurements)) setMeasurements(parsed.measurements);
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

