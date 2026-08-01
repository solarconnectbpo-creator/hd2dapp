/**
 * Workspace document storage (D1).
 *
 * Replaces browser-only persistence for measurements, estimates, contracts, field
 * projects, and canvassing data. Records are opaque JSON keyed by (user_id, kind, id);
 * sync is last-write-wins on `updated_at` and deletes are soft so other devices converge.
 *
 * Schema: migrations/0014_workspace_records.sql
 */

type D1 = any;

export const WORKSPACE_KINDS = [
  "measurement",
  "estimate",
  "contract",
  "field_project",
  "canvass_lead",
  "canvass_visit",
  "saved_job",
] as const;

export type WorkspaceKind = (typeof WORKSPACE_KINDS)[number];

const KIND_SET = new Set<string>(WORKSPACE_KINDS);

export function isWorkspaceKind(v: unknown): v is WorkspaceKind {
  return typeof v === "string" && KIND_SET.has(v);
}

/** Guard against a single oversized document wedging a user's whole sync. */
export const MAX_RECORD_BYTES = 512 * 1024;
/** Cap one push so a large local cache cannot time out the Worker. */
export const MAX_RECORDS_PER_PUSH = 200;

export type WorkspaceRecord = {
  id: string;
  kind: WorkspaceKind;
  data: unknown;
  updatedAt: number;
  deleted: boolean;
  /** Present on team reads so the UI can attribute a record to a rep. */
  userId?: string;
};

type WorkspaceRow = {
  id: string;
  kind: string;
  user_id: string;
  data: string;
  updated_at: number;
  deleted_at: number | null;
};

function rowToRecord(row: WorkspaceRow, includeUser: boolean): WorkspaceRecord {
  let data: unknown = null;
  try {
    data = JSON.parse(row.data);
  } catch {
    data = null;
  }
  return {
    id: row.id,
    kind: row.kind as WorkspaceKind,
    data,
    updatedAt: Number(row.updated_at) || 0,
    deleted: row.deleted_at != null,
    ...(includeUser ? { userId: row.user_id } : {}),
  };
}

/** The caller's organization, if any. Used to scope team reads. */
export async function findOrgForUser(
  db: D1,
  userId: string,
): Promise<{ orgId: string; role: string } | null> {
  const row = await db
    .prepare(`SELECT org_id, role FROM org_members WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<{ org_id: string; role: string }>();
  return row ? { orgId: row.org_id, role: row.role } : null;
}

export type ListWorkspaceArgs = {
  userId: string;
  kinds: WorkspaceKind[];
  /** Only records changed strictly after this epoch-seconds watermark. */
  since?: number;
  /** Include org peers' records (managers). Requires orgId. */
  scope?: "user" | "org";
  orgId?: string | null;
  limit?: number;
};

export async function listWorkspaceRecords(
  db: D1,
  args: ListWorkspaceArgs,
): Promise<WorkspaceRecord[]> {
  const kinds = args.kinds.filter(isWorkspaceKind);
  if (kinds.length === 0) return [];

  const limit = Math.min(Math.max(Number(args.limit) || 1000, 1), 5000);
  const since = Number.isFinite(Number(args.since)) ? Math.max(0, Number(args.since)) : 0;
  const teamScope = args.scope === "org" && !!args.orgId;

  const kindPlaceholders = kinds.map(() => "?").join(", ");
  const scopeClause = teamScope ? `org_id = ?` : `user_id = ?`;
  const scopeValue = teamScope ? args.orgId : args.userId;

  const res = await db
    .prepare(
      `SELECT id, kind, user_id, data, updated_at, deleted_at
         FROM workspace_records
        WHERE ${scopeClause}
          AND kind IN (${kindPlaceholders})
          AND updated_at > ?
        ORDER BY updated_at ASC
        LIMIT ?`,
    )
    .bind(scopeValue, ...kinds, since, limit)
    .all();

  const rows = (res.results || []) as WorkspaceRow[];
  return rows.map((r) => rowToRecord(r, teamScope));
}

export type UpsertInput = {
  id: string;
  kind: WorkspaceKind;
  data: unknown;
  updatedAt?: number;
  deleted?: boolean;
};

export type UpsertResult = {
  accepted: string[];
  rejected: Array<{ id: string; reason: string }>;
  /** Max updated_at written — clients store this as their next sync watermark. */
  watermark: number;
};

/**
 * Upsert a batch of records for one user.
 *
 * Last-write-wins: an incoming record is ignored when the stored row has a newer
 * `updated_at`, so a stale device cannot clobber fresher work.
 */
export async function upsertWorkspaceRecords(
  db: D1,
  userId: string,
  orgId: string | null,
  records: UpsertInput[],
): Promise<UpsertResult> {
  const accepted: string[] = [];
  const rejected: Array<{ id: string; reason: string }> = [];
  let watermark = 0;

  for (const rec of records.slice(0, MAX_RECORDS_PER_PUSH)) {
    const id = String(rec?.id || "").trim();
    if (!id || id.length > 200) {
      rejected.push({ id: id || "(missing)", reason: "invalid id" });
      continue;
    }
    if (!isWorkspaceKind(rec?.kind)) {
      rejected.push({ id, reason: "invalid kind" });
      continue;
    }

    let serialized: string;
    try {
      serialized = JSON.stringify(rec.data ?? null);
    } catch {
      rejected.push({ id, reason: "data is not serializable" });
      continue;
    }
    if (serialized.length > MAX_RECORD_BYTES) {
      rejected.push({ id, reason: "record too large" });
      continue;
    }

    const updatedAt =
      Number.isFinite(Number(rec.updatedAt)) && Number(rec.updatedAt) > 0
        ? Math.floor(Number(rec.updatedAt))
        : Math.floor(Date.now() / 1000);
    const deletedAt = rec.deleted ? updatedAt : null;

    await db
      .prepare(
        `INSERT INTO workspace_records (id, kind, user_id, org_id, data, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, kind, id) DO UPDATE SET
           org_id     = excluded.org_id,
           data       = excluded.data,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at
         WHERE excluded.updated_at >= workspace_records.updated_at`,
      )
      .bind(id, rec.kind, userId, orgId, serialized, updatedAt, deletedAt)
      .run();

    accepted.push(id);
    if (updatedAt > watermark) watermark = updatedAt;
  }

  return { accepted, rejected, watermark };
}

/** Soft-delete one record so other devices converge instead of resurrecting it. */
export async function softDeleteWorkspaceRecord(
  db: D1,
  userId: string,
  kind: WorkspaceKind,
  id: string,
): Promise<boolean> {
  const t = Math.floor(Date.now() / 1000);
  const res = await db
    .prepare(
      `UPDATE workspace_records
          SET deleted_at = ?, updated_at = ?, data = 'null'
        WHERE user_id = ? AND kind = ? AND id = ?`,
    )
    .bind(t, t, userId, kind, id)
    .run();
  return Number(res?.meta?.changes ?? res?.changes ?? 0) > 0;
}

/** Housekeeping: drop tombstones old enough that every device has converged. */
export async function purgeOldTombstones(db: D1, olderThanSeconds = 60 * 60 * 24 * 90): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;
  const res = await db
    .prepare(`DELETE FROM workspace_records WHERE deleted_at IS NOT NULL AND deleted_at < ?`)
    .bind(cutoff)
    .run();
  return Number(res?.meta?.changes ?? res?.changes ?? 0);
}
