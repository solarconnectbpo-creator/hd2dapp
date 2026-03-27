import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Measurement {
  id: string;
  projectName: string;
  date: string;
  roofType: 'gable' | 'hip' | 'flat' | 'mansard';
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
  status: 'draft' | 'sent' | 'signed';
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

export function RoofingProvider({ children }: { children: ReactNode }) {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const addMeasurement = (measurement: Measurement) => {
    setMeasurements(prev => [...prev, measurement]);
  };

  const addEstimate = (estimate: Estimate) => {
    setEstimates(prev => [...prev, estimate]);
  };

  const addContract = (contract: Contract) => {
    setContracts(prev => [...prev, contract]);
  };

  const getMeasurementById = (id: string) => {
    return measurements.find(m => m.id === id);
  };

  const getEstimateById = (id: string) => {
    return estimates.find(e => e.id === id);
  };

  return (
    <RoofingContext.Provider
      value={{
        measurements,
        estimates,
        contracts,
        addMeasurement,
        addEstimate,
        addContract,
        getMeasurementById,
        getEstimateById,
      }}
    >
      {children}
    </RoofingContext.Provider>
  );
}

export function useRoofing() {
  const context = useContext(RoofingContext);
  if (context === undefined) {
    throw new Error('useRoofing must be used within a RoofingProvider');
  }
  return context;
}
