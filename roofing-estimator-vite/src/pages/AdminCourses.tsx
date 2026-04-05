import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_COURSES_CATALOG, type CoursesCatalogData } from "../data/coursesCatalog";
import {
  adminDeleteCoursesCatalog,
  adminGetCoursesCatalog,
  adminPutCoursesCatalog,
} from "../lib/coursesCatalogClient";

function formatTs(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  return new Date(ts * 1000).toLocaleString();
}

export function AdminCourses() {
  const { user, session } = useAuth();
  const token = session?.token ?? "";
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [serverHadRow, setServerHadRow] = useState(false);

  const loadFromServer = useCallback(async () => {
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const { catalog, updatedAt: at } = await adminGetCoursesCatalog(token);
      setUpdatedAt(at);
      setServerHadRow(catalog != null);
      const effective = catalog ?? DEFAULT_COURSES_CATALOG;
      setDraft(JSON.stringify(effective, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load catalog.");
      setDraft(JSON.stringify(DEFAULT_COURSES_CATALOG, null, 2));
      setUpdatedAt(null);
      setServerHadRow(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadFromServer();
  }, [loadFromServer]);

  if (user?.user_type !== "admin") {
    return <Navigate to="/" replace />;
  }

  const parseDraft = (): CoursesCatalogData | null => {
    try {
      return JSON.parse(draft) as CoursesCatalogData;
    } catch {
      return null;
    }
  };

  const onSave = async () => {
    const parsed = parseDraft();
    if (!parsed) {
      setError("JSON is invalid — fix syntax before saving.");
      return;
    }
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const at = await adminPutCoursesCatalog(token, parsed);
      setUpdatedAt(at);
      setServerHadRow(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const onClearServer = async () => {
    if (!token || !window.confirm("Remove the saved catalog from the server? Everyone will see the built-in default until you save again.")) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminDeleteCoursesCatalog(token);
      setServerHadRow(false);
      setUpdatedAt(null);
      setDraft(JSON.stringify(DEFAULT_COURSES_CATALOG, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Clear failed.");
    } finally {
      setBusy(false);
    }
  };

  const onResetEditor = () => {
    setDraft(JSON.stringify(DEFAULT_COURSES_CATALOG, null, 2));
    setError("");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 text-black sm:px-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin — courses catalog</h1>
          <p className="mt-1 text-sm text-black/70">
            JSON for the Skill Hub (<Link to="/courses" className="text-sky-700 underline">/courses</Link>). Invalid
            shapes are rejected by the server.
          </p>
        </div>
        <p className="text-xs text-black/60">
          Last saved: {formatTs(updatedAt ?? 0)}
          {!serverHadRow ? " (using built-in default on server)" : ""}
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-black/60">Loading…</p>
      ) : (
        <>
          <textarea
            className="mb-4 min-h-[28rem] w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-black"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Courses catalog JSON"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              disabled={busy}
              onClick={() => void onSave()}
            >
              Save to server
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-50 disabled:opacity-50"
              disabled={busy}
              onClick={() => void loadFromServer()}
            >
              Reload from server
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-50 disabled:opacity-50"
              disabled={busy}
              onClick={onResetEditor}
            >
              Reset editor to built-in default
            </button>
            <button
              type="button"
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
              disabled={busy || !serverHadRow}
              onClick={() => void onClearServer()}
            >
              Clear server copy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
