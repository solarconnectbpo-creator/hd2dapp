/**
 * Optional contact enrichment via People Data Labs Person / Company Enrichment APIs.
 * Dev: use Vite proxy `/pdl-api` → api.peopledatalabs.com (CORS). Production: call origin must allow CORS or use a backend.
 * Comply with PDL terms and your license; do not expose API keys in client bundles you ship publicly without review.
 */

import {
  isLikelyPropertyManagerOrCommercialOwner,
  type PropertyImportPayload,
} from "./propertyScraper";
import { extractCityFromPropertyAddress } from "./propertyPhoneEnrichment";
import { isViteDevProxyOrigin } from "./viteApiProxy";
import { getScopedStorageKey } from "./userScopedStorage";

export const PROPERTY_SCRAPER_PDL_KEY_STORAGE = "roofing-estimator-vite-pdl-api-key";

export function getPdlKeyStorageKey(): string | null {
  return getScopedStorageKey(PROPERTY_SCRAPER_PDL_KEY_STORAGE);
}

function pdlBaseUrl(): string {
  return isViteDevProxyOrigin() ? "/pdl-api" : "https://api.peopledatalabs.com";
}

export type PdlEnrichOptions = {
  /** Company enrich for org / PM-style rows (default true). */
  companyRows?: boolean;
  /** Person enrich for non-company rows when true. */
  includeIndividuals?: boolean;
  skipIfPhonePresent?: boolean;
  minLikelihood?: number;
};

function hasDigitPhone(s: string): boolean {
  return /\d{3}/.test(s.replace(/\D/g, ""));
}

function primaryOwnerLabel(p: PropertyImportPayload): string {
  const pm = p.ownerPmEntityLabel?.trim();
  if (pm) return pm;
  return p.ownerName.split("|")[0]?.trim() ?? "";
}

function shouldTryCompany(p: PropertyImportPayload, opts: PdlEnrichOptions): boolean {
  if (opts.companyRows === false) return false;
  const org = p.ownerEntityType.trim().toLowerCase() === "organization";
  return org || isLikelyPropertyManagerOrCommercialOwner(p.ownerName, p.ownerEntityType);
}

function shouldTryPerson(p: PropertyImportPayload, opts: PdlEnrichOptions): boolean {
  if (!opts.includeIndividuals) return false;
  return !shouldTryCompany(p, { ...opts, companyRows: true });
}

function shouldSkipRow(p: PropertyImportPayload, opts: PdlEnrichOptions): boolean {
  if (opts.skipIfPhonePresent !== false && hasDigitPhone(p.ownerPhone)) return true;
  if (shouldTryCompany(p, opts)) return false;
  if (shouldTryPerson(p, opts)) return false;
  return true;
}

function mergePhone(existing: string, found: string, source: string): string {
  if (!existing.trim()) return `${found} [${source}]`;
  if (existing.includes(found)) return existing;
  return `${existing} | ${found} [${source}]`;
}

function mergeEmail(existing: string, found: string, source: string): string {
  const f = found.trim();
  if (!f) return existing;
  if (!existing.trim()) return `${f} [${source}]`;
  if (existing.includes(f)) return existing;
  return `${existing} | ${f} [${source}]`;
}

function pushUniqueEmail(bucket: string[], raw: string): void {
  const s = raw.trim();
  if (s.includes("@") && !bucket.includes(s)) bucket.push(s);
}

function pickEmailsFromPersonData(data: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const k of ["work_email", "recommended_personal_email", "recommended_professional_email"]) {
    pushUniqueEmail(out, String(data[k] ?? ""));
  }
  for (const key of ["emails", "personal_emails", "work_emails"]) {
    const arr = data[key];
    if (!Array.isArray(arr)) continue;
    for (const x of arr) {
      if (typeof x === "string") pushUniqueEmail(out, x);
      else if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        pushUniqueEmail(out, String(o.address ?? o.email ?? o.value ?? ""));
      }
    }
  }
  return out;
}

function pickEmailsFromCompanyProfile(profile: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const k of ["email", "corporate_email", "contact_email"]) {
    pushUniqueEmail(out, String(profile[k] ?? ""));
  }
  return out;
}

