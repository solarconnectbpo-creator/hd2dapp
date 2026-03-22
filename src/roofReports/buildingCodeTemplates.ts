import type {
  BuildingCodeInfo,
  DamageType,
  RecommendedAction,
} from "./roofReportTypes";

const IRC_ROOF_CHECKS: { id: string; label: string; details: string }[] = [
  {
    id: "irc_r901_1",
    label: "IRC R901.1 - Scope",
    details:
      "Roof assemblies must comply with IRC roof-covering provisions and local amendments.",
  },
  {
    id: "irc_r901_2",
    label: "IRC R901.2 - Design / materials",
    details:
      "Materials and installation must meet manufacturer listing and code-required design criteria.",
  },
  {
    id: "irc_r901_3",
    label: "IRC R901.3 - Weather protection",
    details:
      "Roof deck and underlayment must provide a weather-resistant barrier before final covering.",
  },
  {
    id: "irc_r901_4",
    label: "IRC R901.4 - Roof drainage",
    details:
      "Positive drainage and discharge control are required; identify ponding or blocked paths.",
  },
  {
    id: "irc_r901_5",
    label: "IRC R901.5 - Existing structures",
    details:
      "Recover/replacement scope must respect re-roof limits, deck condition, and code triggers.",
  },
  {
    id: "irc_r902_1",
    label: "IRC R902.1 - Fire classification",
    details:
      "Verify required roof-covering fire classification for jurisdiction and occupancy context.",
  },
  {
    id: "irc_r903_1",
    label: "IRC R903.1 - Flashing required",
    details:
      "Flashing required at walls, penetrations, valleys, skylights, chimneys, and transitions.",
  },
  {
    id: "irc_r903_2",
    label: "IRC R903.2 - Flashing details",
    details:
      "Confirm counter/cap/step flashing and corrosion-resistant fastening where applicable.",
  },
  {
    id: "irc_r903_2_1",
    label: "IRC R903.2.1 - Locations",
    details:
      "Document and repair failed flashing at high-risk leak points and roof-to-wall interfaces.",
  },
  {
    id: "irc_r903_4",
    label: "IRC R903.4 - Roof drainage outlets",
    details:
      "Low-slope systems must maintain drains/scuppers/gutters and emergency overflow routing.",
  },
  {
    id: "irc_r904_1",
    label: "IRC R904.1 - Roof covering applications",
    details:
      "Installed covering type must follow applicable section and manufacturer instructions.",
  },
  {
    id: "irc_r905_1",
    label: "IRC R905.1 - Underlayment",
    details:
      "Verify underlayment type/laps/attachment for slope and climate exposure requirements.",
  },
  {
    id: "irc_r905_2",
    label: "IRC R905.2 - Asphalt shingles",
    details:
      "Confirm starter, nailing pattern, slope limits, valley treatment, and edge detailing.",
  },
  {
    id: "irc_r905_10",
    label: "IRC R905.10 - Metal roof panels",
    details:
      "Check seam/fastener pattern, underlayment, and terminations for metal panel systems.",
  },
  {
    id: "irc_r905_11",
    label: "IRC R905.11 - Built-up roofs",
    details:
      "Verify ply/membrane assembly, surfacing, and flashing continuity on BUR systems.",
  },
  {
    id: "irc_r905_12",
    label: "IRC R905.12 - Thermoset single-ply",
    details:
      "EPDM/thermoset membrane seams, attachment method, and perimeter securement checks.",
  },
  {
    id: "irc_r905_13",
    label: "IRC R905.13 - Thermoplastic single-ply",
    details:
      "TPO/PVC seam quality, attachment pattern, and perimeter fastening verification.",
  },
  {
    id: "irc_r905_14",
    label: "IRC R905.14 - SPF roofs",
    details:
      "Foam/coating thickness and UV-protection continuity per system listing.",
  },
  {
    id: "irc_r906_1",
    label: "IRC R906.1 - Re-roofing general",
    details:
      "Determine tear-off vs recover eligibility, structural/deck integrity, and moisture concerns.",
  },
  {
    id: "irc_r906_2",
    label: "IRC R906.2 - Recover limitations",
    details:
      "No recover over water-soaked/deteriorated deck or where prohibited by code/product listing.",
  },
  {
    id: "irc_r906_3",
    label: "IRC R906.3 - Recover prohibited cases",
    details:
      "Certain systems/slopes/conditions require full removal and code-compliant replacement.",
  },
  {
    id: "irc_r907_1",
    label: "IRC R907.1 - Roof replacement",
    details:
      "Replacement must include required flashings, underlayment, and deck repairs as needed.",
  },
  {
    id: "irc_r908_1",
    label: "IRC R908.1 - Reroof permit / admin",
    details:
      "Project documentation should align with local permit and inspection requirements.",
  },
  {
    id: "irc_r806_1",
    label: "IRC R806 - Roof ventilation",
    details:
      "Verify attic/roof ventilation intake-exhaust balance where required by assembly type.",
  },
];

