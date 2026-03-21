/**
 * Commercial / nonresidential roof replacement — high-level tax & incentive topics for reports.
 * Not tax, legal, or accounting advice. Programs, rates, and eligibility change — property owners
 * must verify with a CPA, enrolled agent, or tax attorney and current IRS / Missouri guidance.
 */

import type { DamageRoofReport } from "./roofReportTypes";

export const COMMERCIAL_ROOF_TAX_KB_TITLE =
  "Commercial property — roof replacement: tax & incentive notes (U.S. / Missouri)";

export const COMMERCIAL_ROOF_TAX_KB_DISCLAIMER =
  "Educational summary only—not tax advice. Eligibility, dollar limits, and timing depend on entity type, placed-in-service dates, and current law. Confirm with a qualified tax professional before relying on any item.";

export const COMMERCIAL_ROOF_TAX_KB_EDITION_NOTE =
  "Federal energy and depreciation rules have changed in recent legislation (e.g. IRA-era provisions). Missouri income tax conformity to federal deductions and any state-specific credits vary by year—verify with Missouri DOR and IRS publications.";

const COMMERCIAL_ROOF_SYSTEM_CATEGORIES = new Set([
  "tpo",
  "epdm",
  "pvc",
  "modified-bitumen",
  "built-up",
  "coating",
  "flat-generic",
]);

/** Heuristic: show commercial-roof tax notes when the report looks like nonresidential / low-slope / commercial context. */
export function commercialRoofTaxNotesApplyToReport(
  r: Pick<
    DamageRoofReport,
    | "roofType"
    | "roofSystemCategory"
    | "lowSlopeMaterialEstimate"
    | "roofFormType"
    | "propertyUse"
  >,
): boolean {
  if (r.propertyUse === "commercial") return true;
  if (r.lowSlopeMaterialEstimate) return true;
  const cat = (r.roofSystemCategory ?? "").toLowerCase();
  if (COMMERCIAL_ROOF_SYSTEM_CATEGORIES.has(cat)) return true;
  const rt = (r.roofType ?? "").toLowerCase();
  if (
    /\b(commercial|warehouse|retail|office|industrial|shopping|plaza|strip|mall|church|school|tpo|epdm|pvc|modified|bur\b|membrane|flat roof|low[- ]slope)\b/i.test(
      rt,
    )
  ) {
    return true;
  }
  const form = (r.roofFormType ?? "").toLowerCase();
  if (form.includes("flat") || form.includes("low slope")) return true;
  return false;
}

export const COMMERCIAL_ROOF_TAX_SECTION_GROUPS: readonly {
  id: string;
  heading: string;
  items: readonly { ref: string; summary: string }[];
}[] = [
  {
    id: "capitalize",
    heading: "Capitalize vs. expense (general)",
    items: [
      {
        ref: "Improvements",
        summary:
          "Full roof replacement on a commercial building is typically capitalized and recovered over time through depreciation or amortization—not fully deducted as a routine repair in the year paid (facts vary; IRS guidance distinguishes “betterment” and restorations).",
      },
      {
        ref: "Records",
        summary:
          "Retain contracts, invoices, manufacturer specs, and placed-in-service documentation for asset basis and any energy-credit claims.",
      },
    ],
  },
  {
    id: "macrs",
    heading: "MACRS depreciation (federal)",
    items: [
      {
        ref: "39-year property",
        summary:
          "Nonresidential building structure (including structural roof) is generally depreciated over 39 years for property placed in service under current MACRS rules; roof replacement cost is usually added to basis and depreciated—subject to component / cost-segregation studies arranged by a professional.",
      },
      {
        ref: "Bonus / Sec. 179",
        summary:
          "Bonus depreciation and Section 179 have narrow applicability to certain qualified property; building structures and many roof improvements are excluded or limited—verify current IRC sections and revenue procedures with your tax preparer.",
      },
    ],
  },
  {
    id: "179d",
    heading: "Energy-efficient commercial buildings (§179D–federal)",
    items: [
      {
        ref: "Envelope / efficiency",
        summary:
          "A federal deduction may be available for qualifying energy-efficient commercial building property when installed in a tax year, including certain envelope improvements tied to modeled energy savings against ASHRAE baselines—subject to certification, allocation, and entity eligibility (e.g., government building allocation rules).",
      },
      {
        ref: "Roofing tie-in",
        summary:
          "Cool roofs, added insulation above deck, or assembly upgrades that meet program thresholds may contribute to an envelope deduction path—engineering modeling and IRS forms are typically required; not automatic for every reroof.",
      },
    ],
  },
  {
    id: "solar",
    heading: "Solar on the commercial roof",
    items: [
      {
        ref: "Investment tax credit",
        summary:
          "Federal investment tax credit (ITC) may apply to qualifying solar energy property installed on a commercial building; basis, timing, and depreciation interaction are complex—use a solar tax specialist.",
      },
      {
        ref: "Depreciation",
        summary:
          "Eligible solar equipment may qualify for depreciation (e.g., MACRS) in addition to or alongside credits—rules depend on ownership structure and placed-in-service date.",
      },
    ],
  },
  {
    id: "mo",
    heading: "Missouri state considerations",
    items: [
      {
        ref: "Conformity",
        summary:
          "Missouri corporate and individual income tax treatment of federal deductions and credits may follow federal rules with modifications—check current Missouri Department of Revenue publications for conformity and any state energy or property incentives.",
      },
      {
        ref: "Local",
        summary:
          "Some utilities or local programs offer rebates or incentives for reflective or efficient roofing—separate from income tax; document separately from federal items.",
      },
    ],
  },
  {
    id: "reporting",
    heading: "Using this block in insurance / scope reports",
    items: [
      {
        ref: "Narrative",
        summary:
          "This section is informational for the property owner’s tax advisor; it does not replace insurer-paid scope. Use language such as “Owner may wish to discuss tax treatment with a CPA” in cover letters when appropriate.",
      },
    ],
  },
];

export function commercialRoofTaxKbFlatBulletLines(): string[] {
  const out: string[] = [];
  for (const g of COMMERCIAL_ROOF_TAX_SECTION_GROUPS) {
    for (const it of g.items) {
      out.push(`${it.ref}: ${it.summary}`);
    }
  }
  return out;
}