function mergeNotes(existing: string, line: string): string {
  if (existing.includes(line)) return existing;
  return existing ? `${existing}\n${line}` : line;
}

function pickPhonesFromPersonData(data: Record<string, unknown>): string[] {
  const out: string[] = [];
  const mobile = String(data.mobile_phone ?? "").trim();
  if (mobile) out.push(mobile);
  const nums = data.phone_numbers;
  if (Array.isArray(nums)) {
    for (const x of nums) {
      if (typeof x === "string") {
        const s = x.trim();
        if (s) out.push(s);
      } else if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const n = String(o.number ?? o.phone_number ?? "").trim();
        if (n) out.push(n);
      }
    }
  }
  const dedup: string[] = [];
  for (const s of out) if (!dedup.includes(s)) dedup.push(s);
  return dedup;
}

function pickPhoneFromCompanyData(data: Record<string, unknown>): string | null {
  const phone = String(data.phone ?? data.primary_phone ?? "").trim();
  if (phone) return phone;
  return null;
}

/**
 * Company Enrichment returns profile fields at the **top level** (not under `data`).
 * See https://docs.peopledatalabs.com/docs/output-response-company-enrichment-api
 */
function pickPhoneFromCompanyResponse(json: Record<string, unknown>): string | null {
  const direct = pickPhoneFromCompanyData(json);
  if (direct) return direct;
  for (const k of ["display_phone", "hq_phone", "phone_number", "main_phone", "corporate_phone"]) {
    const s = String(json[k] ?? "").trim();
    if (s && /\d/.test(s)) return s;
  }
  const loc = json.location;
  if (loc && typeof loc === "object") {
    const nested = pickPhoneFromCompanyData(loc as Record<string, unknown>);
    if (nested) return nested;
  }
  return null;
}

/** Strip PDL meta keys; company profile lives on the root next to status/likelihood. */
function companyProfileRecord(json: PdlEnvelope): Record<string, unknown> {
  const root = json as unknown as Record<string, unknown>;
  const skip = new Set(["status", "likelihood", "error", "matched", "data"]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(root)) {
    if (!skip.has(k)) out[k] = v;
  }
  if (json.data && typeof json.data === "object") {
    return { ...out, ...(json.data as Record<string, unknown>) };
  }
  return out;
}

type PdlEnvelope = {
  status?: number;
  likelihood?: number;
  data?: Record<string, unknown>;
  error?: { type?: string; message?: string };
};

async function postPdl(path: string, body: unknown, apiKey: string): Promise<{ ok: true; json: PdlEnvelope } | { ok: false; message: string }> {
  const key = apiKey.trim();
  if (!key) return { ok: false, message: "Add a People Data Labs API key." };
  const url = `${pdlBaseUrl()}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": key,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? `${e.message} — on localhost use \`npm run dev\` or \`npm run preview\` so requests use the Vite proxy (avoids CORS). Deployed static sites need a server-side proxy.`
          : "Network error calling People Data Labs.",
    };
  }
  const raw = await res.text();
  let json: PdlEnvelope;
  try {
    json = JSON.parse(raw) as PdlEnvelope;
  } catch {
    return { ok: false, message: `PDL ${res.status}: ${raw.slice(0, 240)}` };
  }
  if (!res.ok) {
    const msg = json.error?.message ?? raw.slice(0, 200);
    return { ok: false, message: `PDL ${res.status}: ${msg}` };
  }
  if (json.status === 404 || (typeof json.status === "number" && json.status >= 400)) {
    const msg = json.error?.message ?? "No matching record.";
    return { ok: false, message: msg };
  }
  return { ok: true, json };
}

function locationParams(p: PropertyImportPayload): { locality: string; region: string; country: string } {
  const locality = extractCityFromPropertyAddress(p.address);
  const region = p.stateCode.trim().toUpperCase().slice(0, 2);
  return { locality, region, country: "US" };
}

export type PdlCompanyContact = {
  phone?: string;
  emails: string[];
  /** Canonical / display company name from PDL when present */
  displayName?: string;
  likelihood?: number;
};

