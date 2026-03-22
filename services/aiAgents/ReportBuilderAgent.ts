import type { DamageRoofReport } from "@/src/roofReports/roofReportTypes";
import type { AnalysisResult } from "./DataAnalyzerAgent";
import type { ReportAgentSection } from "./types";

export interface BuiltReportDraft {
  title: string;
  sections: ReportAgentSection[];
  /** Optional numeric highlights from analysis */
  metricsSummary?: string;
}

/**
 * Merges data analysis output with narrative sections into a single draft for UI/PDF.
 */
export class ReportBuilderAgent {
  buildDraft(
    narrative: ReportAgentSection[],
    analysis?: AnalysisResult | null,
    meta?: { address?: string },
  ): BuiltReportDraft {
    const addr = meta?.address?.trim() || "Property";
    const metricsSummary = analysis
      ? `Rows analyzed: ${analysis.metrics.total}; avg ${analysis.metrics.average.toFixed(1)}`
      : undefined;

    return {
      title: `${addr} — damage assessment draft`,
      sections: narrative,
      metricsSummary,
    };
  }

  /** Shallow merge of AI fields onto an existing report (does not persist). */
  applyDraftToReport(
    base: Partial<DamageRoofReport>,
    draft: BuiltReportDraft,
  ): Partial<DamageRoofReport> {
    const extraNotes = [
      base.notes?.trim(),
      draft.metricsSummary,
      draft.sections.map((s) => `${s.title}: ${s.body}`).join("\n"),
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      ...base,
      notes: extraNotes || base.notes,
    };
  }
}
