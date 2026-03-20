/**
 * Role-Based Access Control (RBAC) Middleware
 * Handles permission checking and authorization
 */

interface Env {
  DB: any;
  [key: string]: any;
}

export async function requirePermission(
  env: Env,
  userId: string,
  permissionKey: string
): Promise<boolean> {
  try {
    const result = await env.DB.prepare(
      `SELECT DISTINCT permissions.key
       FROM permissions
       INNER JOIN role_permissions ON role_permissions.permission_id = permissions.id
       INNER JOIN user_roles ON user_roles.role_id = role_permissions.role_id
       WHERE user_roles.user_id = ? AND permissions.key = ?`
    ).bind(userId, permissionKey).first();

    return !!result;
  } catch (error) {
    console.error("RBAC permission check error:", error);
    return false;
  }
}

export async function getUserPermissions(env: Env, userId: string): Promise<string[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT DISTINCT permissions.key
       FROM permissions
       INNER JOIN role_permissions ON role_permissions.permission_id = permissions.id
       INNER JOIN user_roles ON user_roles.role_id = role_permissions.role_id
       WHERE user_roles.user_id = ?`
    ).bind(userId).all();

    return (result.results || []).map((r: any) => r.key);
  } catch (error) {
    console.error("Get user permissions error:", error);
    return [];
  }
}

export async function getUserRoles(env: Env, userId: string): Promise<string[]> {
  try {
    const result = await env.DB.prepare(
      `SELECT roles.name
       FROM roles
       INNER JOIN user_roles ON user_roles.role_id = roles.id
       WHERE user_roles.user_id = ?`
    ).bind(userId).all();

    return (result.results || []).map((r: any) => r.name);
  } catch (error) {
    console.error("Get user roles error:", error);
    return [];
  }
}

export async function logAudit(
  env: Env,
  userId: string,
  action: string,
  resource: string,
  metadata?: any,
  ip?: string
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO audit_log (id, user_id, action, resource, metadata, ip)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      userId,
      action,
      resource,
      JSON.stringify(metadata),
      ip || ""
    ).run();
  } catch (error) {
    console.error("Audit logging error:", error);
  }
}
