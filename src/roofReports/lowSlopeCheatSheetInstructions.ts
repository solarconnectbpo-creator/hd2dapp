/**
 * AI cheat sheet — Instructions & Notes (workbook Tab 6).
 * Source of truth: `data/lowSlopePricing/instructions-and-notes.csv`
 */

export const COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_KB_TITLE =
  "Commercial flat roof — template instructions (knowledge base)";

/** Full plain text for exports, prompts, and search. */
export const COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_TEXT = `HOW TO USE – COMMERCIAL FLAT ROOFING SYSTEMS TEMPLATES
WORKBOOK CONTENTS
Tab 1 – TPO:            Thermoplastic Polyolefin – 45, 60, 80, 90 mil  |  Mechanically Attached, Fully Adhered, Induction Welded, Ballasted
Tab 2 – Modified Bitumen: APP Torch-Down, SBS Cold-Applied, SBS Heat-Welded  |  2-ply and 3-ply systems
Tab 3 – EPDM:           Rubber membrane – 45, 60, 90 mil  |  Fully Adhered, Mechanically Attached, Ballasted
Tab 4 – PVC:            Polyvinyl Chloride – 40, 50, 60, 80 mil  |  Mechanically Attached, Fully Adhered, Heat-Welded
Tab 5 – Roof Coatings:  Silicone, Acrylic, SPF Polyurethane, Butyl, Aluminum Fibrated – all fully suited (prep → primer → base → fabric → top coat)
Tab 6 – Instructions:   This page

HOW TO USE
1.  Select the correct tab for your roofing system
2.  Fill in Project Information at the top (insured, claim #, etc.)
3.  Enter QTY in the YELLOW column B for every applicable line item
4.  Leave QTY = 0 for items that don't apply — they won't affect the total
5.  Only select ONE membrane line item per mil/attachment combination — they are alternatives, not cumulative
6.  For multi-layer tear-off, use the 'Remove extra layer' line item once per additional layer
7.  Apply steep slope AND height surcharges on top of base membrane SQ — they are separate line items
8.  Adjust unit prices if your local market, vendor bids, or Xactimate price list differs
9.  Enter Material Sales Tax in the grand total block (or zero if tax-exempt)
10. RCV and Net Claim auto-calculate from all line totals

EXTRA LAYER REMOVAL – IMPORTANT
• Always start with the base removal line (one full layer at the system rate)
• Add 'Remove extra/additional layer – per layer charge' ($38.50/SQ) for each layer beyond the first
• Example: 3-layer Built-Up Roof = 1x BUR base rate ($75.00) + 2x extra layer ($38.50 each) = $152.00/SQ total
• Some jurisdictions require full tear-off when total roof assembly exceeds 2 layers — always check local code

STEEP SLOPE SURCHARGES
• 4:12 to 6:12 pitch:  +$18.50/SQ on top of flat membrane install rate
• 7:12 to 9:12 pitch:  +$32.00/SQ
• 10:12 and above:     +$55.00/SQ
• Apply surcharge to BOTH remove and replace SQ where applicable

HEIGHT SURCHARGES
• 2 stories / 16-20 ft:  +$8.10/SQ (remove) + $8.10/SQ (replace)
• 3 stories / 21-30 ft:  +$15.50/SQ each way
• 4+ stories / 31+ ft:   +$24.00/SQ each way
• Enter height surcharge QTY equal to total roof SQ for that elevation

MIL THICKNESS GUIDE
• 40-45 mil:  Entry-level / budget applications; shorter warranty (10-15 yr)
• 50-60 mil:  Industry standard for commercial; most manufacturer warranties (15-20 yr)
• 80 mil:     Heavy-duty / high-traffic zones; enhanced puncture resistance
• 90 mil:     Maximum thickness; extreme environments / long-term performance (25+ yr)

ATTACHMENT METHOD GUIDE
• Mechanically Attached (MA):    Fasteners & plates at seams; fastest install; lowest cost; best for re-roof over existing
• Fully Adhered (FA):            Bonded to substrate; best wind uplift; required for high-wind zones; more labor
• Induction Welded (RhinoBond):  Fasteners hidden under membrane; no seam plates; clean appearance (TPO only)
• Ballasted:                     Stone holds membrane; no fasteners; easiest to repair; requires structural capacity
• Heat-Welded Seams (PVC):       Hot-air welded watertight seams; no tape; strongest joint

COATINGS SYSTEM GUIDE
• Silicone:     Best for ponding water; UV stable; longest lifespan; higher cost; difficult to recoat
• Acrylic:      Lowest cost; water-based; NOT for ponding water; breathes well in hot climates
• SPF/Polyurethane: Self-insulating (R-6/inch); seamless; requires top coat for UV protection
• Butyl:        Excellent for metal roofs; high elongation; good chemical resistance
• Aluminum Fibrated: Reflective; economical; classic; limited to 5-10 mil dry film; not waterproof alone

PENDING ITEMS (marked ★ in estimates)
• Permit Fees: Placeholder only – verify with local jurisdiction
• Engineering Fees: Bid item – obtain actual structural/engineering quote
• Copper Fabrication: Obtain actual vendor bid for custom copper work

PRICE LIST NOTE
• All prices are based on MOSL8X_OCT25 (St. Louis, MO – October 2025) Xactimate price list
• Adjust prices for your specific market and current material costs
• O&P calculated at 21% of labor + material (10% overhead + 11% profit) – industry standard`;

