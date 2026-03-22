import OpenAIService, { type OpenAIResponse } from "./OpenAIService";

export interface RoofInspectionData {
  address: string;
  roofAge: number;
  roofType: string;
  squareFootage: number;
  visibleIssues: string[];
  photoData?: string;
  notes?: string;
}

export interface RoofReport {
  id: string;
  generatedAt: string;
  address: string;
  executiveSummary: string;
  condition: {
    overall: string;
    material: string;
    age: number;
  };
  issues: {
    identified: string[];
    severity: string[];
    priorityOrder: string[];
  };
  recommendations: {
    repairs: string[];
    maintenance: string[];
    preventative: string[];
  };
  costEstimate: {
    lowRange: string;
    highRange: string;
    urgency: string;
  };
  maintenanceSchedule: {
    monthly: string[];
    seasonal: string[];
    annual: string[];
  };
  photos: {
    url: string;
    caption: string;
  }[];
}

class RoofReportBuilderAgent {
  private openaiService: OpenAIService;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  private assertChat(
    res: OpenAIResponse,
    step: string,
  ): asserts res is OpenAIResponse & { message: string } {
    if (!res.success || res.message == null) {
      throw new Error(res.error ?? `${step} failed`);
    }
  }

  /**
   * Build comprehensive roof report
   */
  async buildRoofReport(
    data: RoofInspectionData,
    onProgress?: (progress: number, message: string) => void,
  ): Promise<RoofReport> {
    const reportId = `roof-${Date.now()}`;

    if (onProgress) onProgress(10, "Analyzing roof condition...");

    const conditionAnalysis = await this.openaiService.chat(
      `Based on this roof inspection data:
        - Age: ${data.roofAge} years
        - Type: ${data.roofType}
        - Square footage: ${data.squareFootage}
        - Visible issues: ${data.visibleIssues.join(", ")}
        - Notes: ${data.notes || "None"}

        Provide a brief condition assessment.`,
      "You are a roof inspection expert.",
    );
    this.assertChat(conditionAnalysis, "Condition analysis");

    if (onProgress) onProgress(30, "Identifying issues and severity levels...");

    const issuesAnalysis = await this.openaiService.chat(
      `List the roofing issues in priority order with severity levels (Critical/High/Medium/Low)`,
      "You are a roof inspection expert analyzing the issues mentioned earlier.",
    );
    this.assertChat(issuesAnalysis, "Issues analysis");

    if (onProgress) onProgress(50, "Generating recommendations...");

    const recommendations = await this.openaiService.chat(
      `Provide specific repair, maintenance, and preventative recommendations for this roof.`,
      "You are a roof repair specialist.",
    );
    this.assertChat(recommendations, "Recommendations");

    if (onProgress) onProgress(70, "Calculating cost estimates...");

    const costEstimate = await this.openaiService.chat(
      `Provide cost estimates for the recommended repairs. Include material, labor, and total estimated cost ranges.`,
      "You are a roof repair cost estimator.",
    );
    this.assertChat(costEstimate, "Cost estimate");

    if (onProgress) onProgress(85, "Creating maintenance schedule...");

    const maintenanceSchedule = await this.openaiService.chat(
      `Create a maintenance schedule (monthly, seasonal, annual tasks) for maintaining this roof.`,
      "You are a roof maintenance expert.",
    );
    this.assertChat(maintenanceSchedule, "Maintenance schedule");

    if (onProgress) onProgress(100, "Report complete!");

    return {
      id: reportId,
      generatedAt: new Date().toISOString(),
      address: data.address,
      executiveSummary: this.extractSummary(conditionAnalysis),
      condition: {
        overall: this.extractCondition(conditionAnalysis),
        material: data.roofType,
        age: data.roofAge,
      },
      issues: {
        identified: data.visibleIssues,
        severity: this.extractSeverities(issuesAnalysis),
        priorityOrder: this.extractPriorities(issuesAnalysis),
      },
      recommendations: {
        repairs: this.extractRepairs(recommendations),
        maintenance: this.extractMaintenance(recommendations),
        preventative: this.extractPreventative(recommendations),
      },
      costEstimate: {
        lowRange: this.extractLowCost(costEstimate),
        highRange: this.extractHighCost(costEstimate),
        urgency: this.extractUrgency(costEstimate),
      },
      maintenanceSchedule: {
        monthly: this.extractMonthly(maintenanceSchedule),
        seasonal: this.extractSeasonal(maintenanceSchedule),
        annual: this.extractAnnual(maintenanceSchedule),
      },
      photos: data.photoData
        ? [
            {
              url: data.photoData,
              caption: `Roof inspection photo - ${data.address}`,
            },
          ]
        : [],
    };
  }

