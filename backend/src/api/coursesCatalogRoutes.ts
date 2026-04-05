import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";

const ROW_ID = "default";
const MAX_CATALOG_BYTES = 600_000;

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

/** Minimal validation so admins can't brick the app with arbitrary JSON. */
export function validateCoursesCatalogPayload(o: unknown): string | null {
  if (!o || typeof o !== "object") return "catalog must be a JSON object.";
  const c = o as Record<string, unknown>;
  const hero = c.hero;
  if (!hero || typeof hero !== "object") return "hero (object) is required.";
  const h = hero as Record<string, unknown>;
  for (const k of ["headline", "subhead", "primaryCtaLabel", "primaryCtaPath"]) {
    if (typeof h[k] !== "string") return `hero.${k} must be a string.`;
  }
  if (!Array.isArray(c.valueProps)) return "valueProps must be an array.";
  for (const vp of c.valueProps) {
    if (!vp || typeof vp !== "object") return "Each valueProp must be an object.";
    const v = vp as Record<string, unknown>;
    if (typeof v.title !== "string" || typeof v.body !== "string") return "valueProps need title and body strings.";
  }
  const nb = c.narrativeBand;
  if (!nb || typeof nb !== "object") return "narrativeBand (object) is required.";
  const n = nb as Record<string, unknown>;
  if (typeof n.title !== "string" || typeof n.body !== "string") return "narrativeBand.title and .body required.";
  const ib = c.immersiveBand;
  if (!ib || typeof ib !== "object") return "immersiveBand (object) is required.";
  const i = ib as Record<string, unknown>;
  if (typeof i.title !== "string" || typeof i.body !== "string" || typeof i.ctaLabel !== "string") {
    return "immersiveBand title, body, ctaLabel required.";
  }
  if (!Array.isArray(c.categories)) return "categories must be an array.";
  for (const cat of c.categories) {
    if (!cat || typeof cat !== "object") return "Each category must be an object.";
    const x = cat as Record<string, unknown>;
    if (typeof x.id !== "string" || typeof x.title !== "string") return "Each category needs id and title.";
    if (!Array.isArray(x.programs)) return "Each category needs programs array.";
    for (const p of x.programs) {
      if (!p || typeof p !== "object") return "Each program must be an object.";
      const pr = p as Record<string, unknown>;
      if (typeof pr.id !== "string" || typeof pr.title !== "string") return "Programs need id and title.";
      if (typeof pr.lessonCount !== "number" || !Number.isFinite(pr.lessonCount)) return "program.lessonCount must be a number.";
      if (typeof pr.durationLabel !== "string") return "program.durationLabel must be a string.";
      if (pr.href !== undefined && typeof pr.href !== "string") return "program.href must be a string if set.";
    }
  }
  if (!Array.isArray(c.trainerLinks)) return "trainerLinks must be an array.";
  for (const t of c.trainerLinks) {
    if (!t || typeof t !== "object") return "Each trainerLinks entry must be an object.";
    const tr = t as Record<string, unknown>;
    if (typeof tr.name !== "string") return "trainerLinks.name required.";
    if (tr.href !== undefined && typeof tr.href !== "string") return "trainerLinks.href must be a string if set.";
  }
  if (!Array.isArray(c.faq)) return "faq must be an array.";
  for (const f of c.faq) {
    if (!f || typeof f !== "object") return "Each faq item must be an object.";
    const fq = f as Record<string, unknown>;
    if (typeof fq.question !== "string" || typeof fq.answer !== "string") return "faq needs question and answer.";
  }
  const cl = c.closingCta;
  if (!cl || typeof cl !== "object") return "closingCta (object) is required.";
  const clc = cl as Record<string, unknown>;
  for (const k of ["title", "body", "ctaLabel", "ctaPath"]) {
    if (typeof clc[k] !== "string") return `closingCta.${k} must be a string.`;
  }
  if (c.trailerYoutubeId !== undefined && typeof c.trailerYoutubeId !== "string") {
    return "trailerYoutubeId must be a string if set.";
  }
  return null;
}

