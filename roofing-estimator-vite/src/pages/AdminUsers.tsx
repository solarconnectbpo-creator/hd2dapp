import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  adminCreateUser,
  adminDeleteUser,
  adminListUsers,
  adminSetUserApproval,
  adminUpdateUser,
  type AdminUserRow,
} from "../lib/authClient";

const ROLES: Array<{ value: AdminUserRow["user_type"]; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "company", label: "Company" },
  { value: "sales_rep", label: "Sales rep" },
];

function formatTs(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  return new Date(ts * 1000).toLocaleString();
}

export function AdminUsers() {
  const { user, session } = useAuth();
  const token = session?.token ?? "";
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<AdminUserRow["user_type"]>("sales_rep");

  const refresh = useCallback(async () => {
    if (!token) return;
    setError("");
    setLoading(true);
    try {
      const list = await adminListUsers(token);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (user?.user_type !== "admin") {
    return <Navigate to="/" replace />;
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await adminCreateUser(token, {
        email: newEmail.trim(),
        password: newPassword,
        name: newName.trim() || newEmail.trim().split("@")[0],
        user_type: newRole,
      });
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    if (!window.confirm("Delete this user? They will no longer be able to sign in.")) return;
    setBusy(true);
    setError("");
    try {
      await adminDeleteUser(token, id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hd2d-page-shell max-w-5xl space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#e7e9ea]">User accounts</h1>
        <p className="text-sm text-[#71767b] mt-1">
          Create logins, assign roles, approve company/rep access, and remove accounts. Passwords are stored hashed on the Worker
          (D1).
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[#f4212e] rounded-lg border border-[#f4212e]/40 bg-[#f4212e]/10 px-4 py-2">{error}</p>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0f1419] p-6 ring-1 ring-white/[0.04]">
        <h2 className="text-lg font-semibold text-[#e7e9ea]">Create user</h2>
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="text-sm text-[#9aa0a6]">Email</span>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-[#9aa0a6]">Temporary password</span>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-[#9aa0a6]">Display name</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm text-[#9aa0a6]">Role</span>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AdminUserRow["user_type"])}
              disabled={busy}
              className="w-full rounded-lg border border-[#2f3336] bg-[#000000] px-3 py-2 text-[#e7e9ea]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className="run-btn" disabled={busy}>
              {busy ? "Saving…" : "Create login"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1419] ring-1 ring-white/[0.04]">
        <div className="px-6 py-4 border-b border-[#2f3336] flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[#e7e9ea]">All users</h2>
          <button type="button" className="secondary-btn text-sm" onClick={() => void refresh()} disabled={loading || busy}>
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-[#71767b]">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-[#71767b]">
              No users in the database yet. Sign in with the default admin (env) once to migrate the account, or create a
              user above.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#16181c] text-[#9aa0a6]">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Approval</th>
                  <th className="px-4 py-3 font-medium">Billing</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium w-56">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2f3336] text-[#e7e9ea]">
                {rows.map((row) => (
                  <UserRow
                    key={row.id}
                    row={row}
                    currentUserId={user.id}
                    token={token}
                    busy={busy}
                    onBusy={setBusy}
                    onError={setError}
                    onRefresh={refresh}
                    onDeleteRow={onDelete}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function UserRow({
  row,
  currentUserId,
  token,
  busy,
  onBusy,
  onError,
  onRefresh,
  onDeleteRow,
}: {
  row: AdminUserRow;
  currentUserId: string;
  token: string;
  busy: boolean;
  onBusy: (v: boolean) => void;
  onError: (s: string) => void;
  onRefresh: () => Promise<void>;
  onDeleteRow: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [role, setRole] = useState(row.user_type);
  const [newPassword, setNewPassword] = useState("");

  const setApproval = async (st: "approved" | "rejected") => {
    onError("");
    onBusy(true);
    try {
      await adminSetUserApproval(token, row.id, st);
      await onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Approval update failed.");
    } finally {
      onBusy(false);
    }
  };

  const save = async () => {
    onError("");
    onBusy(true);
    try {
      await adminUpdateUser(token, row.id, {
        name: name.trim(),
        user_type: role,
        ...(newPassword.length >= 8 ? { password: newPassword } : {}),
      });
      setNewPassword("");
      setEditing(false);
      await onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      onBusy(false);
    }
  };

  const isSelf = row.id === currentUserId;

  return (
    <tr>
      <td className="px-4 py-3 align-top font-mono text-xs">{row.email}</td>
      <td className="px-4 py-3 align-top">
        {editing ? (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="max-w-[240px]"
            disabled={busy}
          />
        ) : (
          row.name
        )}
      </td>
      <td className="px-4 py-3 align-top">
        {editing ? (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUserRow["user_type"])}
            disabled={busy || isSelf}
            className="rounded border border-[#2f3336] bg-[#000000] px-2 py-1 text-xs"
            title={isSelf ? "Cannot change your own role here" : undefined}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="capitalize">{row.user_type.replace("_", " ")}</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-xs capitalize text-[#9aa0a6]">{row.approval_status}</td>
      <td className="px-4 py-3 align-top text-xs capitalize text-[#9aa0a6]">{row.billing_status}</td>
      <td className="px-4 py-3 align-top text-[#71767b] text-xs">{formatTs(row.updated_at)}</td>
      <td className="px-4 py-3 align-top space-y-2">
        {editing ? (
          <>
            <label className="block text-xs text-[#9aa0a6]">
              New password (optional)
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min 8 chars"
                disabled={busy}
                className="mt-1"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="secondary-btn text-xs py-1 px-2" onClick={() => void save()} disabled={busy}>
                Save
              </button>
              <button
                type="button"
                className="secondary-btn text-xs py-1 px-2"
                onClick={() => {
                  setEditing(false);
                  setName(row.name);
                  setRole(row.user_type);
                  setNewPassword("");
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {row.user_type !== "admin" ? (
              <>
                <button
                  type="button"
                  className="secondary-btn text-xs py-1 px-2"
                  disabled={busy}
                  onClick={() => void setApproval("approved")}
                  title="Allow platform access (still requires active billing for company/rep)"
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="secondary-btn text-xs py-1 px-2 border-rose-500/40 text-rose-300"
                  disabled={busy}
                  onClick={() => void setApproval("rejected")}
                >
                  Reject
                </button>
              </>
            ) : null}
            <button type="button" className="secondary-btn text-xs py-1 px-2" onClick={() => setEditing(true)} disabled={busy}>
              Edit
            </button>
            <button
              type="button"
              className="text-xs py-1 px-2 rounded-lg border border-[#f4212e]/50 text-[#f87171] hover:bg-[#f4212e]/10 disabled:opacity-40"
              disabled={busy || isSelf}
              onClick={() => void onDeleteRow(row.id)}
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
