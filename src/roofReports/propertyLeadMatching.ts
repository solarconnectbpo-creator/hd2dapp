import type { PropertySelection } from "./roofReportTypes";
import { classifyRoofSystem } from "./roofSystemScope";

function normAddr(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Best-effort match between a map-selected property and saved CSV/DB leads.
 * Uses address similarity + distance so email / roof type can autofill after a map click.
 */
export function findBestMatchingLead(property: PropertySelection, leads: PropertySelection[]): PropertySelection | null {
  if (!leads.length) return null;

  const target = normAddr(property.address || "");
  let best: { lead: PropertySelection; score: number } | null = null;

  for (const l of leads) {
    let score = 0;
    const la = normAddr(l.address || "");

    if (la && target) {
      if (la === target) score += 120;
      else if (la.includes(target) || target.includes(la)) score += 70;
      else {
        const tTokens = new Set(target.split(/[^a-z0-9]+/).filter((x) => x.length > 2));
        const lTokens = la.split(/[^a-z0-9]+/).filter((x) => x.length > 2);
        let overlap = 0;
        for (const t of lTokens) {
          if (tTokens.has(t)) overlap++;
        }
        if (overlap >= 3) score += overlap * 12;
      }
    }

    const dLat = Math.abs(l.lat - property.lat);
    const dLng = Math.abs(l.lng - property.lng);
    const dist2 = dLat * dLat + dLng * dLng;
    if (dist2 < 1e-12) score += 100;
    else if (dist2 < 0.00015 * 0.00015) score += 75;
    else if (dist2 < 0.0004 * 0.0004) score += 45;
    else if (dist2 < 0.002 * 0.002) score += 20;

    if (l.email?.trim()) score += 8;
    if (l.phone?.trim()) score += 4;
    if (l.homeownerName?.trim()) score += 4;
    if (l.roofType?.trim()) score += 6;
    if (typeof l.roofSqFt === "number" && l.roofSqFt > 0) score += 4;

    if (!best || score > best.score) best = { lead: l, score };
  }

  if (!best || best.score < 35) return null;
  return best.lead;
}

/**
 * When CSV/lead has no roof_type, suggest a common default from address heuristics (US-focused).
 */
export function inferRoofTypeIfMissing(property: PropertySelection): string {
  if (property.roofType?.trim()) return classifyRoofSystem(property.roofType).normalizedRoofType;

  const a = (property.address || "").toLowerCase();
  if (
    /\b(warehouse|industrial|commercial|plaza|strip mall|shopping|office building|retail|storage)\b/.test(a)
  ) {
    return "TPO Single-Ply";
  }
  // Typical residential — works well with your shingle estimate branch.
  return "Asphalt Shingle";
}
