/**
 * AI wrapper for OpenAI API
 * Handles all AI-powered lead analysis and scoring
 */

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function runAI(env: Env, prompt: string): Promise<string> {
  const url = "https://api.openai.com/v1/chat/completions";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error: ${res.status}`);
  }

  const json = await res.json();
  return json.choices[0]?.message?.content || "";
}