export type BuildingCodeLocationInput = {
  stateCode?: string;
  stateName?: string;
  county?: string;
  city?: string;
  countryCode?: string;
};

function makeCodeInfo(opts: {
  jurisdiction?: string;
  codeReference?: string;
  stateCode?: string;
}): BuildingCodeInfo {
  return {
    jurisdiction: opts.jurisdiction,
    codeReference: opts.codeReference,
    stateCode: opts.stateCode,
    checks: [],
  };
}

function formatCountyLabel(county?: string): string | undefined {
  const c = county?.trim();
  if (!c) return undefined;
  if (/county$/i.test(c)) return c;
  return `${c} County`;
}

function jurisdictionLabel(p: BuildingCodeLocationInput): string | undefined {
  const cc = (p.countryCode ?? "").toLowerCase();
  if (cc && cc !== "us") {
    const parts = [
      p.city,
      formatCountyLabel(p.county),
      p.stateName,
      p.countryCode,
    ]
      .filter(Boolean)
      .map(String);
    return parts.length ? parts.join(", ") : undefined;
  }

  const city = p.city?.trim();
  const county = formatCountyLabel(p.county);
  const sc = (p.stateCode ?? "").toUpperCase();
  const sn = p.stateName?.trim();
  const parts: string[] = [];
  if (city) parts.push(city);
  if (county) parts.push(county);
  if (sn && sc) parts.push(`${sn} (${sc})`);
  else if (sc) parts.push(sc);
  else if (sn) parts.push(sn);
  return parts.length ? parts.join(", ") : undefined;
}

function adoptedCodeReferenceForLocation(p: BuildingCodeLocationInput): string {
  const cc = (p.countryCode ?? "").toLowerCase();
  if (cc && cc !== "us") {
    return "Verify locally adopted building code; IRC-based checklist items below are illustrative only.";
  }

  const sc = (p.stateCode ?? "").toUpperCase();
  if (sc === "MO") {
    return "Missouri — IRC-family residential code with local amendments; verify wind loads, roof-wall transitions, re-roof triggers, ventilation, and rooftop attachments with the AHJ.";
  }
  if (sc === "MN") {
    return "Minnesota — IRC family with state amendments; verify wind, snow, and energy requirements for roof coverings.";
  }
  if (sc === "WI") {
    return "Wisconsin — IRC family with state amendments (UDC); verify roof-covering and flashing requirements locally.";
  }
  if (sc === "FL") {
    return "Florida — HVHZ / wind-driven rain provisions often apply; verify FBC and local amendments beyond generic IRC items.";
  }
  if (sc === "TX") {
    return "Texas — verify adopted IRC edition and wind/hail regional amendments; local jurisdictions vary.";
  }
  if (sc && sc.length === 2) {
    return `${sc} — verify adopted IRC edition and state/local amendments (wind, hail, snow, seismic, energy, fire) for roof assemblies.`;
  }
  return "United States — verify adopted IRC edition and local amendments for roof coverings and re-roofs.";
}

