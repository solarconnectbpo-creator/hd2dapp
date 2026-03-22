/**
 * Workflow Runner
 * Executes workflow steps sequentially
 */

import { executeAction } from "./executeAction";
import { interpretEvent } from "../ai/workflowInterpreter";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface WorkflowStep {
  type: string;
  config: any;
}

interface Workflow {
  id: string;
  steps: WorkflowStep[];
}

export async function runWorkflow(
  env: Env,
  workflow: Workflow,
  event: any,
): Promise<void> {
  try {
    for (const step of workflow.steps || []) {
      // Interpret event for this step
      const decision = await interpretEvent(env, event, step);

      if (!decision.shouldRun) {
        continue;
      }

      // Execute based on step type
      if (step.type === "action") {
        await executeAction(env, step.config, event);
      } else if (step.type === "delay") {
        const ms = step.config.ms || 0;
        await new Promise((resolve) => setTimeout(resolve, ms));
      } else if (step.type === "condition") {
        // Conditions are handled by interpreter logic
        continue;
      }

      // Log workflow execution
      await env.DB.prepare(
        `INSERT INTO workflow_logs (id, workflow_id, event, data, status)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          workflow.id,
          step.type,
          JSON.stringify(step.config),
          "completed",
        )
        .run();
    }
  } catch (error) {
    console.error("Workflow execution error:", error);
    await env.DB.prepare(
      `INSERT INTO workflow_logs (id, workflow_id, event, data, status)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        workflow.id,
        "error",
        JSON.stringify(error),
        "failed",
      )
      .run();
  }
}
