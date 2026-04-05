import { HD2D_WORKER_API_ORIGIN } from "../config/siteOrigin";
import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";
import type { CoursesCatalogData } from "../data/coursesCatalog";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

async function workerFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = apiBase();
  if (!base) throw new Error("Backend API base is not configured.");
  try {
    return await fetch(`${base}${path}`, {
      ...init,
      mode: "cors",
      credentials: "omit",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Network error: ${msg}. Set VITE_INTEL_API_BASE=${HD2D_WORKER_API_ORIGIN} if needed.`,
    );
  }
}

export type CoursesCatalogApiResult = {
  catalog: CoursesCatalogData | null;
  updatedAt: number | null;
};

/** GET — any signed-in user. */
export async function fetchCoursesCatalog(token: string): Promise<CoursesCatalogApiResult> {
  const res = await workerFetch("/api/courses/catalog", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    catalog?: CoursesCatalogData | null;
    updatedAt?: number | null;
    error?: string;
  }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(data.error || `Could not load catalog (${res.status}).`);
  }
  return {
    catalog: data.catalog ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function adminGetCoursesCatalog(token: string): Promise<CoursesCatalogApiResult> {
  const res = await workerFetch("/api/admin/courses/catalog", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await readJsonResponseBody<{
    success?: boolean;
    catalog?: CoursesCatalogData | null;
    updatedAt?: number | null;
    error?: string;
  }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(data.error || `Could not load catalog (${res.status}).`);
  }
  return {
    catalog: data.catalog ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

export async function adminPutCoursesCatalog(token: string, catalog: CoursesCatalogData): Promise<number> {
  const res = await workerFetch("/api/admin/courses/catalog", {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ catalog }),
  });
  const data = await readJsonResponseBody<{ success?: boolean; updatedAt?: number; error?: string }>(res);
  if (!res.ok || data.success !== true || data.updatedAt == null) {
    throw new Error(data.error || `Save failed (${res.status}).`);
  }
  return data.updatedAt;
}

export async function adminDeleteCoursesCatalog(token: string): Promise<void> {
  const res = await workerFetch("/api/admin/courses/catalog", {
    method: "DELETE",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const data = await readJsonResponseBody<{ success?: boolean; error?: string }>(res);
  if (!res.ok || data.success !== true) {
    throw new Error(data.error || `Clear failed (${res.status}).`);
  }
}
