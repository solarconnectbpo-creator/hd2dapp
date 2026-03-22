import { useCallback, useMemo, useState } from "react";
import { Platform } from "react-native";

import RoofReportBuilderAgent, {
  type RoofInspectionData,
  type RoofReport,
} from "@/services/aiAgents/RoofReportBuilderAgent";
import {
  shareTextFile,
  type ShareTextFileResult,
} from "@/src/utils/shareTextFile";

function safeFilenamePart(id: string): string {
  const s = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return s.length > 0 ? s.slice(0, 96) : "report";
}

export function useRoofReportGeneration() {
  const [report, setReport] = useState<RoofReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const agent = useMemo(() => new RoofReportBuilderAgent(), []);

  const generateReport = useCallback(
    async (data: RoofInspectionData) => {
      try {
        setIsLoading(true);
        setError(null);
        setProgress(0);

        const generatedReport = await agent.buildRoofReport(
          data,
          (p, message) => {
            setProgress(p);
            setProgressMessage(message);
          },
        );

        setReport(generatedReport);
        return generatedReport;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to generate report";
        setError(errorMsg);
        console.error("Report generation error:", errorMsg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [agent],
  );

  /**
   * Writes the report as a text file: browser download on web, share sheet on native.
   */
  const exportReportFile = useCallback(async (): Promise<
    ShareTextFileResult | null
  > => {
    if (!report) {
      setError("No report to export");
      return null;
    }

    setError(null);
    try {
      const text = await agent.exportReportPDF(report);
      const filename = `roof-inspection-${safeFilenamePart(report.id)}.txt`;
      if (Platform.OS === "web") {
        const { downloadTextFileWebSync } =
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require("../utils/shareTextFile.web") as typeof import("../utils/shareTextFile.web");
        const result = downloadTextFileWebSync(filename, text);
        if (!result.ok) setError(result.error);
        return result;
      }
      const result = await shareTextFile(filename, text);
      if (!result.ok) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to export report";
      setError(errorMsg);
      return { ok: false, error: errorMsg };
    }
  }, [agent, report]);

  const clearReport = useCallback(() => {
    setReport(null);
    setError(null);
    setProgress(0);
    setProgressMessage("");
  }, []);

  return {
    report,
    isLoading,
    progress,
    progressMessage,
    error,
    generateReport,
    exportReportFile,
    clearReport,
  };
}

export default useRoofReportGeneration;