/** Structured sections for UI lists. */
export const COMMERCIAL_FLAT_ROOF_INSTRUCTIONS_SECTIONS: ReadonlyArray<{
  heading: string;
  lines: readonly string[];
}> = [
  {
    heading: "Workbook contents",
    lines: [
      "Tab 1 – TPO: Thermoplastic Polyolefin – 45, 60, 80, 90 mil | Mechanically Attached, Fully Adhered, Induction Welded, Ballasted",
      "Tab 2 – Modified Bitumen: APP Torch-Down, SBS Cold-Applied, SBS Heat-Welded | 2-ply and 3-ply systems",
      "Tab 3 – EPDM: Rubber membrane – 45, 60, 90 mil | Fully Adhered, Mechanically Attached, Ballasted",
      "Tab 4 – PVC: Polyvinyl Chloride – 40, 50, 60, 80 mil | Mechanically Attached, Fully Adhered, Heat-Welded",
      "Tab 5 – Roof Coatings: Silicone, Acrylic, SPF Polyurethane, Butyl, Aluminum Fibrated – prep → primer → base → fabric → top coat",
      "Tab 6 – Instructions: this reference",
    ],
  },
  {
    heading: "How to use",
    lines: [
      "Select the correct tab for your roofing system.",
      "Fill in Project Information at the top (insured, claim #, etc.).",
      "Enter QTY in the YELLOW column B for every applicable line item.",
      "Leave QTY = 0 for items that don't apply — they won't affect the total.",
      "Only select ONE membrane line item per mil/attachment combination — alternatives, not cumulative.",
      "For multi-layer tear-off, use the 'Remove extra layer' line item once per additional layer.",
      "Apply steep slope AND height surcharges on top of base membrane SQ — separate line items.",
      "Adjust unit prices if your local market, vendor bids, or Xactimate price list differs.",
      "Enter Material Sales Tax in the grand total block (or zero if tax-exempt).",
      "RCV and Net Claim auto-calculate from all line totals.",
    ],
  },
  {
    heading: "Extra layer removal",
    lines: [
      "Always start with the base removal line (one full layer at the system rate).",
      "Add 'Remove extra/additional layer – per layer charge' ($38.50/SQ) for each layer beyond the first.",
      "Example: 3-layer BUR = 1× BUR base ($75.00) + 2× extra layer ($38.50 each) = $152.00/SQ total.",
      "Some jurisdictions require full tear-off when total assembly exceeds 2 layers — check local code.",
    ],
  },
  {
    heading: "Steep slope surcharges",
    lines: [
      "4:12 to 6:12: +$18.50/SQ on top of flat membrane install rate.",
      "7:12 to 9:12: +$32.00/SQ.",
      "10:12 and above: +$55.00/SQ.",
      "Apply to BOTH remove and replace SQ where applicable.",
    ],
  },
  {
    heading: "Height surcharges",
    lines: [
      "2 stories / 16–20 ft: +$8.10/SQ remove + $8.10/SQ replace.",
      "3 stories / 21–30 ft: +$15.50/SQ each way.",
      "4+ stories / 31+ ft: +$24.00/SQ each way.",
      "Enter height surcharge QTY equal to total roof SQ for that elevation.",
    ],
  },
  {
    heading: "Mil thickness guide",
    lines: [
      "40–45 mil: entry-level / budget; shorter warranty (10–15 yr).",
      "50–60 mil: industry standard commercial; most warranties (15–20 yr).",
      "80 mil: heavy-duty / high-traffic; enhanced puncture resistance.",
      "90 mil: maximum thickness; extreme environments / long-term (25+ yr).",
    ],
  },
  {
    heading: "Attachment methods",
    lines: [
      "Mechanically Attached (MA): fasteners & plates at seams; fastest; lowest cost; good for re-roof over existing.",
      "Fully Adhered (FA): bonded; best wind uplift; high-wind zones; more labor.",
      "Induction Welded (RhinoBond): hidden fasteners; no seam plates; TPO only.",
      "Ballasted: stone holds membrane; no fasteners; needs structural capacity.",
      "Heat-Welded Seams (PVC): hot-air welded; strongest joint.",
    ],
  },
  {
    heading: "Coatings systems",
    lines: [
      "Silicone: ponding water; UV stable; long life; higher cost; hard to recoat.",
      "Acrylic: lowest cost; NOT for ponding; good in hot climates.",
      "SPF/Polyurethane: R-6/inch; needs UV top coat.",
      "Butyl: metal roofs; elongation; chemical resistance.",
      "Aluminum fibrated: economical; 5–10 mil dry film; not waterproof alone.",
    ],
  },
  {
    heading: "Pending items (★ in estimates)",
    lines: [
      "Permit fees: placeholder — verify with jurisdiction.",
      "Engineering fees: bid item — get structural/engineering quote.",
      "Copper fabrication: vendor bid for custom work.",
    ],
  },
  {
    heading: "Price list note",
    lines: [
      "Based on MOSL8X_OCT25 (St. Louis, MO – Oct 2025) Xactimate price list.",
      "Adjust for your market and current material costs.",
      "O&P at 21% of labor + material (10% overhead + 11% profit) — industry standard.",
    ],
  },
];
