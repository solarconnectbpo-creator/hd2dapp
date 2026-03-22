/**
 * Trigger Router
 * Routes incoming events to active workflows for execution
 */

import { runWorkflow } from "./runWorkflow";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function dispatchEvent(env: Env, event: any): Promise<void> {
  try {
    // Get all active workflows
    const workflowResult = await env.DB.prepare(
      "SELECT * FROM workflows WHERE active = 1",
    ).all();

    const workflows = workflowResult.results || [];

    for (const workflow of workflows) {
      // Get workflow steps in order
      const stepsResult = await env.DB.prepare(
        "SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC",
      )
        .bind(workflow.id)
        .all();

      const steps = (stepsResult.results || []).map((s: any) => ({
        ...s,
        config: JSON.parse(s.config || "{}"),
      }));

      workflow.steps = steps;

      // Execute workflow
      await runWorkflow(env, workflow, event);
    }
  } catch (error) {
    console.error("Event dispatch error:", error);
  }
}