type D1 = { prepare: (sql: string) => { bind: (...args: unknown[]) => { first: <T>() => Promise<T | null>; run: () => Promise<unknown> } } };

async function readCatalogRow(db: D1): Promise<{ json: string; updated_at: number } | null> {
  if (db == null) return null;
  const row = await db
    .prepare("SELECT json, updated_at FROM courses_catalog WHERE id = ?")
    .bind(ROW_ID)
    .first<{ json: string; updated_at: number }>();
  return row ?? null;
}

/** GET /api/courses/catalog — any authenticated user (Bearer JWT). */
export async function handleCoursesCatalogGet(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized !== "/api/courses/catalog") {
    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  }
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), { status: 405, headers: j });
  }
  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: "Sign in required." }), { status: 401, headers: j });
  }
  try {
    const row = await readCatalogRow(env.DB);
    if (!row) {
      return new Response(JSON.stringify({ success: true, catalog: null, updatedAt: null }), { status: 200, headers: j });
    }
    const catalog = JSON.parse(row.json) as unknown;
    return new Response(
      JSON.stringify({ success: true, catalog, updatedAt: row.updated_at }),
      { status: 200, headers: j },
    );
  } catch (e) {
    console.error("courses catalog GET:", e);
    return new Response(JSON.stringify({ success: false, error: "Could not load catalog." }), { status: 500, headers: j });
  }
}

/** GET/PUT/DELETE /api/admin/courses/catalog */
export async function handleAdminCoursesCatalogRoutes(
  request: Request,
  env: AuthEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  const j = jsonHeaders(corsHeaders);
  const payload = await getBearerPayload(request, env);
  if (!payload || payload.user_type !== "admin") {
    return new Response(JSON.stringify({ success: false, error: "Admin access required." }), { status: 403, headers: j });
  }

  const normalized = path.replace(/\/+$/, "") || "/";
  if (normalized !== "/api/admin/courses/catalog") {
    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  }

  if (request.method === "GET") {
    try {
      const row = await readCatalogRow(env.DB);
      if (!row) {
        return new Response(JSON.stringify({ success: true, catalog: null, updatedAt: null }), { status: 200, headers: j });
      }
      return new Response(
        JSON.stringify({ success: true, catalog: JSON.parse(row.json), updatedAt: row.updated_at }),
        { status: 200, headers: j },
      );
    } catch (e) {
      console.error("admin courses GET:", e);
      return new Response(JSON.stringify({ success: false, error: "Could not load catalog." }), { status: 500, headers: j });
    }
  }

  if (request.method === "DELETE") {
    try {
      await env.DB.prepare("DELETE FROM courses_catalog WHERE id = ?").bind(ROW_ID).run();
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: j });
    } catch (e) {
      console.error("admin courses DELETE:", e);
      return new Response(JSON.stringify({ success: false, error: "Could not clear catalog." }), { status: 500, headers: j });
    }
  }

  if (request.method === "PUT") {
    let body: { catalog?: unknown } = {};
    try {
      body = (await request.json()) as { catalog?: unknown };
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), { status: 400, headers: j });
    }
    const err = validateCoursesCatalogPayload(body.catalog);
    if (err) {
      return new Response(JSON.stringify({ success: false, error: err }), { status: 400, headers: j });
    }
    const raw = JSON.stringify(body.catalog);
    if (raw.length > MAX_CATALOG_BYTES) {
      return new Response(JSON.stringify({ success: false, error: "Catalog JSON is too large." }), { status: 400, headers: j });
    }
    const now = Math.floor(Date.now() / 1000);
    try {
      await env.DB.prepare(
        `INSERT INTO courses_catalog (id, json, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at`,
      )
        .bind(ROW_ID, raw, now)
        .run();
      return new Response(JSON.stringify({ success: true, updatedAt: now }), { status: 200, headers: j });
    } catch (e) {
      console.error("admin courses PUT:", e);
      return new Response(JSON.stringify({ success: false, error: "Could not save catalog. Did you run D1 migration 0002?" }), {
        status: 500,
        headers: j,
      });
    }
  }

  return new Response(JSON.stringify({ success: false, error: "Method not allowed." }), { status: 405, headers: j });
}
