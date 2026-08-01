import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { DamagePhoto } from "../../lib/fieldProjectTypes";
import { fetchWorkspaceFileObjectUrl } from "../../lib/workspaceSyncClient";

/**
 * Source URL for a damage photo.
 *
 * Prefers the locally cached data URL. On a device that pulled the project from the
 * server the bytes are not in localStorage, so the stored blob is fetched once and
 * exposed as an object URL (revoked on unmount).
 */
export function useRemotePhotoUrl(photo: DamagePhoto): string | null {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const needsRemote = !photo.imageDataUrl && Boolean(photo.remoteKey);

  useEffect(() => {
    if (!needsRemote || !token || !photo.remoteKey) return;
    let cancelled = false;
    let created: string | null = null;

    void fetchWorkspaceFileObjectUrl(token, photo.remoteKey).then((url) => {
      if (!url) return;
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      created = url;
      setObjectUrl(url);
    });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [needsRemote, token, photo.remoteKey]);

  return photo.imageDataUrl || objectUrl;
}
