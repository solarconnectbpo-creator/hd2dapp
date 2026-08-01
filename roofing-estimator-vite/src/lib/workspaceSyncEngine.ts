/**
 * Pure merge logic for workspace sync (no network, no storage — unit testable).
 *
 * Records are compared last-write-wins on `updatedAt`. Local edits are detected by
 * hashing each record's serialized form, so individual mutation sites do not have to
 * remember to stamp a timestamp.
 */

export type WorkspaceKind =
  | "measurement"
  | "estimate"
  | "contract"
  | "field_project"
  | "canvass_lead"
  | "canvass_visit"
  | "saved_job";

export type RemoteRecord = {
  id: string;
  kind: WorkspaceKind;
  data: unknown;
  updatedAt: number;
  deleted: boolean;
};

export type PushRecord = {
  id: string;
  kind: WorkspaceKind;
  data: unknown;
  updatedAt: number;
  deleted?: boolean;
};

export type SyncEntry = { updatedAt: number; hash: string };

export type SyncMeta = {
  /** Highest server `updatedAt` already pulled for this kind. */
  watermark: number;
  entries: Record<string, SyncEntry>;
};

export function emptySyncMeta(): SyncMeta {
  return { watermark: 0, entries: {} };
}

/** Stable stringify so key order changes do not register as edits. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

/** Small non-cryptographic hash (FNV-1a) — only needs to detect change, not resist attack. */
export function hashRecord(value: unknown): string {
  const s = stableStringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${h.toString(36)}:${s.length.toString(36)}`;
}

export type LocalDiff = {
  /** Records to push (new, edited, or newly deleted). */
  push: PushRecord[];
  nextMeta: SyncMeta;
  /** Unchanged — kept so callers can see the engine considered them. */
  unchangedIds: string[];
};

/**
 * Compare the current local collection against the last synced snapshot.
 *
 * Items whose hash changed (or that are new) are queued for push with `updatedAt = nowSec`.
 * Ids present in meta but missing from `items` are queued as soft deletes.
 */
export function diffLocal<T>(
  kind: WorkspaceKind,
  items: T[],
  getId: (item: T) => string,
  meta: SyncMeta,
  nowSec: number,
): LocalDiff {
  const push: PushRecord[] = [];
  const unchangedIds: string[] = [];
  const nextEntries: Record<string, SyncEntry> = {};
  const seen = new Set<string>();

  for (const item of items) {
    const id = getId(item);
    if (!id) continue;
    seen.add(id);
    const hash = hashRecord(item);
    const prev = meta.entries[id];
    if (prev && prev.hash === hash) {
      nextEntries[id] = prev;
      unchangedIds.push(id);
      continue;
    }
    const updatedAt = nowSec;
    push.push({ id, kind, data: item, updatedAt });
    nextEntries[id] = { updatedAt, hash };
  }

  for (const id of Object.keys(meta.entries)) {
    if (seen.has(id)) continue;
    // Was synced before and is gone locally — propagate the delete.
    push.push({ id, kind, data: null, updatedAt: nowSec, deleted: true });
  }

  return { push, nextMeta: { watermark: meta.watermark, entries: nextEntries }, unchangedIds };
}

export type RemoteMergeResult<T> = {
  items: T[];
  nextMeta: SyncMeta;
  /** True when any local item was added, replaced, or removed by the server. */
  changed: boolean;
};

/**
 * Fold server records into the local collection.
 *
 * A remote record wins when the local copy has not been edited more recently than the
 * server's `updatedAt`. Deletes remove the local item unless the local edit is newer.
 */
export function applyRemote<T>(
  items: T[],
  remote: RemoteRecord[],
  getId: (item: T) => string,
  meta: SyncMeta,
  toItem: (data: unknown) => T | null,
): RemoteMergeResult<T> {
  const byId = new Map<string, T>();
  for (const item of items) {
    const id = getId(item);
    if (id) byId.set(id, item);
  }

  const entries: Record<string, SyncEntry> = { ...meta.entries };
  let watermark = meta.watermark;
  let changed = false;

  for (const rec of remote) {
    if (rec.updatedAt > watermark) watermark = rec.updatedAt;
    const localEntry = entries[rec.id];
    const localIsNewer = localEntry != null && localEntry.updatedAt > rec.updatedAt;
    if (localIsNewer) continue;

    if (rec.deleted) {
      if (byId.delete(rec.id)) changed = true;
      delete entries[rec.id];
      continue;
    }

    const next = toItem(rec.data);
    if (!next) continue;
    const existing = byId.get(rec.id);
    const nextHash = hashRecord(next);
    if (!existing || hashRecord(existing) !== nextHash) changed = true;
    byId.set(rec.id, next);
    entries[rec.id] = { updatedAt: rec.updatedAt, hash: nextHash };
  }

  return {
    items: changed ? [...byId.values()] : items,
    nextMeta: { watermark, entries },
    changed,
  };
}

/** Record the server-accepted push so the next diff sees these as clean. */
export function commitPush(meta: SyncMeta, pushed: PushRecord[], watermark: number): SyncMeta {
  const entries = { ...meta.entries };
  for (const rec of pushed) {
    if (rec.deleted) {
      delete entries[rec.id];
      continue;
    }
    entries[rec.id] = { updatedAt: rec.updatedAt, hash: hashRecord(rec.data) };
  }
  return { watermark: Math.max(meta.watermark, watermark || 0), entries };
}
