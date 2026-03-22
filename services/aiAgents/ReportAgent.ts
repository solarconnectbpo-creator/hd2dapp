import type { DamageRoofReport } from "@/src/roofReports/roofReportTypes";
import type { AgentResponse, ReportAgentSection } from "./types";

export interface ReportAgentContext {
  /** Partial or full report for narrative hints */
  report: Partial<DamageRoofReport>;
  /** Optional extra instructions */
  audience?: "homeowner" | "adjuster" | "internal";
}

/**
 * Produces short, structured narrative sections for exports (local heuristics;
 * swap in LLM calls later if desired).
 */
export class ReportAgent {
  buildExecutiveSummary(ctx: ReportAgentContext): ReportAgentSection[] {
    const addr = ctx.report.property?.address?.trim() || "the property";
    const dmg = ctx.report.damageTypes?.length
      ? ctx.report.damageTypes.join(", ")
      : "documented damage";
    const sev = ctx.report.severity ?? "—";
    const sections: ReportAgentSection[] = [
      {
        title: "Summary",
        body: `Inspection targets ${addr}. Observed conditions include ${dmg} with severity ${sev}/5.`,
        priority: 1,
      },
    ];
    if (ctx.report.scopeOfWork?.length) {
      sections.push({
        title: "Scope highlights",
        body: ctx.report.scopeOfWork.slice(0, 5).join(" · "),
        priority: 2,
      });
    }
    return sections;
  }

  async summarizeAsync(
    ctx: ReportAgentContext,
  ): Promise<AgentResponse<ReportAgentSection[]>> {
    try {
      return { status: "success", data: this.buildExecutiveSummary(ctx) };
    } catch (e) {
      return {
        status: "error",
        error: e instanceof Error ? e.message : "ReportAgent failed",
      };
    }
  }
}
