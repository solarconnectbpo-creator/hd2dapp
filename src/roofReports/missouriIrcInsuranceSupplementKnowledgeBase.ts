/**
 * Missouri — IRC topics for insurance supplements (roofing trades only).
 * Summaries are original (not copied from ICC publications). Verify adopted code
 * for the property AHJ before citing in supplements.
 */

export const MO_IRC_INSURANCE_KB_TITLE =
  "Missouri — IRC roofing supplement reference (steep & low-slope)";

export const MO_IRC_INSURANCE_KB_DISCLAIMER =
  "Roofing trade reference only. Cite the legally adopted code and edition for the property’s AHJ—not this summary. Not legal advice; confirm with code officials or licensed professionals.";

export const MO_IRC_INSURANCE_TYPICAL_EDITION_NOTE =
  "Many Missouri jurisdictions use 2021 IRC–family residential provisions; local amendments vary. Modular/HUD rules are separate from on-site IRC citations.";

/** Roofing-only scope for supplements. */
export const MO_IRC_INSURANCE_ABOUT =
  "These entries are limited to the roof system: environmental loads on the roof, roof deck and weather barrier, flashings on the roof plane and at roof-to-wall intersections, structural roof framing and uplift, roof coverings and reroofing, ventilation of spaces below the roof deck, attic access for roof work, and modules mounted on the roof.";

export const MO_IRC_INSURANCE_SECTION_GROUPS: readonly {
  id: string;
  heading: string;
  items: readonly { ref: string; summary: string }[];
}[] = [
  {
    id: "r301-roof",
    heading: "R301 — Loads & wind (as applied to the roof)",
    items: [
      {
        ref: "R301.2 / R301.2.1",
        summary:
          "Ground snow, wind design speed, exposure, and roof height drive assumptions for roof component-and-cladding pressures and snow loads on the roof structure.",
      },
      {
        ref: "R301.6",
        summary:
          "Roof assemblies must support required dead, live, snow, and wind loads—supports arguing deck replacement or full slope work when the existing roof system cannot meet current loads.",
      },
    ],
  },
  {
    id: "r903-roof",
    heading: "R903 — Roof deck, flashings & drainage (weather at the roof)",
    items: [
      {
        ref: "R903.1",
        summary:
          "Approved roof coverings secured per code and manufacturer instructions; the assembly must protect the building from weather.",
      },
      {
        ref: "R903.2–R903.2.2",
        summary:
          "Flashings at walls, slope changes, valleys, eave-to-sidewall, and penetrations; crickets/saddles at wide penetrations; metal thickness minimums where sheet metal is used.",
      },
      {
        ref: "R903.4",
        summary:
          "Low-slope roofs drain to edges or drains; secondary overflow where the perimeter can trap water—supplements often cite drains, scuppers, and overflow when correcting ponding.",
      },
    ],
  },
  {
    id: "r703-roof",
    heading: "R703 — Flashing only where it meets the roof plane",
    items: [
      {
        ref: "R703.4",
        summary:
          "Wall flashing shall shed water at the roof-to-wall interface (step/kick-out/diverter concepts)—use for leak supplements at sidewalls and dormers, not general wall cladding.",
      },
      {
        ref: "R703.8",
        summary:
          "Where veneer meets the roof, flashing and drainage at the roofline tie to roof-covering work—document deteriorated counterflashing integrated with shingle/metal termination.",
      },
    ],
  },
  {
    id: "r8-roof",
    heading: "Chapter R8 — Roof framing, trusses & uplift",
    items: [
      {
        ref: "R802.2 / R802.3–R802.5",
        summary:
          "Ridge, rafters, ceiling joists, and ties that support the roof slopes; bearing and connections at the eaves—scope when reframing or replacing damaged roof structure.",
      },
      {
        ref: "R802.10",
        summary:
          "Prefabricated roof trusses: design drawings, bracing, and no field cuts without engineer approval—common after wind or structural damage.",
      },
      {
        ref: "R802.11",
        summary:
          "Roof-to-wall uplift connectors and tabulated connection forces—justifies hurricane clips, nail schedules, and deck fastening upgrades in wind supplements.",
      },
    ],
  },
  {
    id: "r9-roof",
    heading: "Chapter R9 — Roof coverings, underlayment & reroofing",
    items: [
      {
        ref: "R901–R902",
        summary:
          "Roof assembly scope; fire classification of roof coverings (Class A/B/C) where the code or lot-line rules require listed assemblies.",
      },
      {
        ref: "R904–R905",
        summary:
          "Compatible materials, labeled products, underlayment type and attachment for wind region and slope, ice barrier in designated climates, minimum slopes by covering type, and wind-resistance labeling for shingles and similar products.",
      },
      {
        ref: "R905 (system types)",
        summary:
          "Steep-slope: asphalt, tile, metal shingles, slate, wood, PV shingles, etc. Low-slope: built-up, modified bitumen, single-ply, SPF, coatings—each R905 section governs that roof covering’s installation.",
      },
      {
        ref: "R906–R907",
        summary:
          "Above-deck insulation under the roof covering; rooftop PV rack systems coordinated with roof coverings and Chapter R324 / NFPA 70.",
      },
      {
        ref: "R908",
        summary:
          "Reroofing: tear-off to deck vs recover, layer limits, wet/deteriorated deck, and prohibited recover cases—central to replacement vs overlay supplements.",
      },
    ],
  },
  {
    id: "r806-roof",
    heading: "R806 — Ventilation of attic & enclosed rafter spaces",
    items: [
      {
        ref: "R806.1–R806.2",
        summary:
          "Net free vent area and high/low balance for vented attics and rafter spaces below the roof—ridge vent, soffit, and baffle line items in re-roof supplements.",
      },
      {
        ref: "R806.5",
        summary:
          "Unvented roof assemblies: prescriptive insulation and vapor control at the roof line—relevant when converting to conditioned attic or spray foam at the roof deck.",
      },
    ],
  },
  {
    id: "r807-roof",
    heading: "R807 — Attic access (roof cavity work)",
    items: [
      {
        ref: "R807.1",
        summary:
          "Minimum attic access where ceiling/roof spaces exceed size/height thresholds—sometimes cited when scoping hatch repair or access for decking/inspection above a finished ceiling.",
      },
    ],
  },
  {
    id: "r324-roof",
    heading: "R324 — PV modules on the roof",
    items: [
      {
        ref: "R324 + R905 / R907",
        summary:
          "Rooftop arrays: fire classification, setbacks, attachment to deck or framing, coordination with roof coverings (R905/R907) and electrical code—not ground-mount or non-roof scopes.",
      },
    ],
  },
];

export function moIrcInsuranceKbFlatBulletLines(): string[] {
  const out: string[] = [];
  for (const g of MO_IRC_INSURANCE_SECTION_GROUPS) {
    for (const it of g.items) {
      out.push(`${it.ref}: ${it.summary}`);
    }
  }
  return out;
}
