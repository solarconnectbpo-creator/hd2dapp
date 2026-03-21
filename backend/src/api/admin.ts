/**
 * Admin API endpoints
 * Enterprise admin dashboard and management
 */

import { analyzeSystem } from "../ai/adminGPT";
import { requirePermission, logAudit } from "../middleware/rbac";

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
 * GET /api/admin/overview
 * Admin dashboard overview with system analysis
 */
export async function getAdminOverview(req: Request, env: Env, user: User) {
  try {
    // Check permission
    const allowed = await requirePermission(env, user.id, "admin.view");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get logs
    const logsResult = await env.DB.prepare(
      "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500"
    ).all();

    // Get metrics
    const metricsResult = await env.DB.prepare(
      "SELECT * FROM system_usage ORDER BY time_bucket DESC LIMIT 200"
    ).all();

    // Get user count
    const userCountResult = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM users"
    ).first();

    // Get active workflows
    const workflowsResult = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM workflows WHERE active = 1"
    ).first();

    // Get API keys count
    const apiKeysResult = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM api_keys WHERE active = 1"
    ).first();

    // Get webhook status
    const webhooksResult = await env.DB.prepare(
      "SELECT * FROM webhook_health ORDER BY last_checked DESC LIMIT 20"
    ).all();

    // Analyze system
    const analysis = await analyzeSystem(
      env,
      logsResult.results || [],
      metricsResult.results || []
    );

    // Log audit
    await logAudit(env, user.id, "admin_view_overview", "admin_dashboard");

    return new Response(JSON.stringify({
      userCount: userCountResult?.count || 0,
      activeWorkflows: workflowsResult?.count || 0,
      activeApiKeys: apiKeysResult?.count || 0,
      webhookStatus: webhooksResult.results || [],
      recentLogs: (logsResult.results || []).slice(0, 10),
      analysis
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch overview" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/admin/users
 * List all users
 */
export async function listUsers(req: Request, env: Env, user: User) {
  try {
    const allowed = await requirePermission(env, user.id, "admin.users");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const users = await env.DB.prepare(
      "SELECT id, email, created_at FROM users ORDER BY created_at DESC"
    ).all();

    return new Response(JSON.stringify(users.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("List users error:", error);
    return new Response(JSON.stringify({ error: "Failed to list users" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
export async function getAuditLogs(req: Request, env: Env, user: User) {
  try {
    const allowed = await requirePermission(env, user.id, "admin.audit");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const logs = await env.DB.prepare(
      "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 1000"
    ).all();

    return new Response(JSON.stringify(logs.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch audit logs" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/admin/system-health
 * Get system health metrics
 */
export async function getSystemHealth(req: Request, env: Env, user: User) {
  try {
    const allowed = await requirePermission(env, user.id, "admin.health");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const metrics = await env.DB.prepare(
      "SELECT * FROM system_usage ORDER BY time_bucket DESC LIMIT 100"
    ).all();

    const webhooks = await env.DB.prepare(
      "SELECT * FROM webhook_health ORDER BY last_checked DESC"
    ).all();

    return new Response(JSON.stringify({
      metrics: metrics.results || [],
      webhookHealth: webhooks.results || []
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get system health error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch system health" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
