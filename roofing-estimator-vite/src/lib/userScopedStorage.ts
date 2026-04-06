/**
 * Prefixes browser localStorage keys with the signed-in user id so multiple accounts
 * on the same device do not share drafts, contacts, canvassing, etc.
 *
 * `setActiveStorageUserId` is invoked from `AuthProvider` on each render when `session` is known.
 */

let activeUserId: string | null = null;

export function setActiveStorageUserId(id: string | null): void {
  activeUserId = id?.trim() || null;
}

export function getActiveStorageUserId(): string | null {
  return activeUserId;
}

/** Returns null when no user is active — callers should treat as empty / defaults. */
export function getScopedStorageKey(baseKey: string): string | null {
  if (!activeUserId) return null;
  return `hd2d-uid:${activeUserId}:${baseKey}`;
}
