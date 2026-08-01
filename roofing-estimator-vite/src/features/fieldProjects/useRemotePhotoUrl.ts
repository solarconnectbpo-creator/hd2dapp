import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import type { DamagePhoto } from "../../lib/fieldProjectTypes";
import { getFieldPhotoBlob } from "../../lib/fieldPhotoBlobStore";
import { fetchWorkspaceFileObjectUrl } from "../../lib/workspaceSyncClient";

/**
 * Source URL for a damage photo.
 *
 * Prefers an in-memory data URL, then IndexedDB (capture device), then R2 via the API.
 */
export function useRemotePhotoUrl(photo: DamagePhoto): string | null {
  const { session } = useAuth();
  const token = session?.token ?? "";
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  const needsLookup = !photo.imageDataUrl;

  useEffect(() => {
    if (!needsLookup) {
      setResolvedUrl(null);
      return;
    }
    let cancelled = false;
    let created: string | null = null;

    void (async () => {
      const local = await getFieldPhotoBlob(photo.id);
      if (cancelled) return;
      if (local) {
        setResolvedUrl(local);
        return;
      }
      if (!token || !photo.remoteKey) {
        setResolvedUrl(null);
        return;
      }
      const url = await fetchWorkspaceFileObjectUrl(token, photo.remoteKey);
      if (!url) return;
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      created = url;
      setResolvedUrl(url);
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [needsLookup, token, photo.id, photo.remoteKey]);

  return photo.imageDataUrl || resolvedUrl;
}
