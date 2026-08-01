import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

export type OrgWorkspaceEnv = AuthEnv & {
  /** Optional R2 bucket; agreements above INLINE_MAX_BYTES are stored here instead of D1. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ORG_FILES?: any;
};

/** D1 rows above roughly this size get slow — larger agreement bodies go to R2 when configured. */
const INLINE_MAX_BYTES = 1_500_000;

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

type OrgMembership = { orgId: string; role: string };

async function findMembership(env: OrgWorkspaceEnv, userId: string): Promise<OrgMembership | null> {
  const row = await env.DB.prepare(`SELECT org_id, role FROM org_members WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<{ org_id: string; role: string }>();
  return row ? { orgId: row.org_id, role: row.role } : null;
}

function canManage(role: string): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Routes under `/api/org` — the signed-in user's own organization workspace
 * (profile settings and agreement documents).
 *
 * Returns `null` when the path is not handled here so index.ts can fall through.
 */
export async function handleOrgWorkspaceRoutes(
  request: Request,
  env: OrgWorkspaceEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const j = jsonHeaders(corsHeaders);
  const base = "/api/org";
  const p = path.replace(/\/+$/, "") || "/";
  if (p !== base && !p.startsWith(`${base}/`)) return null;

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: "Sign in required." }), { status: 401, headers: j });
  }

  const segments = p.slice(base.length).replace(/^\//, "").split("/").filter(Boolean);

  try {
    const membership = await findMembership(env, payload.sub);
    if (!membership) {
      return new Response(
        JSON.stringify({ success: false, error: "You are not a member of an organization yet." }),
        { status: 404, headers: j },
      );
    }

    // GET /api/org/profile
    if (segments.length === 1 && segments[0] === "profile" && request.method === "GET") {
      const org = await env.DB.prepare(
        `SELECT id, name, service_states, org_kind, created_at FROM organizations WHERE id = ?`,
      )
        .bind(membership.orgId)
        .first<Record<string, unknown>>();
      const profile = await env.DB.prepare(
        `SELECT phone, website, address, logo_url, updated_at FROM org_profiles WHERE org_id = ?`,
      )
        .bind(membership.orgId)
        .first<Record<string, unknown>>();
      return new Response(
        JSON.stringify({ success: true, role: membership.role, organization: org ?? null, profile: profile ?? null }),
        { status: 200, headers: j },
      );
    }

    // PUT /api/org/profile — body { phone, website, address, logoUrl }
    if (segments.length === 1 && segments[0] === "profile" && (request.method === "PUT" || request.method === "PATCH")) {
      if (!canManage(membership.role)) {
        return new Response(JSON.stringify({ success: false, error: "Owner or admin role required." }), {
          status: 403,
          headers: j,
        });
      }
      let body: { phone?: string; website?: string; address?: string; logoUrl?: string } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
          status: 400,
          headers: j,
        });
      }
      const t = nowSec();
      await env.DB.prepare(
        `INSERT INTO org_profiles (org_id, phone, website, address, logo_url, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(org_id) DO UPDATE SET
           phone = excluded.phone,
           website = excluded.website,
           address = excluded.address,
           logo_url = excluded.logo_url,
           updated_at = excluded.updated_at`,
      )
        .bind(
          membership.orgId,
          (body.phone || "").trim().slice(0, 40) || null,
          (body.website || "").trim().slice(0, 500) || null,
          (body.address || "").trim().slice(0, 500) || null,
          (body.logoUrl || "").trim().slice(0, 1000) || null,
          t,
        )
        .run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
    }

    // GET /api/org/agreements — metadata only (never the body).
    if (segments.length === 1 && segments[0] === "agreements" && request.method === "GET") {
      const res = await env.DB.prepare(
        `SELECT id, title, content_type, size_bytes, storage, created_at
           FROM org_agreements WHERE org_id = ? ORDER BY created_at DESC LIMIT 200`,
      )
        .bind(membership.orgId)
        .all();
      return new Response(JSON.stringify({ success: true, agreements: res.results || [] }), {
        status: 200,
        headers: j,
      });
    }

    // POST /api/org/agreements — body { title, contentType, dataBase64 }
    if (segments.length === 1 && segments[0] === "agreements" && request.method === "POST") {
      if (!canManage(membership.role)) {
        return new Response(JSON.stringify({ success: false, error: "Owner or admin role required." }), {
          status: 403,
          headers: j,
        });
      }
      let body: { title?: string; contentType?: string; dataBase64?: string } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
          status: 400,
          headers: j,
        });
      }
      const title = (body.title || "").trim().slice(0, 300);
      const contentType = (body.contentType || "application/octet-stream").trim().slice(0, 120);
      const dataBase64 = (body.dataBase64 || "").trim();
      if (!title || !dataBase64) {
        return new Response(JSON.stringify({ success: false, error: "title and dataBase64 are required." }), {
          status: 400,
          headers: j,
        });
      }

      let bytes: Uint8Array;
      try {
        const bin = atob(dataBase64);
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      } catch {
        return new Response(JSON.stringify({ success: false, error: "dataBase64 is not valid base64." }), {
          status: 400,
          headers: j,
        });
      }

      const id = `agr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      const t = nowSec();
      const useR2 = bytes.byteLength > INLINE_MAX_BYTES;

      if (useR2) {
        if (!env.ORG_FILES) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "File is too large for inline storage and the ORG_FILES R2 bucket is not configured.",
            }),
            { status: 413, headers: j },
          );
        }
        await env.ORG_FILES.put(`org/${membership.orgId}/${id}`, bytes, {
          httpMetadata: { contentType },
        });
      }

      await env.DB.prepare(
        `INSERT INTO org_agreements
           (id, org_id, title, content_type, size_bytes, storage, body_base64, uploaded_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          membership.orgId,
          title,
          contentType,
          bytes.byteLength,
          useR2 ? "r2" : "d1",
          useR2 ? null : dataBase64,
          payload.sub,
          t,
        )
        .run();

      return new Response(JSON.stringify({ success: true, id, storage: useR2 ? "r2" : "d1" }), {
        status: 201,
        headers: j,
      });
    }

    // GET /api/org/agreements/:id — returns the file bytes.
    if (segments.length === 2 && segments[0] === "agreements" && request.method === "GET") {
      const row = await env.DB.prepare(
        `SELECT id, title, content_type, storage, body_base64 FROM org_agreements WHERE id = ? AND org_id = ?`,
      )
        .bind(segments[1], membership.orgId)
        .first<{
          id: string;
          title: string;
          content_type: string;
          storage: string;
          body_base64: string | null;
        }>();

      if (!row) {
        return new Response(JSON.stringify({ success: false, error: "Agreement not found." }), {
          status: 404,
          headers: j,
        });
      }

      if (row.storage === "r2") {
        if (!env.ORG_FILES) {
          return new Response(JSON.stringify({ success: false, error: "File storage is not configured." }), {
            status: 503,
            headers: j,
          });
        }
        const obj = await env.ORG_FILES.get(`org/${membership.orgId}/${row.id}`);
        if (!obj) {
          return new Response(JSON.stringify({ success: false, error: "Agreement file is missing." }), {
            status: 404,
            headers: j,
          });
        }
        return new Response(obj.body, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": row.content_type || "application/octet-stream" },
        });
      }

      return new Response(JSON.stringify({ success: true, agreement: row }), { status: 200, headers: j });
    }

    // DELETE /api/org/agreements/:id
    if (segments.length === 2 && segments[0] === "agreements" && request.method === "DELETE") {
      if (!canManage(membership.role)) {
        return new Response(JSON.stringify({ success: false, error: "Owner or admin role required." }), {
          status: 403,
          headers: j,
        });
      }
      if (env.ORG_FILES) {
        try {
          await env.ORG_FILES.delete(`org/${membership.orgId}/${segments[1]}`);
        } catch {
          // R2 object may not exist for inline rows.
        }
      }
      await env.DB.prepare(`DELETE FROM org_agreements WHERE id = ? AND org_id = ?`)
        .bind(segments[1], membership.orgId)
        .run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
    }

    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  } catch (e) {
    console.error("[org-workspace] route error:", e);
    return new Response(JSON.stringify({ success: false, error: "Organization workspace is unavailable." }), {
      status: 500,
      headers: j,
    });
  }
}
