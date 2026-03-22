/**
 * Tasks API endpoints
 * Manage tasks associated with deals
 */

interface Env {
  DB: any;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * POST /api/tasks/create
 * Create a new task for a deal
 */
export async function createTask(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { dealId, title, dueDate } = body;
    const id = crypto.randomUUID();

    if (!dealId || !title) {
      return new Response(
        JSON.stringify({ error: "Missing dealId or title" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Insert task
    await env.DB.prepare(
      "INSERT INTO tasks (id, deal_id, title, due_date) VALUES (?, ?, ?, ?)",
    )
      .bind(id, dealId, title, dueDate || null)
      .run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create task error:", error);
    return new Response(JSON.stringify({ error: "Failed to create task" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/tasks/:dealId
 * Retrieve all tasks for a specific deal
 */
export async function getTasks(
  req: Request,
  env: Env,
  user: User,
  dealId: string,
) {
  try {
    const tasks = await env.DB.prepare(
      "SELECT * FROM tasks WHERE deal_id = ? ORDER BY due_date ASC",
    )
      .bind(dealId)
      .all();

    return new Response(JSON.stringify(tasks.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch tasks" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/tasks/:taskId/complete
 * Mark a task as complete
 */
export async function completeTask(
  req: Request,
  env: Env,
  user: User,
  taskId: string,
) {
  try {
    // Update task completion status
    await env.DB.prepare("UPDATE tasks SET completed = 1 WHERE id = ?")
      .bind(taskId)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Complete task error:", error);
    return new Response(JSON.stringify({ error: "Failed to complete task" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * DELETE /api/tasks/:taskId
 * Delete a task
 */
export async function deleteTask(
  req: Request,
  env: Env,
  user: User,
  taskId: string,
) {
  try {
    await env.DB.prepare("DELETE FROM tasks WHERE id = ?").bind(taskId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete task error:", error);
    return new Response(JSON.stringify({ error: "Failed to delete task" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
