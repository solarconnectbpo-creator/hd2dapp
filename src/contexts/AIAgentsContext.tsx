import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  ReportGenerationService,
  type BuiltReportDraft,
  type DataSource,
} from "@/services/aiAgents";
import type { DamageRoofReport } from "@/src/roofReports/roofReportTypes";

const defaultDataSource: DataSource = {
  id: "demo-static",
  type: "static",
  rows: [12, 15, 18, 14, 20],
};

function demoReportSkeleton(): Partial<DamageRoofReport> {
  const clickedAtIso = new Date().toISOString();
  return {
    property: {
      address: "123 Example Lane, Springfield, MO",
      lat: 37.209,
      lng: -93.292,
      clickedAtIso,
    },
    damageTypes: ["Hail"],
    severity: 3,
    recommendedAction: "Insurance Claim Help",
    notes: "Demo context for AI report agents.",
  };
}

type AIAgentsContextValue = {
  dataSource: DataSource;
  setDataSource: Dispatch<SetStateAction<DataSource>>;
  reportTemplate: Partial<DamageRoofReport>;
  setReportTemplate: (next: Partial<DamageRoofReport>) => void;
  draft: BuiltReportDraft | null;
  analysisError: string | null;
  progress: number;
  isGenerating: boolean;
  error: string | null;
  generate: () => Promise<void>;
  resetOutput: () => void;
};

const AIAgentsContext = createContext<AIAgentsContextValue | null>(null);

export function AIAgentsProvider({ children }: { children: React.ReactNode }) {
  const [service] = useState(() => new ReportGenerationService());
  const [dataSource, setDataSource] = useState<DataSource>(defaultDataSource);
  const [reportTemplate, setReportTemplate] =
    useState<Partial<DamageRoofReport>>(demoReportSkeleton);
  const [draft, setDraft] = useState<BuiltReportDraft | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetOutput = useCallback(() => {
    setDraft(null);
    setAnalysisError(null);
    setError(null);
    setProgress(0);
  }, []);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setAnalysisError(null);
    setProgress(0);
    try {
      setProgress(25);
      const result = await service.generateDraft({
        dataSource,
        report: reportTemplate,
      });
      setProgress(100);
      setDraft(result.draft);
      setAnalysisError(result.analysisError ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setDraft(null);
    } finally {
      setIsGenerating(false);
    }
  }, [dataSource, reportTemplate, service]);

  const value = useMemo<AIAgentsContextValue>(
    () => ({
      dataSource,
      setDataSource,
      reportTemplate,
      setReportTemplate,
      draft,
      analysisError,
      progress,
      isGenerating,
      error,
      generate,
      resetOutput,
    }),
    [
      dataSource,
      reportTemplate,
      draft,
      analysisError,
      progress,
      isGenerating,
      error,
      generate,
      resetOutput,
    ],
  );

  return (
    <AIAgentsContext.Provider value={value}>
      {children}
    </AIAgentsContext.Provider>
  );
}

export function useAIAgents(): AIAgentsContextValue {
  const ctx = useContext(AIAgentsContext);
  if (!ctx) {
    throw new Error("useAIAgents must be used within AIAgentsProvider");
  }
  return ctx;
}
