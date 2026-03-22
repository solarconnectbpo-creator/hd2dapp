/**
 * AI Workflow Interpreter
 * Analyzes events and decides if workflow steps should execute
 */

import { runAI } from "../utils/ai";

interface InterpreterResponse {
  shouldRun: boolean;
  reason: string;
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function interpretEvent(
  env: Env,
  event: any,
  workflowStep: any,
): Promise<InterpreterResponse> {
  const prompt = `
You are an AI automation interpreter for a sales CRM system.

Given a workflow step and an incoming event, decide if the workflow step should trigger/execute.

Return ONLY a JSON object with:
- "shouldRun": true if the step should execute, false otherwise
- "reason": brief explanation

Workflow Step:
${JSON.stringify(workflowStep, null, 2)}

Event:
${JSON.stringify(event, null, 2)}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const text = await runAI(env, prompt);
    const parsed = JSON.parse(text);

    return {
      shouldRun: parsed.shouldRun === true,
      reason: parsed.reason || "No reason provided",
    };
  } catch (error) {
    console.error("Event interpretation error:", error);
    return {
      shouldRun: false,
      reason: "AI error",
    };
  }
}
