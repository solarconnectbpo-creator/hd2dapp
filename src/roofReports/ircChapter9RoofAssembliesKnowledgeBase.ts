/**
 * IRC Chapter 9 — roof assemblies (residential): condensed reference for reports.
 * Summaries are original (not copied from ICC publications). Missouri often adopts the
 * International Residential Code® with state amendments; modular programs may add factory
 * QA — verify the legally adopted edition and amendments for the AHJ.
 */

export const IRC_CHAPTER_9_KB_TITLE =
  "IRC Chapter 9 — Roof assemblies (residential reference)";

export const IRC_CHAPTER_9_KB_DISCLAIMER =
  "Field reference only. The adopted residential code in your jurisdiction—including Missouri amendments and local ordinances—controls. Not a substitute for the IRC® or professional code research.";

/** Missouri Residential Code is commonly tied to the 2021 IRC cycle; modular rules vary. */
export const IRC_CHAPTER_9_TYPICAL_EDITION_NOTE =
  "Often reviewed alongside IRC Chapter 9 (R901–R908) under 2021 IRC–family adoptions; verify current Missouri code books and modular program bulletins.";

/** High-level chapter scope (paraphrased topic overview). */
export const IRC_CHAPTER_9_ABOUT =
  "Roof assembly topics include deck, underlayment, insulation, vapor control, and coverings; wind resistance of coverings; material-specific installation for steep- and low-slope systems; flashing and drainage; rooftop photovoltaics; and recover/replacement rules.";

