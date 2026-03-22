/**
 * AI-powered lead analysis model
 * Produces structured quality scores, qualifications, objections, and recommended actions
 */

import { runAI } from "../utils/ai";

interface LeadAnalysis {
  score: number;
  summary: string;
  predictedObjections: string[];
  recommendedActions: string[];
  industry: string;
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function analyzeLead(env: Env, lead: any): Promise<LeadAnalysis> {
  const prompt = `
You are an AI sales analyst for a door-to-door home improvement company. Analyze the following lead and return a JSON object with:

- "score": (0-100 quality score, 100 being highest quality)
- "summary": 1-paragraph qualification summary
- "predictedObjections": array of likely sales objections
- "recommendedActions": array of specific steps to close the deal
- "industry": best industry classification

Lead data:
${JSON.stringify(lead, null, 2)}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const response = await runAI(env, prompt);
    const parsed = JSON.parse(response);

    return {
      score: parsed.score || 50,
      summary: parsed.summary || "Lead analysis unavailable",
      predictedObjections: Array.isArray(parsed.predictedObjections)
        ? parsed.predictedObjections
        : [],
      recommendedActions: Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions
        : [],
      industry: parsed.industry || lead.industry || "unknown",
    };
  } catch (error) {
    console.error("Lead analysis error:", error);
    return {
      score: 50,
      summary: "AI summary unavailable. Lead will be reviewed manually.",
      predictedObjections: [],
      recommendedActions: [],
      industry: lead.industry || "unknown",
    };
  }
}
