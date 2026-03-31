/**
 * Ranks assessor / import rows for commercial roofing outreach (heuristics only — verify contacts).
 */

import {
  isLikelyPropertyManagerOrCommercialOwner,
  type PropertyImportPayload,
} from "./propertyScraper";

function hasDigitPhone(s: string): boolean {
  return /\d{3}/.test(s.replace(/\D/g, ""));
}

/** Normalize for duplicate parcel detection */
export function addressDedupeKey(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

/** Primary owner label before "|" for portfolio counting */
export function primaryOwnerKey(ownerName: string): string {
  const first = ownerName.split("|")[0]?.trim() ?? "";
  return first
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]+/g, "")
    .trim()
    .slice(0, 96);
}

function uniquePipeMerge(a: string, b: string): string {
  const parts = [...a.split("|"), ...b.split("|")]
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(parts)].join(" | ");
}

function pickRicherString(a: string, b: string): string {
  const ta = a.trim();
  const tb = b.trim();
  if (tb.length > ta.length) return b;
  return a;
}

function pickLargerNumericString(a: string, b: string): string {
  const na = Number.parseFloat(String(a).replace(/,/g, ""));
  const nb = Number.parseFloat(String(b).replace(/,/g, ""));
  if (Number.isFinite(nb) && (!Number.isFinite(na) || nb > na)) return b;
  if (Number.isFinite(na)) return a;
  return pickRicherString(a, b);
}

export function mergePropertyImportDuplicates(
  a: PropertyImportPayload,
  b: PropertyImportPayload,
): PropertyImportPayload {
  return {
    ...a,
    address: pickRicherString(a.address, b.address),
    stateCode: a.stateCode.trim() ? a.stateCode : b.stateCode,
    latitude: a.latitude.trim() ? a.latitude : b.latitude,
    longitude: a.longitude.trim() ? a.longitude : b.longitude,
    areaSqFt: pickLargerNumericString(a.areaSqFt, b.areaSqFt),
    yearBuilt: pickRicherString(a.yearBuilt, b.yearBuilt),
    lotSizeSqFt: pickLargerNumericString(a.lotSizeSqFt, b.lotSizeSqFt),
    propertyType: a.propertyType !== "other" ? a.propertyType : b.propertyType,
    ownerName: pickRicherString(a.ownerName, b.ownerName),
    ownerPhone: uniquePipeMerge(a.ownerPhone, b.ownerPhone),
    ownerEmail: uniquePipeMerge(a.ownerEmail, b.ownerEmail),
    contactPersonName: pickRicherString(a.contactPersonName ?? "", b.contactPersonName ?? ""),
    contactPersonPhone: uniquePipeMerge(a.contactPersonPhone ?? "", b.contactPersonPhone ?? ""),
    ownerEntityType: pickRicherString(a.ownerEntityType, b.ownerEntityType),
    ownerMailingAddress: pickRicherString(a.ownerMailingAddress, b.ownerMailingAddress),
    ownerPmEntityLabel: pickRicherString(a.ownerPmEntityLabel ?? "", b.ownerPmEntityLabel ?? "").trim() || undefined,
    notes: [a.notes, b.notes].filter(Boolean).join("\n"),
    source: a.source,
  };
}

export function dedupePropertyImportsByAddress(rows: PropertyImportPayload[]): PropertyImportPayload[] {
  const map = new Map<string, PropertyImportPayload>();
  for (const row of rows) {
    const key = addressDedupeKey(row.address);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) map.set(key, { ...row });
    else map.set(key, mergePropertyImportDuplicates(existing, row));
  }
  return [...map.values()];
}

export type CommercialLeadScoreResult = {
  score: number;
  reasons: string[];
};

/**
 * Score a single row for commercial roofing lead quality (0–100).
 * `ownerPortfolioCount` = number of parcels in the batch with the same primary owner key.
 */