/**
 * Company enrichment for LLC / organization / PM-style owner names.
 */
export async function fetchCompanyContactFromPdl(
  companyName: string,
  p: PropertyImportPayload,
  apiKey: string,
  minLikelihood: number,
): Promise<{ ok: true; contact: PdlCompanyContact } | { ok: false; message: string }> {
  const name = companyName.trim();
  if (!name) return { ok: false, message: "No company / owner name for PDL company lookup." };
  const { locality, region, country } = locationParams(p);
  const r = await postPdl(
    "/v5/company/enrich",
    {
      params: {
        name,
        ...(locality ? { locality } : {}),
        ...(region ? { region } : {}),
        country,
      },
      min_likelihood: minLikelihood,
    },
    apiKey,
  );
  if (!r.ok) return r;
  const profile = companyProfileRecord(r.json);
  if (Object.keys(profile).length === 0) {
    return { ok: false, message: "PDL company response had no profile fields." };
  }
  const phone = pickPhoneFromCompanyResponse(profile) ?? undefined;
  const emails = pickEmailsFromCompanyProfile(profile);
  const displayNameRaw = String(profile.display_name ?? profile.name ?? "").trim();
  const displayName = displayNameRaw || undefined;
  if (!phone && !emails.length && !displayName) {
    return {
      ok: false,
      message:
        "PDL returned a company match but no phone, email, or display name in the payload (fields may be null or not in your PDL bundle).",
    };
  }
  return {
    ok: true,
    contact: { phone, emails, displayName, likelihood: r.json.likelihood },
  };
}

export type PdlPersonContact = {
  phones: string[];
  emails: string[];
  fullName?: string;
  likelihood?: number;
};

/**
 * Person enrichment when the owner looks like an individual name.
 */
export async function fetchPersonContactFromPdl(
  p: PropertyImportPayload,
  apiKey: string,
  minLikelihood: number,
): Promise<{ ok: true; contact: PdlPersonContact } | { ok: false; message: string }> {
  const name = primaryOwnerLabel(p);
  if (!name) return { ok: false, message: "No person name for PDL person lookup." };
  const { locality, region, country } = locationParams(p);
  const r = await postPdl(
    "/v5/person/enrich",
    {
      params: {
        name,
        ...(locality ? { locality } : {}),
        ...(region ? { region } : {}),
        country,
      },
      min_likelihood: minLikelihood,
    },
    apiKey,
  );
  if (!r.ok) return r;
  const data = r.json.data;
  if (!data || typeof data !== "object") return { ok: false, message: "PDL person response had no data object." };
  const row = data as Record<string, unknown>;
  const phones = pickPhonesFromPersonData(row);
  const emails = pickEmailsFromPersonData(row);
  const fn = String(row.full_name ?? row.name ?? "").trim();
  const fullName = fn || undefined;
  if (!phones.length && !emails.length && !fullName) {
    return {
      ok: false,
      message: "PDL matched a person but no phone, email, or name fields were present in the payload.",
    };
  }
  return {
    ok: true,
    contact: { phones, emails, fullName, likelihood: r.json.likelihood },
  };
}

function applyPdlCompanyToPayload(p: PropertyImportPayload, label: string, c: PdlCompanyContact): PropertyImportPayload {
  const next = { ...p };
  if (c.phone) next.ownerPhone = mergePhone(next.ownerPhone, c.phone, "PDL Company");
  for (const e of c.emails) next.ownerEmail = mergeEmail(next.ownerEmail, e, "PDL Company");
  if (c.displayName) {
    next.ownerName = mergePhone(next.ownerName, c.displayName, "PDL Company name");
  }
  const noteBits: string[] = [];
  if (c.phone) noteBits.push(`phone ${c.phone}`);
  for (const e of c.emails) noteBits.push(`email ${e}`);
  if (c.displayName) noteBits.push(`display name "${c.displayName}"`);
  const L = c.likelihood != null ? ` (likelihood ${c.likelihood})` : "";
  next.notes = mergeNotes(next.notes, `PDL company enrich (${label}): ${noteBits.join("; ")}${L}.`);
  return next;
}