  /**
   * Export report to plain-text document (PDF generation can wrap this output).
   */
  async exportReportPDF(report: RoofReport): Promise<string> {
    const pdfContent = `
ROOF INSPECTION REPORT
Generated: ${new Date(report.generatedAt).toLocaleDateString()}
Report ID: ${report.id}

ADDRESS: ${report.address}

EXECUTIVE SUMMARY
${report.executiveSummary}

ROOF CONDITION
- Overall Condition: ${report.condition.overall}
- Material Type: ${report.condition.material}
- Age: ${report.condition.age} years

IDENTIFIED ISSUES
${report.issues.identified.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

PRIORITY ORDER
${report.issues.priorityOrder.map((item, i) => `${i + 1}. ${item}`).join("\n")}

RECOMMENDATIONS
REPAIRS:
${report.recommendations.repairs.map((r) => `- ${r}`).join("\n")}

MAINTENANCE:
${report.recommendations.maintenance.map((m) => `- ${m}`).join("\n")}

PREVENTATIVE MEASURES:
${report.recommendations.preventative.map((p) => `- ${p}`).join("\n")}

COST ESTIMATE
Low Range: ${report.costEstimate.lowRange}
High Range: ${report.costEstimate.highRange}
Urgency Level: ${report.costEstimate.urgency}

MAINTENANCE SCHEDULE
MONTHLY TASKS:
${report.maintenanceSchedule.monthly.map((m) => `- ${m}`).join("\n")}

SEASONAL TASKS:
${report.maintenanceSchedule.seasonal.map((s) => `- ${s}`).join("\n")}

ANNUAL TASKS:
${report.maintenanceSchedule.annual.map((a) => `- ${a}`).join("\n")}
    `;

    return pdfContent;
  }

  private extractSummary(
    response: OpenAIResponse & { message: string },
  ): string {
    return (
      response.message || "Professional roof inspection analysis available."
    );
  }

  private extractCondition(
    response: OpenAIResponse & { message: string },
  ): string {
    const message = response.message || "";
    if (message.includes("Excellent") || message.includes("excellent"))
      return "Excellent";
    if (message.includes("Good") || message.includes("good")) return "Good";
    if (message.includes("Fair") || message.includes("fair")) return "Fair";
    if (message.includes("Poor") || message.includes("poor")) return "Poor";
    return "Fair";
  }

  private extractSeverities(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    const severities: string[] = [];
    if (message.includes("Critical")) severities.push("Critical");
    if (message.includes("High")) severities.push("High");
    if (message.includes("Medium")) severities.push("Medium");
    if (message.includes("Low")) severities.push("Low");
    return severities.length > 0 ? severities : ["Medium"];
  }

  private extractPriorities(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, 5);
  }

  private extractRepairs(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("repair") || line.includes("fix"))
      .slice(0, 5);
  }

  private extractMaintenance(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("maintain") || line.includes("clean"))
      .slice(0, 5);
  }

  private extractPreventative(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("prevent") || line.includes("avoid"))
      .slice(0, 5);
  }

  private extractLowCost(
    response: OpenAIResponse & { message: string },
  ): string {
    const message = response.message || "";
    const match = message.match(/\$[\d,]+/);
    return match ? match[0] : "$0";
  }

  private extractHighCost(
    response: OpenAIResponse & { message: string },
  ): string {
    const message = response.message || "";
    const matches = message.match(/\$[\d,]+/g) || [];
    return matches.length > 1 ? matches[1] : "$0";
  }

  private extractUrgency(
    response: OpenAIResponse & { message: string },
  ): string {
    const message = response.message || "";
    if (message.includes("urgent") || message.includes("immediately"))
      return "Urgent";
    if (message.includes("soon") || message.includes("next season"))
      return "High";
    return "Routine Maintenance";
  }

  private extractMonthly(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("month") || line.includes("Monthly"))
      .slice(0, 3);
  }

  private extractSeasonal(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("season") || line.includes("Seasonal"))
      .slice(0, 4);
  }

  private extractAnnual(
    response: OpenAIResponse & { message: string },
  ): string[] {
    const message = response.message || "";
    return message
      .split("\n")
      .filter((line) => line.includes("year") || line.includes("Annual"))
      .slice(0, 4);
  }
}

export default RoofReportBuilderAgent;
