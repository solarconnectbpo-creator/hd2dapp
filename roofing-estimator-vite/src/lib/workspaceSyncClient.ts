/**
 * Network client for `/api/workspace/records` — durable server storage for measurements,
 * estimates, contracts, field projects, and canvassing data.
 */

import { getHd2dApiBase } from "./hd2dApiBase";
import { readJsonResponseBody } from "./readJsonResponse";
import type { PushRecord, RemoteRecord, WorkspaceKind } from "./workspaceSyncEngine";

function apiBase(): string {
  return getHd2dApiBase().replace(/\/$/, "");
}

export class WorkspaceSyncError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "WorkspaceSyncError";
    this.status = status;
  }
}

async function workspaceFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  const base = apiBase();
  if (!base) throw new WorkspaceSyncError("Backend API base is not configured.", 0);
  return fetch(`${base}${path}`, {
    ...init,
    mode: "cors",
    credentials: "omit",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

export type PullResult = {
  records: RemoteRecord[];
  watermark: number;
  scope: "user" | "org";
};

/** Fetch records of the given kinds changed after `since` (epoch seconds). */
export async function pullWorkspaceRecords(
  token: string,
  kinds: WorkspaceKind[],
  since = 0,
  scope: "user" | "org" = "user",
): Promise<PullResult> {
  const params = new URLSearchParams();
  params.set("kinds", kinds.join(","));
  params.set("since", String(Math.max(0, Math.floor(since))));
  if (scope === "org") params.set("scope", "org");

  const res = await workspaceFetch(`/api/workspace/records?${params.toString()}`, token);
  const data = await readJsonResponseBody<{
    success?: boolean;
    records?: RemoteRecord[];
    watermark?: number;
    scope?: "user" | "org";
    error?: string;
  }>(res);

  if (!res.ok || data.success !== true) {
    throw new WorkspaceSyncError(data.error || "Could not load saved work.", res.status);
  }
  return {
    records: Array.isArray(data.records) ? data.records : [],
    watermark: Number(data.watermark) || 0,
    scope: data.scope === "org" ? "org" : "user",
  };
}

export type PushResult = {
  accepted: string[];
  rejected: Array<{ id: string; reason: string }>;
  watermark: number;
};

/** Server caps a single push; keep batches below it. */
export const PUSH_BATCH_SIZE = 100;

/** Upsert a batch of records. Splits oversized batches to stay under the server limit. */
export async function pushWorkspaceRecords(token: string, records: PushRecord[]): Promise<PushResult> {
  const out: PushResult = { accepted: [], rejected: [], watermark: 0 };
  for (let i = 0; i < records.length; i += PUSH_BATCH_SIZE) {
    const batch = records.slice(i, i + PUSH_BATCH_SIZE);
    const res = await workspaceFetch("/api/workspace/records", token, {
      method: "POST",
      body: JSON.stringify({ records: batch }),
    });
    const data = await readJsonResponseBody<{
      success?: boolean;
      accepted?: string[];
      rejected?: Array<{ id: string; reason: string }>;
      watermark?: number;
      error?: string;
    }>(res);

    if (!res.ok || data.success !== true) {
      throw new WorkspaceSyncError(data.error || "Could not save your work.", res.status);
    }
    out.accepted.push(...(data.accepted || []));
    out.rejected.push(...(data.rejected || []));
    out.watermark = Math.max(out.watermark, Number(data.watermark) || 0);
  }
  return out;
}
