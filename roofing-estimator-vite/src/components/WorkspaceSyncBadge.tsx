import { AlertTriangle, Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useRoofing } from "../context/RoofingContext";

function relativeTime(ts: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString();
}

/**
 * Shows whether work is saved to the user's account or only cached in this browser,
 * so a rep can tell at a glance that closing the tab is safe.
 */
export function WorkspaceSyncBadge({ className = "" }: { className?: string }) {
  const { sync, syncNow } = useRoofing();

  const base = `inline-flex items-center gap-1.5 text-xs ${className}`;

  if (sync.status === "off") {
    return (
      <span className={`${base} text-[var(--x-muted)]`}>
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
        Sign in to save your work to your account
      </span>
    );
  }

  if (sync.status === "syncing") {
    return (
      <span className={`${base} text-[var(--x-muted)]`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }

  if (sync.status === "error") {
    return (
      <span className={`${base} text-amber-400`}>
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        Saved on this device only — could not reach the server.
        <button
          type="button"
          onClick={syncNow}
          className="ml-1 inline-flex items-center gap-1 underline hover:opacity-80"
        >
          <RefreshCw className="h-3 w-3" aria-hidden />
          Retry
        </button>
      </span>
    );
  }

  return (
    <span className={`${base} text-emerald-400`}>
      <Cloud className="h-3.5 w-3.5" aria-hidden />
      Saved to your account{sync.lastSyncedAt ? ` · ${relativeTime(sync.lastSyncedAt)}` : ""}
    </span>
  );
}
