/**
 * AI social media analysis model
 * Generates hashtags, predicts virality, and content scoring
 */

import { runAI } from "../utils/ai";

interface PostAnalysis {
  score: number;
  hashtags: string[];
  sentiment: "positive" | "neutral" | "negative";
  category: "advice" | "win" | "question" | "story" | "motivation" | "other";
  notes: string;
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function analyzePostContent(
  env: Env,
  content: string,
): Promise<PostAnalysis> {
  const prompt = `
You are an AI social media strategist for a sales-based professional community.

Analyze the following post content and return ONLY a JSON object with:
- "score": (0-100 viral potential score)
- "hashtags": array of 5 suggested hashtags (lowercase, no # prefix)
- "sentiment": positive | neutral | negative
- "category": advice | win | question | story | motivation | other
- "notes": short guidance to improve reach (1-2 sentences)

Post:
${content}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const text = await runAI(env, prompt);
    const parsed = JSON.parse(text);

    return {
      score: Math.min(Math.max(parsed.score || 50, 0), 100),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.slice(0, 5)
        : [],
      sentiment: (parsed.sentiment || "neutral") as
        | "positive"
        | "neutral"
        | "negative",
      category: (parsed.category || "other") as
        | "advice"
        | "win"
        | "question"
        | "story"
        | "motivation"
        | "other",
      notes: parsed.notes || "",
    };
  } catch (error) {
    console.error("Post analysis error:", error);
    return {
      score: 50,
      hashtags: [],
      sentiment: "neutral",
      category: "other",
      notes: "",
    };
  }
}