function normalizeLocationInput(
  stateOrLocation?: string | BuildingCodeLocationInput,
): BuildingCodeLocationInput {
  if (stateOrLocation && typeof stateOrLocation === "object") {
    return {
      ...stateOrLocation,
      stateCode: stateOrLocation.stateCode?.trim().toUpperCase(),
    };
  }
  const legacy = String(stateOrLocation ?? "").trim();
  if (!legacy) return {};
  const up = legacy.toUpperCase();
  if (up.length === 2 && /^[A-Z]{2}$/.test(up)) {
    return { stateCode: up };
  }
  return { stateName: legacy };
}

/**
 * Resolves jurisdiction label + adopted-code narrative from property location.
 * IRC checklist rows are **not** copied wholesale — use `filterIrcChecksForRoofType` for property- and system-specific items.
 */
export function getBuildingCodeInfoForLocation(
  stateOrLocation?: string | BuildingCodeLocationInput,
): BuildingCodeInfo {
  const p = normalizeLocationInput(stateOrLocation);
  const j = jurisdictionLabel(p);
  const ref = adoptedCodeReferenceForLocation(p);
  const sc = p.stateCode?.length === 2 ? p.stateCode : undefined;

  return makeCodeInfo({
    jurisdiction: j ?? (sc ? `Jurisdiction: ${sc}` : undefined),
    codeReference: ref,
    stateCode: sc,
  });
}

function uniqueStrings(xs: string[]) {
  return Array.from(new Set(xs));
}

export type RoofIrcContext = {
  ircEdition?: "2018" | "2021" | "2024" | string;
  occupancy?: "res_sf" | "res_multi" | "condo" | "otherOcc" | string;
  roofMaterialType?: string; // shingle | tile | slate | tpo (from your material selector)
  roofFormType?: string; // Flat / Low Slope | Hip Roof | Gable Roof | ...
  roofPitchRise?: number; // numeric rise from roofPitch input (optional)
  roofStories?: number; // optional roofStories from CompanyCam
  roofSystemCategory?: string; // output of classifyRoofSystem (asphalt-shingle, tpo, tile, etc.)
  lowSlopeRiseCutoff?: number; // numeric rise threshold; default 2.0 (<= 2:12)
  damageTypes: DamageType[]; // your selected damage types
  recommendedAction: RecommendedAction; // Repair / Replace / ...
  /** US state code when known — narrows narrative (e.g. Missouri supplement context). */
  stateCode?: string;
};

/**
 * Filters the IRC checklist to only include roof-type / building-context-relevant code items.
 * Best-effort mapping, since we don't have full jurisdiction + detailed system specs.
 */
