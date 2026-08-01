/**
 * IndexedDB store for field-project JPEG data URLs.
 * Keeps localStorage metadata-only so multi-photo jobs survive quota limits.
 */

const DB_NAME = "hd2d-field-photo-blobs-v1";
const STORE = "photos";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export async function putFieldPhotoBlob(photoId: string, imageDataUrl: string): Promise<void> {
  if (!photoId || !imageDataUrl.startsWith("data:image/")) return;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      await idbReq(tx.objectStore(STORE).put(imageDataUrl, photoId));
    } finally {
      db.close();
    }
  } catch (e) {
    console.warn("[field-photos] IndexedDB put failed", e);
  }
}

export async function getFieldPhotoBlob(photoId: string): Promise<string | null> {
  if (!photoId) return null;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readonly");
      const val = await idbReq(tx.objectStore(STORE).get(photoId));
      return typeof val === "string" && val.startsWith("data:image/") ? val : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function deleteFieldPhotoBlob(photoId: string): Promise<void> {
  if (!photoId) return;
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readwrite");
      await idbReq(tx.objectStore(STORE).delete(photoId));
    } finally {
      db.close();
    }
  } catch {
    // ignore
  }
}

export async function deleteFieldPhotoBlobs(photoIds: string[]): Promise<void> {
  await Promise.all(photoIds.map((id) => deleteFieldPhotoBlob(id)));
}

/** Rehydrate empty imageDataUrl rows from IndexedDB (in parallel, capped). */
export async function hydrateFieldProjectPhotosFromIdb<
  T extends { photos: Array<{ id: string; imageDataUrl: string }> },
>(projects: T[]): Promise<T[]> {
  const out: T[] = [];
  for (const project of projects) {
    const photos = await Promise.all(
      project.photos.map(async (ph) => {
        if (ph.imageDataUrl.startsWith("data:image/")) return ph;
        const blob = await getFieldPhotoBlob(ph.id);
        return blob ? { ...ph, imageDataUrl: blob } : ph;
      }),
    );
    out.push({ ...project, photos });
  }
  return out;
}
