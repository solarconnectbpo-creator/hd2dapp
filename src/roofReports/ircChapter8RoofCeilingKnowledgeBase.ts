/**
 * IRC Chapter 8 — roof-ceiling construction (residential): condensed reference for reports.
 * Summaries are original (not copied from ICC publications). Missouri often adopts the
 * International Residential Code® with state amendments; modular programs may add factory QA
 * requirements — always verify the legally adopted edition and amendments for the AHJ.
 */

export const IRC_CHAPTER_8_KB_TITLE =
  "IRC Chapter 8 — Roof-ceiling construction (residential reference)";

export const IRC_CHAPTER_8_KB_DISCLAIMER =
  "Field reference only. The adopted residential code in your jurisdiction—including Missouri amendments and local ordinances—controls. Not a substitute for the IRC® or professional code research.";

/** Missouri Residential Code is commonly tied to the 2021 IRC cycle; edition and modular rules vary. */
export const IRC_CHAPTER_8_TYPICAL_EDITION_NOTE =
  "Often reviewed alongside IRC Chapter 8 (R801–R807) under 2021 IRC–family adoptions; verify current Missouri code books and modular program bulletins.";

/** High-level chapter scope (paraphrased topic overview). */
export const IRC_CHAPTER_8_ABOUT =
  "This chapter covers roof-ceiling systems: conventional wood framing and cold-formed steel framing, span tables for rafters and ceiling joists, ceiling finishes, ventilation of concealed roof spaces, unvented attic options, and attic access.";

export const IRC_CHAPTER_8_SECTION_GROUPS: ReadonlyArray<{
  id: string;
  heading: string;
  items: ReadonlyArray<{ ref: string; summary: string }>;
}> = [
  {
    id: "r801",
    heading: "R801 General",
    items: [
      {
        ref: "R801.1",
        summary:
          "Governs design and construction of the roof-ceiling system for dwellings under the IRC.",
      },
      {
        ref: "R801.2",
        summary:
          "Roof and ceiling construction must support loads per Chapter R301 and transfer reactions to supporting elements.",
      },
      {
        ref: "R801.3",
        summary:
          "Where expansive or collapsible soils are present, roof drainage must be controlled and discharged so water is kept away from foundations per code (distance or approved drainage).",
      },
    ],
  },
  {
    id: "r802",
    heading: "R802 Wood roof framing",
    items: [
      {
        ref: "R802.1",
        summary:
          "Structural wood and wood-based products must meet grading, identification, and referenced standards (sawn lumber, engineered products, FRTW where used, CLT, I-joists, rim board, etc.).",
      },
      {
        ref: "R802.2",
        summary:
          "The roof-ceiling assembly must provide continuous ties to resist thrust; design may follow chapter figures or engineered methods (e.g., NDS).",
      },
      {
        ref: "R802.3",
        summary:
          "Ridge boards must be sized relative to rafters; where ties are incomplete, ridge support by wall, beam, or column is required.",
      },
      {
        ref: "R802.4",
        summary:
          "Rafters are sized from code span tables for species, grade, spacing, snow/live load, and deflection; horizontal projection defines span. Adjust spans when ties sit higher in the attic.",
      },
      {
        ref: "R802.4.2–R802.4.6",
        summary:
          "Framing at hips/valleys, low-slope support, purlins, and collar ties/ridge straps follow prescribed geometry and nailing.",
      },
      {
        ref: "R802.5",
        summary:
          "Ceiling joists are continuous or spliced per code; sized from tables; connections to rafters and heel joints coordinate nail schedules with snow, span, and tie height.",
      },
      {
        ref: "R802.6–R802.7",
        summary:
          "Minimum bearing on supports; limits on cutting/notching; engineered members follow manufacturer or RDP direction.",
      },
      {
        ref: "R802.8–R802.9",
        summary:
          "Lateral support and bridging for slender members; openings framed with headers/trimmers per span rules.",
      },
      {
        ref: "R802.10",
        summary:
          "Wood trusses require approved design drawings, bracing per documents or industry guides, and no field alterations without engineer approval.",
      },
      {
        ref: "R802.11",
        summary:
          "Roof assemblies need uplift resistance; tabulated connection forces vary with wind, exposure, pitch, and span—engineered alternatives permitted.",
      },
    ],
  },
  {
    id: "r803",
    heading: "R803 Roof sheathing",
    items: [
      {
        ref: "R803.1–R803.2",
        summary:
          "Lumber or wood structural panel sheathing spans and grades are limited by tables and APA guidance; panels are identified, installed, and fastened per schedules; cantilever limits apply at gable ends.",
      },
    ],
  },
  {
    id: "r804",
    heading: "R804 Cold-formed steel roof framing",
    items: [
      {
        ref: "R804.1–R804.2",
        summary:
          "Steel members, coatings, and identification comply with AISI references; applicability limits cover building size, slope, wind, and snow.",
      },
      {
        ref: "R804.3",
        summary:
          "Ceiling joists and rafters use tabulated sizes/spans, screw schedules at heels and ridge, bracing of flanges, diaphragms at gable ends, and tie-down to walls for a continuous load path.",
      },
    ],
  },
  {
    id: "r805",
    heading: "R805 Ceiling finishes",
    items: [
      {
        ref: "R805.1",
        summary:
          "Ceiling finishes follow interior wall finish requirements elsewhere in the IRC (attachment, materials, clearances).",
      },
    ],
  },
  {
    id: "r806",
    heading: "R806 Roof ventilation",
    items: [
      {
        ref: "R806.1–R806.2",
        summary:
          "Vented attics and rafter spaces need protected intake/exhaust openings; minimum net free area is typically a fraction of vented space, with exceptions when balanced high/low vent and vapor retarders are used in cold climates.",
      },
      {
        ref: "R806.3–R806.4",
        summary:
          "Maintain airflow at eaves; install vents per manufacturer and roof/wall chapters.",
      },
      {
        ref: "R806.5",
        summary:
          "Unvented attic or sealed rafter assemblies are allowed when insulation, vapor control, air barriers, and (in some zones) supplementary air supply or diffusion details meet the prescriptive package.",
      },
    ],
  },
  {
    id: "r807",
    heading: "R807 Attic access",
    items: [
      {
        ref: "R807.1",
        summary:
          "Combustible construction with attic spaces of minimum height and area needs a listed rough opening and location with ready access; stricter rules may apply for equipment in attics.",
      },
    ],
  },
];

export function ircChapter8KbFlatBulletLines(): string[] {
  const out: string[] = [];
  for (const g of IRC_CHAPTER_8_SECTION_GROUPS) {
    for (const it of g.items) {
      out.push(`${it.ref}: ${it.summary}`);
    }
  }
  return out;
}
