import { useRoofing } from "../context/RoofingContext";
import { SyncStatusText } from "./SyncStatusText";

/**
 * Sync indicator for estimates, proposals, and field jobs (RoofingContext-backed).
 */
export function WorkspaceSyncBadge({ className = "" }: { className?: string }) {
  const { sync, syncNow } = useRoofing();
  return <SyncStatusText state={sync} onRetry={syncNow} className={className} />;
}
