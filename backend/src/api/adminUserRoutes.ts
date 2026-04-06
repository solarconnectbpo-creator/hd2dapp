import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import {
  deleteUserById,
  findUserByEmail,
  insertUser,
  listUsersPublic,
  updateUserApprovalStatus,
  updateUserFields,
} from "../auth/userDb";
import type { AuthRole } from "../auth/token";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function parseRole(s: string | undefined): AuthRole | null {
  if (s === "admin" || s === "company" || s === "sales_rep") return s;
  return null;
}

export async function handleAdminUserRoutes(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  const payload = await getBearerPayload(request, env);
  if (!payload || payload.user_type !== "admin") {
    return new Response(JSON.stringify({ success: false, error: "Admin access required." }), {
      status: 403,
      headers: j,
    });
  }

  const rest = path.replace(/^\/api\/admin\/users\/?/, "").replace(/\/$/, "");
  const segments = rest.split("/").filter(Boolean);

  if (segments.length === 0) {
    if (request.method === "GET") {
      const users = await listUsersPublic(env.DB);
      return new Response(JSON.stringify({ success: true, users }), { status: 200, headers: j });
    }
    if (request.method === "POST") {
      let body: { email?: string; password?: string; name?: string; user_type?: string } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
          status: 400,
          headers: j,
        });
      }
      const email = (body.email || "").trim().toLowerCase();
      const password = body.password || "";
      const name = (body.name || "").trim();
      const role = parseRole(body.user_type);
      if (!email || !password || !role) {
        return new Response(
          JSON.stringify({ success: false, error: "email, password, and user_type (admin|company|sales_rep) are required." }),
          { status: 400, headers: j },
        );
      }
      if (password.length < 8) {
        return new Response(JSON.stringify({ success: false, error: "Password must be at least 8 characters." }), {
          status: 400,
          headers: j,
        });
      }
      if (await findUserByEmail(env.DB, email)) {
        return new Response(JSON.stringify({ success: false, error: "Email already exists." }), {
          status: 409,
          headers: j,
        });
      }
      const id = crypto.randomUUID();
      try {
        await insertUser(env.DB, {
          id,
          email,
          plainPassword: password,
          name: name || email.split("@")[0],
          user_type: role,
        });
      } catch (e) {
        console.error("admin insertUser:", e);
        return new Response(JSON.stringify({ success: false, error: "Could not create user." }), {
          status: 500,
          headers: j,
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          user: { id, email, name: name || email.split("@")[0], user_type: role },
        }),
        { status: 201, headers: j },
      );
    }
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
      status: 405,
      headers: j,
    });
  }

  const userId = segments[0];
  if (!userId) {
    return new Response(JSON.stringify({ success: false, error: "Invalid path." }), { status: 400, headers: j });
  }

  if (segments.length === 2 && segments[1] === "approval") {
    if (request.method !== "PATCH") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
        status: 405,
        headers: j,
      });
    }
    let body: { approval_status?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
        status: 400,
        headers: j,
      });
    }
    const st = (body.approval_status || "").trim().toLowerCase();
    if (st !== "pending" && st !== "approved" && st !== "rejected") {
      return new Response(
        JSON.stringify({ success: false, error: "approval_status must be pending, approved, or rejected." }),
        { status: 400, headers: j },
      );
    }
    const ok = await updateUserApprovalStatus(env.DB, userId, st);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: "User not found." }), { status: 404, headers: j });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
  }

  if (request.method === "PATCH") {
    let body: { name?: string; password?: string; user_type?: string } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
        status: 400,
        headers: j,
      });
    }
    const role = body.user_type !== undefined ? parseRole(body.user_type) : undefined;
    if (body.user_type !== undefined && !role) {
      return new Response(JSON.stringify({ success: false, error: "Invalid user_type." }), { status: 400, headers: j });
    }
    const hasPatch =
      Boolean(body.password && body.password.length > 0) ||
      body.name !== undefined ||
      body.user_type !== undefined;
    if (!hasPatch) {
      return new Response(JSON.stringify({ success: false, error: "Provide name, password, and/or user_type to update." }), {
        status: 400,
        headers: j,
      });
    }
    const ok = await updateUserFields(env.DB, userId, {
      name: body.name,
      plainPassword: body.password,
      user_type: role ?? undefined,
    });
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: "User not found." }), { status: 404, headers: j });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
  }

  if (request.method === "DELETE") {
    if (userId === payload.sub) {
      return new Response(JSON.stringify({ success: false, error: "You cannot delete your own account." }), {
        status: 400,
        headers: j,
      });
    }
    const deleted = await deleteUserById(env.DB, userId);
    if (!deleted) {
      return new Response(JSON.stringify({ success: false, error: "User not found." }), { status: 404, headers: j });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
  }

  return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), {
    status: 405,
    headers: j,
  });
}