function applyPdlPersonToPayload(p: PropertyImportPayload, c: PdlPersonContact): PropertyImportPayload {
  const next = { ...p };
  if (c.phones.length) {
    const joined = c.phones.join(" | ");
    next.contactPersonPhone = mergePhone(next.contactPersonPhone, joined, "PDL Person");
  }
  for (const e of c.emails) next.ownerEmail = mergeEmail(next.ownerEmail, e, "PDL Person");
  if (c.fullName?.trim()) next.contactPersonName = c.fullName.trim();
  const noteBits: string[] = [];
  if (c.phones.length) noteBits.push(`phone(s) ${c.phones.join(" | ")}`);
  for (const e of c.emails) noteBits.push(`email ${e}`);
  if (c.fullName) noteBits.push(`name "${c.fullName}"`);
  const L = c.likelihood != null ? ` (likelihood ${c.likelihood})` : "";
  next.notes = mergeNotes(next.notes, `PDL person enrich: ${noteBits.join("; ")}${L}.`);
  return next;
}

export async function enrichPropertyRecordWithPdl(
  p: PropertyImportPayload,
  apiKey: string,
  opts: PdlEnrichOptions = {},
): Promise<PropertyImportPayload> {
  if (shouldSkipRow(p, opts)) return p;
  const minL = Math.max(1, Math.min(10, opts.minLikelihood ?? 6));

  if (shouldTryCompany(p, opts)) {
    const label = primaryOwnerLabel(p);
    const r = await fetchCompanyContactFromPdl(label, p, apiKey, minL);
    if (!r.ok) {
      if (opts.skipIfPhonePresent === false) {
        return { ...p, notes: mergeNotes(p.notes, `PDL company enrich: ${r.message}`) };
      }
      return p;
    }
    return applyPdlCompanyToPayload(p, label, r.contact);
  }

  if (shouldTryPerson(p, opts)) {
    const r = await fetchPersonContactFromPdl(p, apiKey, minL);
    if (!r.ok) {
      if (opts.skipIfPhonePresent === false) {
        return { ...p, notes: mergeNotes(p.notes, `PDL person enrich: ${r.message}`) };
      }
      return p;
    }
    return applyPdlPersonToPayload(p, r.contact);
  }

  return p;
}

export type PdlBatchEnrichResult = {
  results: PropertyImportPayload[];
  filled: number;
  skipped: number;
  failed: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function enrichPropertyRecordsWithPdl(
  rows: PropertyImportPayload[],
  apiKey: string,
  options: PdlEnrichOptions & { limit?: number; delayMs?: number } = {},
): Promise<PdlBatchEnrichResult> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 15));
  const delayMs = Math.max(150, options.delayMs ?? 350);
  const out = [...rows];
  let filled = 0;
  let skipped = 0;
  let failed = 0;
  let attempts = 0;

  for (let i = 0; i < out.length && attempts < limit; i++) {
    const row = out[i]!;
    if (shouldSkipRow(row, options)) {
      skipped++;
      continue;
    }

    const tryCompany = shouldTryCompany(row, options);
    const tryPerson = shouldTryPerson(row, options);
    if (!tryCompany && !tryPerson) {
      skipped++;
      continue;
    }

    attempts++;
    const minL = Math.max(1, Math.min(10, options.minLikelihood ?? 6));
    let next: PropertyImportPayload = row;

    if (tryCompany) {
      const label = primaryOwnerLabel(row);
      const r = await fetchCompanyContactFromPdl(label, row, apiKey, minL);
      await sleep(delayMs);
      if (r.ok) {
        next = applyPdlCompanyToPayload(row, label, r.contact);
        filled++;
      } else {
        failed++;
      }
    } else {
      const r = await fetchPersonContactFromPdl(row, apiKey, minL);
      await sleep(delayMs);
      if (r.ok) {
        next = applyPdlPersonToPayload(row, r.contact);
        filled++;
      } else {
        failed++;
      }
    }

    out[i] = next;
  }

  return { results: out, filled, skipped, failed };
}
