import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import { assignRepToOrg, listOrganizationsForDirectory, type PlacementPref } from "../auth/orgDb";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function parsePlacement(s: string | null): PlacementPref | null {
  const v = (s || "").trim().toLowerCase();
  if (v === "local" || v === "storm" || v === "either") return v;
  return null;
}

/** GET /api/orgs/directory?state=TX&placementPref=local — public list for rep sign-up UX. */
export async function handleOrgDirectoryRequest(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  const p = path.replace(/\/+$/, "") || "/";
  if (p !== "/api/orgs/directory" || request.method !== "GET") {
    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  }
  const url = new URL(request.url);
  const state = (url.searchParams.get("state") || "").trim();
  const placementPref = parsePlacement(url.searchParams.get("placementPref"));
  if (!state || !placementPref) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Query params state (2-letter) and placementPref (local|storm|either) are required.",
      }),
      { status: 400, headers: j },
    );
  }
  try {
    const organizations = await listOrganizationsForDirectory(env.DB, { state, placementPref });
    return new Response(JSON.stringify({ success: true, organizations }), { status: 200, headers: j });
  } catch (e) {
    console.error("org directory:", e);
    return new Response(JSON.stringify({ success: false, error: "Could not load organizations." }), {
      status: 500,
      headers: j,
    });
  }
}

/** POST /api/admin/rep-placement/assign — body { userId, orgId } */
export async function handleAdminRepPlacementRequest(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  const p = path.replace(/\/+$/, "") || "/";
  if (p !== "/api/admin/rep-placement/assign" || request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  }
  const payload = await getBearerPayload(request, env);
  if (!payload || payload.user_type !== "admin") {
    return new Response(JSON.stringify({ success: false, error: "Admin access required." }), {
      status: 403,
      headers: j,
    });
  }
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
  try {
    const ok = await assignRepToOrg(env.DB, { userId, orgId });
    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, error: "Rep profile or organization not found." }),
        { status: 404, headers: j },
      );
    }
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
  } catch (e) {
    console.error("assignRepToOrg:", e);
    return new Response(JSON.stringify({ success: false, error: "Assignment failed." }), {
      status: 500,
      headers: j,
    });
  }
}