export const IRC_CHAPTER_9_SECTION_GROUPS: readonly {
  id: string;
  heading: string;
  items: readonly { ref: string; summary: string }[];
}[] = [
  {
    id: "r901",
    heading: "R901 General",
    items: [
      {
        ref: "R901.1",
        summary:
          "Governs design, materials, construction, and quality of complete roof assemblies.",
      },
    ],
  },
  {
    id: "r902",
    heading: "R902 Fire classification",
    items: [
      {
        ref: "R902.1",
        summary:
          "Roof coverings must meet Chapter 9; Class A/B/C rules apply where required by law or near lot lines—testing references ASTM E108 / UL 790 for listed assemblies.",
      },
      {
        ref: "R902.2",
        summary:
          "Fire-retardant-treated wood shakes/shingles use approved pressure treatment, marking, and classification labeling.",
      },
      {
        ref: "R902.3–R902.4",
        summary:
          "Building-integrated PV as the roof covering and rack-mounted PV above the covering must be listed for fire performance (e.g., UL 7103 / UL 2703) with Class A/B/C rules where triggered.",
      },
    ],
  },
  {
    id: "r903",
    heading: "R903 Weather protection",
    items: [
      {
        ref: "R903.1",
        summary:
          "Approved coverings secure to the building per code and manufacturer instructions so the assembly protects the structure.",
      },
      {
        ref: "R903.2",
        summary:
          "Flashings shed water at walls, penetrations, slope changes, and parapets; minimum metal thickness applies where sheet metal is used.",
      },
      {
        ref: "R903.2.2",
        summary:
          "Crickets or saddles are required at larger penetrations (e.g., wide chimneys) unless an exception such as certain skylights applies.",
      },
      {
        ref: "R903.3–R903.4",
        summary:
          "Parapets get coped; flat roofs drain to edges or drains, with secondary overflow where water could be trapped inside a raised perimeter—coordinate with plumbing chapter as cited.",
      },
    ],
  },
  {
    id: "r904",
    heading: "R904 Materials",
    items: [
      {
        ref: "R904.1–R904.2",
        summary:
          "Install listed materials per Chapter 9 and instructions; components must be compatible with each other and the building.",
      },
      {
        ref: "R904.3–R904.4",
        summary:
          "Products meet referenced standards; packaging and bulk shipments carry identification and required labels.",
      },
    ],
  },
  {
    id: "r905a",
    heading: "R905.1 Common installation rules",
    items: [
      {
        ref: "R905.1",
        summary:
          "Coverings resist wind loads from Chapter R301 tables as applicable; underlayment type, layers, and fastening depend on covering and wind design region.",
      },
      {
        ref: "R905.1.2",
        summary:
          "Ice barriers are required in designated ice-dam climates for many steep-slope products—typically from eaves past the wall line with membrane or two-ply options.",
      },
      {
        ref: "R905.1 (wind)",
        summary:
          "Steep-slope products (e.g., asphalt shingles, metal shingles, PV shingles) use tested classifications matched to project wind speed; labels on packaging document compliance.",
      },
    ],
  },
  {
    id: "r905b",
    heading: "R905.2–R905.8 Steep-slope coverings",
    items: [
      {
        ref: "R905.2",
        summary:
          "Asphalt shingles: solid sheathing, minimum slope, listed product, corrosion-resistant nails, attachment pattern, drip edge, valleys, and sidewall flashing per section and manufacturer.",
      },
      {
        ref: "R905.3–R905.6",
        summary:
          "Tile, metal shingles, roll roofing, slate: deck/slope/underlayment rules, material standards, fastening, and valley/flashings per each section.",
      },
      {
        ref: "R905.7–R905.8",
        summary:
          "Wood shingles and shakes: graded material, exposure limits, fasteners, interlayment for shakes, and metal valley widths per section.",
      },
    ],
  },
  {
    id: "r905c",
    heading: "R905.9–R905.15 Low-slope and specialty membranes",
    items: [
      {
        ref: "R905.9–R905.11",
        summary:
          "Built-up and modified bitumen: minimum drainage slope, listed materials, application per instructions.",
      },
      {
        ref: "R905.10",
        summary:
          "Metal panels: slope rules vary by seam type; materials and corrosion protection per tables; attach per manufacturer.",
      },
      {
        ref: "R905.12–R905.15",
        summary:
          "Single-ply, SPF, and liquid-applied roofs: minimum slope, listed membranes/foams/coatings, SPF protected by approved coating within a time window, foam plastics per R316.",
      },
    ],
  },
  {
    id: "r905d",
    heading: "R905.16–R905.17 Photovoltaic roof products",
    items: [
      {
        ref: "R905.16",
        summary:
          "PV shingles: deck, slope, underlayment, listing, attachment, and wind classification per tables; coordinate with R324 and NFPA 70.",
      },
      {
        ref: "R905.17",
        summary:
          "BIPV panels applied to deck: similar deck/slope/listing/attachment expectations; ice barrier rules where triggered.",
      },
    ],
  },
  {
    id: "r906",
    heading: "R906 Roof insulation",
    items: [
      {
        ref: "R906.1–R906.2",
        summary:
          "Above-deck insulation is covered by approved roof covering and complies with referenced fire/thermal tests; board types reference material standards in the code.",
      },
    ],
  },
  {
    id: "r907",
    heading: "R907 Rooftop-mounted PV",
    items: [
      {
        ref: "R907.1",
        summary:
          "Rack-mounted PV systems follow R324 and NFPA 70 for design and installation.",
      },
    ],
  },
  {
    id: "r908",
    heading: "R908 Reroofing",
    items: [
      {
        ref: "R908.1",
        summary:
          "Recover and replacement comply with Chapter 9; exceptions exist for positive drainage and some overflow items on existing roofs.",
      },
      {
        ref: "R908.2–R908.3",
        summary:
          "Structure supports new system and construction loads; full replacement usually means tear-off to deck with exceptions for adhered ice barrier and listed cases.",
      },
      {
        ref: "R908.3.1",
        summary:
          "Recover is allowed when the base is sound and manufacturer allows; prohibited over soaked decks, certain tile types, or after too many layers—follow exceptions for metal, coatings, and similar.",
      },
      {
        ref: "R908.4–R908.6",
        summary:
          "Combustible concealed spaces may need covering over old wood roofs; reusable tile/slate rules; flashings rebuilt per manufacturer; prime metal where bitumen adheres.",
      },
    ],
  },
];

export function ircChapter9KbFlatBulletLines(): string[] {
  const out: string[] = [];
  for (const g of IRC_CHAPTER_9_SECTION_GROUPS) {
    for (const it of g.items) {
      out.push(`${it.ref}: ${it.summary}`);
    }
  }
  return out;
}