export function filterIrcChecksForRoofType(
  buildingCode: BuildingCodeInfo | undefined,
  ctx: RoofIrcContext,
) {
  if (!buildingCode) return undefined;
  const material = (ctx.roofMaterialType ?? "").toLowerCase();
  const roofForm = (ctx.roofFormType ?? "").toLowerCase();

  const lowSlopeRiseCutoff = Number.isFinite(ctx.lowSlopeRiseCutoff)
    ? (ctx.lowSlopeRiseCutoff as number)
    : 2;
  const isLowSlope =
    roofForm.includes("flat") ||
    roofForm.includes("low slope") ||
    (typeof ctx.roofPitchRise === "number" &&
      ctx.roofPitchRise <= lowSlopeRiseCutoff);

  const include = (ids: string[]) => ids;

  const base: string[] = [
    "irc_r901_1",
    "irc_r901_2",
    "irc_r901_3",
    "irc_r901_4",
    "irc_r901_5",
    "irc_r902_1",
    "irc_r904_1",
  ];

  // Flashing/risk items: focus when the user selects flashing/leak-related damage.
  const wantsFlashing =
    ctx.damageTypes.some((d) => String(d).toLowerCase() === "flashing") ||
    ctx.damageTypes.some((d) => String(d).toLowerCase() === "leaks");
  const flashing: string[] = wantsFlashing
    ? ["irc_r903_1", "irc_r903_2", "irc_r903_2_1"]
    : ["irc_r903_1"];

  // Underlayment (always relevant, but emphasize more for low-slope).
  const underlayment: string[] = ["irc_r905_1"];

  const cat = (ctx.roofSystemCategory ?? "").toLowerCase();
  let systemSpecific: string[] = [];
  if (cat === "asphalt-shingle" || material === "shingle") {
    systemSpecific = ["irc_r905_2"];
  } else if (cat === "metal" || material === "metal") {
    systemSpecific = ["irc_r905_10"];
  } else if (cat === "tpo" || cat === "pvc" || material === "tpo") {
    systemSpecific = ["irc_r905_13"];
  } else if (cat === "epdm") {
    systemSpecific = ["irc_r905_12"];
  } else if (cat === "modified-bitumen" || cat === "built-up") {
    systemSpecific = ["irc_r905_11"];
  } else if (cat === "coating") {
    systemSpecific = ["irc_r905_14"];
  } else if (cat === "tile" || cat === "slate") {
    systemSpecific = [];
  } else {
    switch (material) {
      case "shingle":
        systemSpecific = ["irc_r905_2"];
        break;
      case "tpo":
        systemSpecific = ["irc_r905_13"];
        break;
      case "metal":
        systemSpecific = ["irc_r905_10"];
        break;
      default:
        systemSpecific = [];
    }
  }

  // Drainage outlets emphasis for low-slope.
  const drainage: string[] = isLowSlope ? ["irc_r903_4"] : [];

  // Re-roof / replace administration items.
  const replacement: string[] =
    ctx.recommendedAction === "Replace"
      ? include([
          "irc_r906_1",
          "irc_r906_2",
          "irc_r906_3",
          "irc_r907_1",
          "irc_r908_1",
        ])
      : [];

  // Ventilation: best-effort building context by stories and slope.
  const occupancy = String(ctx.occupancy ?? "").toLowerCase();
  const isOtherOcc =
    occupancy.includes("other") ||
    occupancy.includes("mixed") ||
    occupancy.includes("commercial") ||
    occupancy.includes("non-res");
  const ventilation: string[] =
    !isLowSlope &&
    (isOtherOcc ||
      (typeof ctx.roofStories === "number" && ctx.roofStories >= 2))
      ? ["irc_r806_1"]
      : [];

  const selectedIds = uniqueStrings([
    ...base,
    ...flashing,
    ...underlayment,
    ...systemSpecific,
    ...drainage,
    ...replacement,
    ...ventilation,
  ]);

  const checkMap = new Map<string, BuildingCodeInfo["checks"][0]>();
  for (const c of IRC_ROOF_CHECKS) {
    checkMap.set(c.id, { id: c.id, label: c.label, details: c.details });
  }
  for (const c of buildingCode.checks ?? []) {
    checkMap.set(c.id, c);
  }
  const filteredChecks = selectedIds
    .map((id) => checkMap.get(id))
    .filter(Boolean) as BuildingCodeInfo["checks"];

  // Fallback: if we couldn't match ids (e.g., PDF-provided checklist ids differ), keep the original set.
  if (!filteredChecks.length) return buildingCode;

  const next: BuildingCodeInfo = {
    ...buildingCode,
    codeReference:
      buildingCode.codeReference ||
      "IRC Roofing Compliance Matrix (R901-R908, R806; local amendments may apply)",
    checks: filteredChecks,
  };

  const edition = ctx.ircEdition ? String(ctx.ircEdition) : "";
  if (
    edition &&
    next.codeReference &&
    !next.codeReference.toLowerCase().includes("edition")
  ) {
    next.codeReference = `${next.codeReference} (based on IRC ${edition}; local amendments may apply)`;
  }

  return next;
}
