/**
 * AI-powered event description generation
 * Generates event descriptions, tags, and promotion angles
 */

import { runAI } from "../utils/ai";

interface EventDescription {
  description: string;
  tags: string[];
  valueProps: string[];
  audience: string[];
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function generateEventDescription(env: Env, title: string): Promise<EventDescription> {
  const prompt = `
You are an expert event copywriter for a sales and business community.
Generate a JSON response with:

- "description": 2-paragraph event description
- "tags": array of 5 tags
- "valueProps": array of 3-4 reasons to attend
- "audience": array of target roles (sales reps, business owners, etc.)

Event Title:
${title}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const text = await runAI(env, prompt);
    const parsed = JSON.parse(text);

    return {
      description: parsed.description || "Event information coming soon.",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      valueProps: Array.isArray(parsed.valueProps) ? parsed.valueProps : [],
      audience: Array.isArray(parsed.audience) ? parsed.audience : []
    };
  } catch (error) {
    console.error("Event description generation error:", error);
    return {
      description: "Event information coming soon.",
      tags: [],
      valueProps: [],
      audience: []
    };
  }
}
