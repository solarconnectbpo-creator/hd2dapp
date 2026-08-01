import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import {
  assignRepToOrg,
  insertOrganization,
  isValidUsStateCode,
  listOrganizationsForAdmin,
  listOrgMembersDetail,
  normalizeState,
  type OrgKind,
} from "../auth/orgDb";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function parseOrgKind(s: unknown): OrgKind | null {
  const v = String(s || "").trim().toLowerCase();
  if (v === "local" || v === "storm" || v === "both") return v;
  return null;
}

function parseStates(raw: unknown): { states: string[]; invalid: string[] } {
  const list = Array.isArray(raw)
    ? raw
    : String(raw || "")
        .split(",")
        .filter(Boolean);
  const states: string[] = [];
  const invalid: string[] = [];
  for (const item of list) {
    const s = normalizeState(String(item || ""));
    if (!s) continue;
    if (isValidUsStateCode(s)) states.push(s);
    else invalid.push(String(item));
  }
  return { states: [...new Set(states)], invalid };
}

/** Admin routes under `/api/admin/organizations`. */
export async function handleAdminOrgRoutes(
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

  const rest = path.replace(/^\/api\/admin\/organizations\/?/, "").replace(/\/+$/, "");
  const segments = rest.split("/").filter(Boolean);

  try {
    if (segments.length === 0) {
      // GET /api/admin/organizations
      if (request.method === "GET") {
        const organizations = await listOrganizationsForAdmin(env.DB);
        return new Response(JSON.stringify({ success: true, organizations }), { status: 200, headers: j });
      }

      // POST /api/admin/organizations — body { name, orgKind, serviceStates }
      if (request.method === "POST") {
        let body: { name?: string; orgKind?: string; org_kind?: string; serviceStates?: unknown; service_states?: unknown } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
            status: 400,
            headers: j,
          });
        }
        const name = (body.name || "").trim();
        const orgKind = parseOrgKind(body.orgKind ?? body.org_kind);
        const { states, invalid } = parseStates(body.serviceStates ?? body.service_states);

        if (!name || !orgKind) {
          return new Response(
            JSON.stringify({ success: false, error: "name and orgKind (local|storm|both) are required." }),
            { status: 400, headers: j },
          );
        }
        if (invalid.length > 0) {
          return new Response(
            JSON.stringify({ success: false, error: `Invalid state code(s): ${invalid.join(", ")}` }),
            { status: 400, headers: j },
          );
        }
        if (states.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "serviceStates must include at least one 2-letter state." }),
            { status: 400, headers: j },
          );
        }

        const id = `org_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        await insertOrganization(env.DB, { id, name, orgKind, serviceStates: states });
        return new Response(
          JSON.stringify({
            success: true,
            organization: { id, name, org_kind: orgKind, service_states: states, member_count: 0 },
          }),
          { status: 201, headers: j },
        );
      }
    }

    // POST /api/admin/organizations/assign — body { userId, orgId }
    if (segments.length === 1 && segments[0] === "assign" && request.method === "POST") {
      let body: { userId?: string; orgId?: string } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
          status: 400,
          headers: j,
        });
      }
      const userId = (body.userId || "").trim();
      const orgId = (body.orgId || "").trim();
      if (!userId || !orgId) {
        return new Response(JSON.stringify({ success: false, error: "userId and orgId are required." }), {
          status: 400,
          headers: j,
        });
      }
      const ok = await assignRepToOrg(env.DB, { userId, orgId });
      if (!ok) {
        return new Response(
          JSON.stringify({ success: false, error: "Rep profile or organization not found." }),
          { status: 404, headers: j },
        );
      }
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
    }

    // GET /api/admin/organizations/:orgId/members
    if (segments.length === 2 && segments[1] === "members" && request.method === "GET") {
      const members = await listOrgMembersDetail(env.DB, segments[0]);
      return new Response(JSON.stringify({ success: true, members }), { status: 200, headers: j });
    }

    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  } catch (e) {
    console.error("[admin-orgs] route error:", e);
    return new Response(JSON.stringify({ success: false, error: "Could not complete organization request." }), {
      status: 500,
      headers: j,
    });
  }
}
