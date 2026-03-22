/**
 * Workflows API endpoints
 * Create, manage, and execute automation workflows
 */

import { buildWorkflow } from "../ai/workflowBuilder";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * POST /api/workflows/create
 * Create a new workflow from natural language prompt
 */
export async function createWorkflow(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // AI build workflow blueprint
    const blueprint = await buildWorkflow(env, prompt);

    const workflowId = crypto.randomUUID();

    // Insert workflow
    await env.DB.prepare(
      `INSERT INTO workflows (id, name, description, created_by, ai_generated)
       VALUES (?, ?, ?, ?, 1)`,
    )
      .bind(workflowId, blueprint.name, blueprint.description, user.id)
      .run();

    // Insert steps
    let order = 1;
    for (const step of blueprint.steps || []) {
      await env.DB.prepare(
        `INSERT INTO workflow_steps (id, workflow_id, step_order, type, config)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(
          crypto.randomUUID(),
          workflowId,
          order++,
          step.type,
          JSON.stringify(step.config),
        )
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        workflowId,
        name: blueprint.name,
        steps: blueprint.steps.length,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Create workflow error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create workflow" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * GET /api/workflows
 * List all workflows
 */
export async function listWorkflows(req: Request, env: Env, user: User) {
  try {
    const workflows = await env.DB.prepare(
      "SELECT id, name, description, active, created_at FROM workflows WHERE created_by = ? ORDER BY created_at DESC",
    )
      .bind(user.id)
      .all();

    return new Response(JSON.stringify(workflows.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List workflows error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch workflows" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * GET /api/workflows/:id
 * Get workflow details with steps
 */
export async function getWorkflow(
  req: Request,
  env: Env,
  user: User,
  workflowId: string,
) {
  try {
    const workflow = await env.DB.prepare(
      "SELECT * FROM workflows WHERE id = ?",
    )
      .bind(workflowId)
      .first();

    if (!workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get workflow steps
    const stepsResult = await env.DB.prepare(
      "SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC",
    )
      .bind(workflowId)
      .all();

    const steps = (stepsResult.results || []).map((s: any) => ({
      ...s,
      config: JSON.parse(s.config),
    }));

    return new Response(JSON.stringify({ ...workflow, steps }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get workflow error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch workflow" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/workflows/:id/toggle
 * Enable or disable workflow
 */
export async function toggleWorkflow(
  req: Request,
  env: Env,
  user: User,
  workflowId: string,
) {
  try {
    const body = await req.json();
    const { active } = body;

    await env.DB.prepare("UPDATE workflows SET active = ? WHERE id = ?")
      .bind(active ? 1 : 0, workflowId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Toggle workflow error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to toggle workflow" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * DELETE /api/workflows/:id
 * Delete workflow
 */
export async function deleteWorkflow(
  req: Request,
  env: Env,
  user: User,
  workflowId: string,
) {
  try {
    // Delete steps
    await env.DB.prepare("DELETE FROM workflow_steps WHERE workflow_id = ?")
      .bind(workflowId)
      .run();

    // Delete workflow
    await env.DB.prepare("DELETE FROM workflows WHERE id = ?")
      .bind(workflowId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete workflow error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete workflow" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
