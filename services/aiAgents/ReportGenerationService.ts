import type { DataSource } from "./types";
import DataAnalyzerAgent from "./DataAnalyzerAgent";
import { ReportAgent } from "./ReportAgent";
import { ReportBuilderAgent } from "./ReportBuilderAgent";
import type { DamageRoofReport } from "@/src/roofReports/roofReportTypes";
import type { BuiltReportDraft } from "./ReportBuilderAgent";

/**
 * Orchestrates DataAnalyzer → ReportAgent → ReportBuilder for bulk or single flows.
 */
export class ReportGenerationService {
  private analyzer = new DataAnalyzerAgent();
  private reportAgent = new ReportAgent();
  private builder = new ReportBuilderAgent();

  async generateDraft(opts: {
    dataSource: DataSource;
    report: Partial<DamageRoofReport>;
  }): Promise<{ draft: BuiltReportDraft; analysisError?: string }> {
    const analyzed = await this.analyzer.analyzeData(opts.dataSource);
    const analysis = analyzed.status === "success" ? analyzed.data : null;
    if (analyzed.status === "error") {
      return {
        draft: this.builder.buildDraft(
          [],
          null,
          { address: opts.report.property?.address },
        ),
        analysisError: analyzed.error,
      };
    }

    const narrativeRes = await this.reportAgent.summarizeAsync({
      report: opts.report,
      audience: "homeowner",
    });
    const narrative =
      narrativeRes.status === "success" && narrativeRes.data
        ? narrativeRes.data
        : [];

    const draft = this.builder.buildDraft(narrative, analysis ?? null, {
      address: opts.report.property?.address,
    });

    return { draft };
  }
}
