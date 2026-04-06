import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { FormState } from "../features/measurement/measurementFormTypes";

/** Minimal client/proposal slice used for GHL + chat snapshot (matches App ProposalState fields we care about). */
export type ProposalSnapshot = {
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientPhone: string;
  companyName: string;
  proposalTitle: string;
};

export type MeasurementSnapshot = {
  form: FormState;
  proposal: ProposalSnapshot;
};

export type MeasurementChatBridgeHandler = {
  getSnapshot: () => MeasurementSnapshot;
  applyPatches: (formPatch: Record<string, unknown>, proposalPatch: Record<string, unknown>) => void;
};

type Ctx = {
  /** Register while the measurement screen is mounted; returns cleanup. */
  registerBridge: (handler: MeasurementChatBridgeHandler) => () => void;
  getBridge: () => MeasurementChatBridgeHandler | null;
};

const MeasurementChatBridgeContext = createContext<Ctx | null>(null);

export function MeasurementChatBridgeProvider({ children }: { children: ReactNode }) {
  const ref = useRef<MeasurementChatBridgeHandler | null>(null);

  const registerBridge = useCallback((handler: MeasurementChatBridgeHandler) => {
    ref.current = handler;
    return () => {
      if (ref.current === handler) ref.current = null;
    };
  }, []);

  const getBridge = useCallback(() => ref.current, []);

  const value = useMemo(() => ({ registerBridge, getBridge }), [registerBridge, getBridge]);

  return (
    <MeasurementChatBridgeContext.Provider value={value}>{children}</MeasurementChatBridgeContext.Provider>
  );
}

export function useMeasurementChatBridge(): Ctx {
  const ctx = useContext(MeasurementChatBridgeContext);
  if (!ctx) {
    throw new Error("useMeasurementChatBridge requires MeasurementChatBridgeProvider");
  }
  return ctx;
}
