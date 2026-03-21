/**
 * IBC Chapter 15 — roof assemblies & rooftop structures: condensed reference for reports.
 * Summaries are original (not copied from ICC publications). Always verify the adopted
 * edition and local amendments for the authority having jurisdiction (AHJ).
 */

export const IBC_CHAPTER_15_KB_TITLE =
  "IBC Chapter 15 — Roof assemblies (code reference)";

export const IBC_CHAPTER_15_KB_DISCLAIMER =
  "Field reference only. The legally adopted code in your jurisdiction—including amendments—controls. Not a substitute for the International Building Code® or professional code research.";

/** Typical edition alignment for commercial construction; AHJ may adopt a different cycle. */
export const IBC_CHAPTER_15_TYPICAL_EDITION_NOTE =
  "Often reviewed alongside IBC §§1501–1512 (edition varies by adoption).";

export const IBC_CHAPTER_15_SECTION_GROUPS: ReadonlyArray<{
  id: string;
  heading: string;
  items: ReadonlyArray<{ ref: string; summary: string }>;
}> = [
  {
    id: "1501",
    heading: "§1501 General",
    items: [
      {
        ref: "1501.1",
        summary:
          "Sets minimum expectations for roof assembly design, materials, construction quality, and the weather barrier; also applies to rooftop structures addressed later in the chapter.",
      },
    ],
  },
  {
    id: "1502",
    heading: "§1502 Roof drainage",
    items: [
      {
        ref: "1502.1",
        summary:
          "Roof drainage design and installation must coordinate with structural rain load provisions and the plumbing code where cited.",
      },
      {
        ref: "1502.2",
        summary:
          "Where primary drains can be blocked, secondary (emergency overflow) paths are required so ponding cannot exceed the assembly’s design intent.",
      },
      {
        ref: "1502.3–1502.4",
        summary:
          "Scupper sizing/openings and exterior gutters/leaders have minimum material and geometry rules on many commercial occupancies and construction types.",
      },
    ],
  },
  {
    id: "1503",
    heading: "§1503 Weather protection",
    items: [
      {
        ref: "1503.1",
        summary:
          "Approved roof coverings must be secured per code and manufacturer instructions.",
      },
      {
        ref: "1503.2",
        summary:
          "Flashing must keep water out at joints, copings, penetrations, and parapet intersections.",
      },
      {
        ref: "1503.3",
        summary:
          "Parapets must be capped/coped and drained; rated parapets have additional weatherproofing constraints.",
      },
      {
        ref: "1503.4–1503.5",
        summary:
          "Attic/rafter ventilation must coordinate with Chapter 12; crickets/saddles are required at larger penetrations unless specific exceptions apply.",
      },
    ],
  },
  {
    id: "1504",
    heading: "§1504 Performance requirements",
    items: [
      {
        ref: "1504.1",
        summary:
          "Roof decks and coverings must resist wind per Chapter 16 and the referenced roof sections.",
      },
      {
        ref: "1504.2–1504.5",
        summary:
          "Steep-slope shingles, tile, adhered/mechanically attached membranes, ballasted single-ply, and edge metal each tie to prescribed tests and wind design.",
      },
      {
        ref: "1504.6–1504.9",
        summary:
          "Low-slope edges, gutters securing membranes, physical properties, impact resistance, and aggregate surfacing may trigger additional tests or parapet rules.",
      },
    ],
  },
  {
    id: "1505",
    heading: "§1505 Fire classification",
    items: [
      {
        ref: "1505.1",
        summary:
          "Class A/B/C assemblies are established via referenced fire tests; minimum class depends on construction type and Table 1505.1.",
      },
      {
        ref: "1505.2–1505.10",
        summary:
          "Covers class definitions, specialty wood, BIPV/BAPV, landscaped roofs, and PV rack listings as applicable to the roof covering.",
      },
    ],
  },
  {
    id: "1506-1507",
    heading: "§1506–§1507 Materials & roof coverings",
    items: [
      {
        ref: "1506",
        summary:
          "Materials must meet listed standards; packaging and bulk deliveries require identification and labeling traceability.",
      },
      {
        ref: "1507.1",
        summary:
          "Coverings are installed per code and manufacturer instructions; underlayment tables address wind speed, slope, and attachment.",
      },
      {
        ref: "1507.2–1507.17",
        summary:
          "System-specific rules for asphalt, tile, metal, slate, wood, BUR/mod bit, single-ply, SPF, liquid-applied, vegetated roofs, PV shingles/panels, etc.",
      },
    ],
  },
  {
    id: "1508-1510",
    heading: "§1508–§1510 Insulation, coatings, radiant barriers",
    items: [
      {
        ref: "1508",
        summary:
          "Above-deck insulation boards must meet listed material standards and fire/overlay requirements where foam plastics are involved.",
      },
      {
        ref: "1509",
        summary:
          "Roof coatings must comply with listed material standards and fire classification of the assembly.",
      },
      {
        ref: "1510",
        summary:
          "Radiant barriers above the deck require listed assemblies and correct orientation to the air space.",
      },
    ],
  },
  {
    id: "1511",
    heading: "§1511 Rooftop structures",
    items: [
      {
        ref: "1511.1",
        summary:
          "Penthouses and similar enclosures have area limits relative to the supporting roof; larger volumes may count as a story under Chapter 5.",
      },
      {
        ref: "1511.2–1511.8",
        summary:
          "Height, use, weather protection, construction type, tanks, cooling towers, screens, and structural fire resistance are regulated for rooftop appurtenances.",
      },
    ],
  },
  {
    id: "1512",
    heading: "§1512 Reroofing",
    items: [
      {
        ref: "1512.1",
        summary:
          "Replacement/recover work must meet Chapter 15; some slope and overflow exceptions exist where positive drainage is maintained.",
      },
      {
        ref: "1512.2",
        summary:
          "Replacement typically requires removal to the deck; specific recover paths exist for listed systems and coatings.",
      },
      {
        ref: "1512.2.1",
        summary:
          "Recover is prohibited over saturated/deteriorated bases, certain existing coverings, or after too many prior layers—confirm on site.",
      },
    ],
  },
];

export function ibcChapter15KbFlatBulletLines(): string[] {
  const out: string[] = [];
  for (const g of IBC_CHAPTER_15_SECTION_GROUPS) {
    for (const it of g.items) {
      out.push(`${it.ref}: ${it.summary}`);
    }
  }
  return out;
}
