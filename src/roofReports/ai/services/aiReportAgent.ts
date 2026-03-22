/**
 * LLM-backed structured property report draft (OpenAI via shared OpenAIService / Expo env).
 * Use for optional “generate sections” flows; roof damage UI still prefers Worker routes when set.
 */

import OpenAIService from "@/services/aiAgents/OpenAIService";

export interface ReportData {
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  measurements?: Record<string, unknown>;
  images?: string[];
}

export interface ReportGenerationRequest {
  reportType: "precision" | "summary" | "detailed";
  data: ReportData;
  customPrompt?: string;
}

export interface ReportSection {
  heading: string;
  content: string;
  type: "text" | "table" | "chart" | "image";
}

export interface ReportGenerationResponse {
  reportId: string;
  title: string;
  sections: ReportSection[];
  summary: string;
  generatedAt: string;
}

export class AIReportAgent {
  private openai: OpenAIService;

  constructor() {
    this.openai = new OpenAIService();
  }

  async generateReport(
    request: ReportGenerationRequest,
  ): Promise<ReportGenerationResponse> {
    const prompt = this.buildPrompt(request);
    const system = `You are an expert property analysis AI. Reply with JSON only, no markdown fences.`;
    const res = await this.openai.chat(prompt, system);
    if (!res.success || !res.message) {
      throw new Error(res.error ?? "OpenAI did not return a message");
    }
    return this.parseReportResponse(res.message);
  }

  async *streamReport(
    request: ReportGenerationRequest,
  ): AsyncGenerator<string, void, unknown> {
    const out = await this.generateReport(request);
    yield JSON.stringify(out);
  }

  private buildPrompt(request: ReportGenerationRequest): string {
    const { reportType, data, customPrompt } = request;

    const dataContext = `
Property Information:
- Address: ${data.propertyAddress}, ${data.city}, ${data.state} ${data.zipCode}
- Coordinates: ${data.latitude}, ${data.longitude}
- Measurements: ${JSON.stringify(data.measurements ?? {})}
`;

    const typeSpecificPrompts = {
      precision:
        "Generate a detailed precision measurement report with technical analysis.",
      summary: "Generate a concise executive summary of the property analysis.",
      detailed:
        "Generate a comprehensive multi-section report with detailed insights.",
    };

    return `
${typeSpecificPrompts[reportType]}

${dataContext}

${customPrompt ?? ""}

Return a JSON object with this shape only:
{
  "title": "Report Title",
  "sections": [
    { "heading": "Section Heading", "content": "…", "type": "text" }
  ],
  "summary": "Executive summary"
}
`.trim();
  }

  private parseReportResponse(response: string): ReportGenerationResponse {
    const trimmed = response.trim();
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    const raw = jsonMatch ? jsonMatch[0] : trimmed;
    try {
      const parsed = JSON.parse(raw) as {
        title?: string;
        sections?: ReportSection[];
        summary?: string;
      };
      return {
        reportId: `report_${Date.now()}`,
        title: parsed.title ?? "Generated Report",
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        summary: parsed.summary ?? "",
        generatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        reportId: `report_${Date.now()}`,
        title: "Generated Report",
        sections: [
          {
            heading: "Report Content",
            content: response,
            type: "text",
          },
        ],
        summary: response.slice(0, 200),
        generatedAt: new Date().toISOString(),
      };
    }
  }
}

const aiReportAgent = new AIReportAgent();
export default aiReportAgent;