export function scoreCommercialRoofingLead(
  p: PropertyImportPayload,
  ctx: { ownerPortfolioCount: number },
): CommercialLeadScoreResult {
  let score = 0;
  const reasons: string[] = [];

  if (p.propertyType === "commercial") {
    score += 28;
    reasons.push("Commercial property type");
  } else if (p.propertyType === "multi-family") {
    score += 22;
    reasons.push("Multi-family property type");
  }

  if (p.ownerEntityType.trim().toLowerCase() === "organization") {
    score += 22;
    reasons.push("Organization owner on assessor record");
  }

  if (isLikelyPropertyManagerOrCommercialOwner(p.ownerName, p.ownerEntityType)) {
    score += 12;
    reasons.push("Owner name suggests LLC / management / holding company");
  }

  if (p.ownerPmEntityLabel?.trim()) {
    score += 6;
    reasons.push("PM / organization label on record");
  }

  const sqft = Number.parseFloat(String(p.areaSqFt).replace(/,/g, ""));
  if (Number.isFinite(sqft) && sqft > 0) {
    if (sqft >= 25_000) {
      score += 14;
      reasons.push("Large building area (25k+ sq ft)");
    } else if (sqft >= 10_000) {
      score += 10;
      reasons.push("10k+ sq ft building");
    } else if (sqft >= 5000) {
      score += 6;
      reasons.push("5k+ sq ft building");
    } else if (sqft >= 2500) {
      score += 3;
      reasons.push("2.5k+ sq ft");
    }
  }

  if (hasDigitPhone(p.ownerPhone)) {
    score += 8;
    reasons.push("Phone number on record");
  }
  if (hasDigitPhone(p.contactPersonPhone ?? "")) {
    score += 6;
    reasons.push("Direct / contact-person phone");
  }
  if (p.ownerEmail.includes("@")) {
    score += 4;
    reasons.push("Email on record");
  }

  const mail = p.ownerMailingAddress.trim().toLowerCase();
  const prop = p.address.trim().toLowerCase().slice(0, 28);
  if (mail.length > 12 && prop && !mail.includes(prop)) {
    score += 5;
    reasons.push("Owner mailing address differs from property (possible corporate office)");
  }

  const n = ctx.ownerPortfolioCount;
  if (n >= 10) {
    score += 12;
    reasons.push("10+ parcels for same owner in this batch (portfolio)");
  } else if (n >= 4) {
    score += 8;
    reasons.push("4+ parcels for same owner in this batch");
  } else if (n >= 2) {
    score += 4;
    reasons.push("Multiple parcels for same owner in this batch");
  }

  score = Math.min(100, score);
  return { score, reasons };
}

export type RankCommercialLeadsOptions = {
  /** Merge rows with the same normalized address (default true). */
  dedupeAddresses?: boolean;
};

/**
 * Dedupe (optional), compute portfolio counts, score, sort by score descending.
 */
export function rankCommercialPropertyLeads(
  rows: PropertyImportPayload[],
  options: RankCommercialLeadsOptions = {},
): PropertyImportPayload[] {
  const dedupe = options.dedupeAddresses !== false;
  const working = dedupe ? dedupePropertyImportsByAddress(rows) : rows.map((r) => ({ ...r }));

  const ownerCounts = new Map<string, number>();
  for (const p of working) {
    const k = primaryOwnerKey(p.ownerName);
    if (!k) continue;
    ownerCounts.set(k, (ownerCounts.get(k) ?? 0) + 1);
  }

  const scored = working.map((p) => {
    const k = primaryOwnerKey(p.ownerName);
    const ownerPortfolioCount = k ? (ownerCounts.get(k) ?? 1) : 1;
    const { score, reasons } = scoreCommercialRoofingLead(p, { ownerPortfolioCount });
    const next: PropertyImportPayload = {
      ...p,
      leadScore: score,
      leadScoreReasons: reasons,
      ownerPortfolioCount,
    };
    return next;
  });

  scored.sort((a, b) => {
    const ds = (b.leadScore ?? 0) - (a.leadScore ?? 0);
    if (ds !== 0) return ds;
    return a.address.localeCompare(b.address);
  });

  return scored;
}
