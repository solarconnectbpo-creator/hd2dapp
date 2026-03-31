/**
 * Merge contact snippets copied from manual research (e.g. FastPeopleSearch in another tab).
 * Does not call third-party people-search sites — user copies text, we parse phones locally.
 */

import type { PropertyImportPayload } from "./propertyScraper";

/** US phone patterns in pasted text */
const US_PHONE_CHUNK =
  /(?:\+?1[-.\s]*)?(?:\(\s*\d{3}\s*\)|\d{3})[-.\s]*\d{3}[-.\s]*\d{4}\b/g;

function normalizePhoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  if (d.length === 10) return d;
  return "";
}

function formatUsPhone10(d10: string): string {
  if (d10.length !== 10) return d10;
  return `(${d10.slice(0, 3)}) ${d10.slice(3, 6)}-${d10.slice(6)}`;
}

/**
 * Extract unique US phone numbers from arbitrary pasted text (HTML or plain).
 */
export function extractUsPhonesFromText(text: string): string[] {
  const t = text.replace(/\u00a0/g, " ");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of t.matchAll(US_PHONE_CHUNK)) {
    const d = normalizePhoneDigits(m[0] ?? "");
    if (d.length !== 10) continue;
    const formatted = formatUsPhone10(d);
    if (!seen.has(d)) {
      seen.add(d);
      out.push(formatted);
    }
  }
  return out;
}

function uniquePipePhones(existing: string, additions: string[]): string {
  const parts = [...existing.split("|"), ...additions].map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const p of parts) {
    const key = normalizePhoneDigits(p);
    if (key.length !== 10 || seen.has(key)) continue;
    seen.add(key);
    merged.push(p);
  }
  return merged.join(" | ");
}

/** Append phones from clipboard into **contact person** line (keeps company/main phones in ownerPhone). */
export function mergePhonesFromManualResearch(
  p: PropertyImportPayload,
  phones: string[],
  sourceLabel: string,
): PropertyImportPayload {
  if (!phones.length) return p;
  const nextPhone = uniquePipePhones(p.contactPersonPhone, phones);
  const tag = `Manual lookup (${sourceLabel}): ${phones.join(", ")}`;
  const notes = p.notes.trim() ? `${p.notes.trim()}\n${tag}` : tag;
  return { ...p, contactPersonPhone: nextPhone, notes };
}

/**
 * Sets **contact person** name (individual you found — e.g. FPS). Does not change deed / LLC name in ownerName.
 */
export function mergeOwnerNameFromManualResearch(
  p: PropertyImportPayload,
  name: string,
  sourceLabel: string,
): PropertyImportPayload {
  const n = name.trim();
  if (!n) return p;
  if (p.contactPersonName.trim().toLowerCase() === n.toLowerCase()) return p;
  const tag = `Manual contact name (${sourceLabel}): ${n}`;
  const notes = p.notes.trim() ? `${p.notes.trim()}\n${tag}` : tag;
  return { ...p, contactPersonName: n, notes };
}
