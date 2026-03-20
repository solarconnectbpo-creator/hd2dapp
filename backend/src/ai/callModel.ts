/**
 * AI call analysis model
 * Analyzes call transcripts for intent, sentiment, and next actions
 */

import { runAI } from "../utils/ai";

interface CallAnalysis {
  intent: string;
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  recommendedNextAction: string;
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function analyzeCall(env: Env, transcript: string): Promise<CallAnalysis> {
  const prompt = `
You are an AI customer service analyst for a door-to-door sales company. Analyze this call transcript and return ONLY a JSON object with:

- "intent": main caller intent (e.g., "inquiry", "complaint", "appointment_request", "general_question")
- "summary": 2-sentence summary of the call
- "sentiment": positive | neutral | negative
- "recommendedNextAction": specific next step (e.g., "send quote", "schedule follow-up", "escalate to manager")

Call Transcript:
${transcript}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const result = await runAI(env, prompt);
    const parsed = JSON.parse(result);

    return {
      intent: parsed.intent || "general",
      summary: parsed.summary || "Summary unavailable.",
      sentiment: (parsed.sentiment || "neutral") as "positive" | "neutral" | "negative",
      recommendedNextAction: parsed.recommendedNextAction || "Follow up soon."
    };
  } catch (error) {
    console.error("Call analysis error:", error);
    return {
      intent: "general",
      summary: "Summary unavailable. Manual review recommended.",
      sentiment: "neutral",
      recommendedNextAction: "Follow up soon."
    };
  }
}
