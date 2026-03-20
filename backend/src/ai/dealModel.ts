/**
 * AI-powered deal forecasting model
 * Evaluates deal probability, stages, and recommended actions
 */

import { runAI } from "../utils/ai";

interface DealAnalysis {
  probability: number;
  stageRecommendation: string;
  priority: "high" | "medium" | "low";
  nextActions: string[];
  summary: string;
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function evaluateDeal(env: Env, deal: any): Promise<DealAnalysis> {
  const prompt = `
You are an AI sales strategist for a door-to-door home improvement company. Analyze the following deal and return a JSON object with:

- "probability": 0-100 chance the deal will close
- "stageRecommendation": next best stage (new, contact, presentation, proposal, negotiation, closed_won, closed_lost)
- "priority": high | medium | low
- "nextActions": array of 2-3 recommended steps
- "summary": one-paragraph summary

Deal:
${JSON.stringify(deal, null, 2)}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const result = await runAI(env, prompt);
    const parsed = JSON.parse(result);

    return {
      probability: Math.min(Math.max(parsed.probability || 50, 0), 100),
      stageRecommendation: parsed.stageRecommendation || deal.stage || "new",
      priority: (parsed.priority || "medium") as "high" | "medium" | "low",
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
      summary: parsed.summary || "Deal analysis unavailable."
    };
  } catch (error) {
    console.error("Deal evaluation error:", error);
    return {
      probability: 50,
      stageRecommendation: deal.stage || "new",
      priority: "medium",
      nextActions: [],
      summary: "AI evaluation unavailable. Deal will be reviewed manually."
    };
  }
}
