import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getScopedStorageKey } from "./userScopedStorage";
import {
  applyRemote,
  commitPush,
  diffLocal,
  emptySyncMeta,
  type SyncMeta,
  type WorkspaceKind,
} from "./workspaceSyncEngine";
import { pullWorkspaceRecords, pushWorkspaceRecords } from "./workspaceSyncClient";

export type CollectionSyncState = {
  status: "off" | "idle" | "syncing" | "error";
  lastSyncedAt: number | null;
  error: string | null;
};

const META_KEY_PREFIX = "roofing-workspace-sync-meta";

function metaKeyFor(kind: WorkspaceKind): string | null {
  return getScopedStorageKey(`${META_KEY_PREFIX}-${kind}-v1`);
}

function loadMeta(kind: WorkspaceKind): SyncMeta {
  if (typeof window === "undefined") return emptySyncMeta();
  const key = metaKeyFor(kind);
  if (!key) return emptySyncMeta();
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SyncMeta) : emptySyncMeta();
  } catch {
    return emptySyncMeta();
  }
}

function saveMeta(kind: WorkspaceKind, meta: SyncMeta): void {
  if (typeof window === "undefined") return;
  const key = metaKeyFor(kind);
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(meta));
  } catch {
    // Best effort — a lost watermark only causes a redundant re-push next time.
  }
}

/**
 * Mirrors one local collection to `/api/workspace` so the data survives a cleared
 * browser and follows the user to another device.
 *
 * The caller keeps owning local state (and its localStorage cache); this hook pulls
 * remote changes in, then pushes local creates/edits/deletes back out on a debounce.
 */
export function useWorkspaceCollectionSync<T>(options: {
  kind: WorkspaceKind;
  items: T[];
  getId: (item: T) => string;
  /** Called when the server contributes changes. Should replace local state. */
  onRemoteMerge: (items: T[]) => void;
  /** Validate/normalize an inbound record; return null to skip it. */
  toItem: (data: unknown) => T | null;
  /** Set false to pause syncing (e.g. feature disabled). */
  enabled?: boolean;
}): { state: CollectionSyncState; syncNow: () => void } {
  const { kind, items, getId, onRemoteMerge, toItem, enabled = true } = options;
  const { user, session } = useAuth();
  const token = session?.token ?? "";
  const userId = user?.id ?? null;

  const [state, setState] = useState<CollectionSyncState>({
    status: "off",
    lastSyncedAt: null,
    error: null,
  });

  const metaRef = useRef<SyncMeta>(emptySyncMeta());
  const runningRef = useRef(false);
  const rerunRef = useRef(false);
  const hydratedRef = useRef(false);

  // Read the freshest collection inside the loop without retriggering it.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cbRef = useRef({ getId, onRemoteMerge, toItem });
  cbRef.current = { getId, onRemoteMerge, toItem };

  useEffect(() => {
    hydratedRef.current = false;
    metaRef.current = userId ? loadMeta(kind) : emptySyncMeta();
    setState({ status: userId && enabled ? "idle" : "off", lastSyncedAt: null, error: null });
  }, [userId, kind, enabled]);

  const runSync = useCallback(async () => {
    if (!token || !userId || !enabled) return;
    if (runningRef.current) {
      rerunRef.current = true;
      return;
    }
    runningRef.current = true;
    setState((s) => ({ ...s, status: "syncing", error: null }));

    try {
      const { getId: id, onRemoteMerge: merge, toItem: parse } = cbRef.current;

      const pulled = await pullWorkspaceRecords(token, [kind], metaRef.current.watermark);
      const remoteApplied = applyRemote(itemsRef.current, pulled.records, id, metaRef.current, parse);
      metaRef.current = remoteApplied.nextMeta;
      if (remoteApplied.changed) {
        merge(remoteApplied.items);
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const diff = diffLocal(kind, remoteApplied.items, id, metaRef.current, nowSec);
      metaRef.current = diff.nextMeta;

      if (diff.push.length > 0) {
        const result = await pushWorkspaceRecords(token, diff.push);
        metaRef.current = commitPush(metaRef.current, diff.push, result.watermark);
        if (result.rejected.length > 0) {
          console.warn(`[${kind}] server rejected records`, result.rejected);
        }
      }

      metaRef.current = {
        ...metaRef.current,
        watermark: Math.max(metaRef.current.watermark, pulled.watermark),
      };
      saveMeta(kind, metaRef.current);
      hydratedRef.current = true;
      setState({ status: "idle", lastSyncedAt: Date.now(), error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed.";
      setState((s) => ({ status: "error", lastSyncedAt: s.lastSyncedAt, error: message }));
    } finally {
      runningRef.current = false;
      if (rerunRef.current) {
        rerunRef.current = false;
        void runSync();
      }
    }
  }, [kind, token, userId, enabled]);

  // Hydrate once signed in.
  useEffect(() => {
    if (!token || !userId || !enabled) return;
    void runSync();
  }, [token, userId, enabled, runSync]);

  // Push after local edits settle.
  useEffect(() => {
    if (!token || !userId || !enabled || !hydratedRef.current) return;
    const t = window.setTimeout(() => void runSync(), 1500);
    return () => window.clearTimeout(t);
  }, [items, token, userId, enabled, runSync]);

  const syncNow = useCallback(() => {
    void runSync();
  }, [runSync]);

  return { state, syncNow };
}
