/**
 * AI Workflow Builder
 * Converts natural language prompts into executable workflow blueprints
 */

import { runAI } from "../utils/ai";

interface WorkflowStep {
  type: "trigger" | "condition" | "action" | "delay" | "branch";
  config: any;
}

interface WorkflowBlueprint {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function buildWorkflow(env: Env, input: string): Promise<WorkflowBlueprint> {
  const prompt = `
You are WorkflowGPT, an AI that builds automated workflows for CRM, sales, call centers, and marketing automation.

Return ONLY a JSON object with:
- "name": workflow name
- "description": workflow description
- "steps": array of workflow steps. Each step object has:
  - "type": one of "trigger", "condition", "action", "delay", "branch"
  - "config": JSON object describing the event, condition, or action

Common action types: send_sms, send_email, create_task, update_lead, update_deal, assign_agent, simpletalk_call, create_post, log

User Prompt:
${input}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const text = await runAI(env, prompt);
    const parsed = JSON.parse(text);

    return {
      name: parsed.name || "Untitled Workflow",
      description: parsed.description || "",
      steps: Array.isArray(parsed.steps) ? parsed.steps : []
    };
  } catch (error) {
    console.error("Workflow build error:", error);
    return {
      name: "Untitled Workflow",
      description: "",
      steps: []
    };
  }
}
