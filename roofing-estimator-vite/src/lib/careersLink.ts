/** External recruiting URL; when unset, use in-app `/careers`. */
export function getExternalCareersUrl(): string | undefined {
  const raw = import.meta.env.VITE_CAREERS_URL;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (!t) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol === "http:" || u.protocol === "https:") return t;
  } catch {
    return undefined;
  }
  return undefined;
}
