import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import {
  findOrgForUser,
  isWorkspaceKind,
  listWorkspaceRecords,
  MAX_RECORDS_PER_PUSH,
  softDeleteWorkspaceRecord,
  upsertWorkspaceRecords,
  WORKSPACE_KINDS,
  type UpsertInput,
  type WorkspaceKind,
} from "../workspace/workspaceDb";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function parseKinds(raw: string | null): WorkspaceKind[] {
  if (!raw || !raw.trim()) return [...WORKSPACE_KINDS];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(isWorkspaceKind);
}

/** Only owners/admins may read across the whole organization. */
function canReadOrg(role: string | undefined): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Routes under `/api/workspace` — durable sync for measurements, estimates, contracts,
 * field projects, and canvassing data.
 *
 * - `GET  /api/workspace/records?kinds=…&since=…&scope=user|org`
 * - `POST /api/workspace/records`            body `{ records: [{ id, kind, data, updatedAt, deleted }] }`
 * - `DELETE /api/workspace/records/:kind/:id`
 *
 * Returns `null` when the path is not handled here so index.ts can fall through.
 */
export async function handleWorkspaceRoutes(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const j = jsonHeaders(corsHeaders);
  const base = "/api/workspace";
  const p = path.replace(/\/+$/, "") || "/";
  if (p !== base && !p.startsWith(`${base}/`)) return null;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: j });
  }

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return json({ success: false, error: "Sign in required." }, 401, j);
  }

  const segments = p.slice(base.length).replace(/^\//, "").split("/").filter(Boolean);

  try {
    const membership = await findOrgForUser(env.DB, payload.sub);

    // GET /api/workspace/records
    if (segments.length === 1 && segments[0] === "records" && request.method === "GET") {
      const url = new URL(request.url);
      const kinds = parseKinds(url.searchParams.get("kinds"));
      if (kinds.length === 0) {
        return json({ success: false, error: "No valid kinds requested." }, 400, j);
      }

      const wantsOrg = url.searchParams.get("scope") === "org";
      const useOrgScope = wantsOrg && !!membership && canReadOrg(membership.role);
      if (wantsOrg && !useOrgScope) {
        return json({ success: false, error: "Team scope requires an org owner or admin role." }, 403, j);
      }

      const records = await listWorkspaceRecords(env.DB, {
        userId: payload.sub,
        kinds,
        since: Number(url.searchParams.get("since")) || 0,
        scope: useOrgScope ? "org" : "user",
        orgId: membership?.orgId ?? null,
        limit: Number(url.searchParams.get("limit")) || 1000,
      });

      const watermark = records.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), 0);
      return json({ success: true, records, watermark, scope: useOrgScope ? "org" : "user" }, 200, j);
    }

    // POST /api/workspace/records
    if (segments.length === 1 && segments[0] === "records" && request.method === "POST") {
      let body: { records?: unknown } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return json({ success: false, error: "Invalid JSON body." }, 400, j);
      }

      if (!Array.isArray(body.records)) {
        return json({ success: false, error: "records must be an array." }, 400, j);
      }
      if (body.records.length > MAX_RECORDS_PER_PUSH) {
        return json(
          { success: false, error: `Too many records in one push (max ${MAX_RECORDS_PER_PUSH}).` },
          413,
          j,
        );
      }

      const result = await upsertWorkspaceRecords(
        env.DB,
        payload.sub,
        membership?.orgId ?? null,
        body.records as UpsertInput[],
      );
      return json({ success: true, ...result }, 200, j);
    }

    // DELETE /api/workspace/records/:kind/:id
    if (segments.length === 3 && segments[0] === "records" && request.method === "DELETE") {
      const kind = segments[1];
      const id = decodeURIComponent(segments[2] || "");
      if (!isWorkspaceKind(kind)) {
        return json({ success: false, error: "Unknown record kind." }, 400, j);
      }
      if (!id) {
        return json({ success: false, error: "Record id is required." }, 400, j);
      }
      const ok = await softDeleteWorkspaceRecord(env.DB, payload.sub, kind, id);
      return json({ success: true, deleted: ok }, 200, j);
    }

    return json({ success: false, error: "Not found." }, 404, j);
  } catch (e) {
    console.error("[workspace] route error:", e);
    return json({ success: false, error: "Workspace sync is unavailable." }, 500, j);
  }
}
