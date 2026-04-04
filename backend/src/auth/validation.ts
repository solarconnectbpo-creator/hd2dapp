/** Basic RFC-inspired sanity check; not exhaustive. */
export function isValidEmail(email: string): boolean {
  const s = email.trim();
  if (s.length < 3 || s.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Strip control chars and cap length for display names. */
export function normalizeDisplayName(name: string): string {
  return name.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 128);
}
