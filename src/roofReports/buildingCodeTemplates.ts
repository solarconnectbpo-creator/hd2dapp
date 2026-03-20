import type { BuildingCodeInfo, DamageType, RecommendedAction } from "./roofReportTypes";

const IRC_ROOF_CHECKS: Array<{ id: string; label: string; details: string }> = [
  { id: "irc_r901_1", label: "IRC R901.1 - Scope", details: "Roof assemblies must comply with IRC roof-covering provisions and local amendments." },
  { id: "irc_r901_2", label: "IRC R901.2 - Design / materials", details: "Materials and installation must meet manufacturer listing and code-required design criteria." },
  { id: "irc_r901_3", label: "IRC R901.3 - Weather protection", details: "Roof deck and underlayment must provide a weather-resistant barrier before final covering." },
  { id: "irc_r901_4", label: "IRC R901.4 - Roof drainage", details: "Positive drainage and discharge control are required; identify ponding or blocked paths." },
  { id: "irc_r901_5", label: "IRC R901.5 - Existing structures", details: "Recover/replacement scope must respect re-roof limits, deck condition, and code triggers." },
  { id: "irc_r902_1", label: "IRC R902.1 - Fire classification", details: "Verify required roof-covering fire classification for jurisdiction and occupancy context." },
  { id: "irc_r903_1", label: "IRC R903.1 - Flashing required", details: "Flashing required at walls, penetrations, valleys, skylights, chimneys, and transitions." },
  { id: "irc_r903_2", label: "IRC R903.2 - Flashing details", details: "Confirm counter/cap/step flashing and corrosion-resistant fastening where applicable." },
  { id: "irc_r903_2_1", label: "IRC R903.2.1 - Locations", details: "Document and repair failed flashing at high-risk leak points and roof-to-wall interfaces." },
  { id: "irc_r903_4", label: "IRC R903.4 - Roof drainage outlets", details: "Low-slope systems must maintain drains/scuppers/gutters and emergency overflow routing." },
  { id: "irc_r904_1", label: "IRC R904.1 - Roof covering applications", details: "Installed covering type must follow applicable section and manufacturer instructions." },
  { id: "irc_r905_1", label: "IRC R905.1 - Underlayment", details: "Verify underlayment type/laps/attachment for slope and climate exposure requirements." },
  { id: "irc_r905_2", label: "IRC R905.2 - Asphalt shingles", details: "Confirm starter, nailing pattern, slope limits, valley treatment, and edge detailing." },
  { id: "irc_r905_10", label: "IRC R905.10 - Metal roof panels", details: "Check seam/fastener pattern, underlayment, and terminations for metal panel systems." },
  { id: "irc_r905_11", label: "IRC R905.11 - Built-up roofs", details: "Verify ply/membrane assembly, surfacing, and flashing continuity on BUR systems." },
  { id: "irc_r905_12", label: "IRC R905.12 - Thermoset single-ply", details: "EPDM/thermoset membrane seams, attachment method, and perimeter securement checks." },
  { id: "irc_r905_13", label: "IRC R905.13 - Thermoplastic single-ply", details: "TPO/PVC seam quality, attachment pattern, and perimeter fastening verification." },
  { id: "irc_r905_14", label: "IRC R905.14 - SPF roofs", details: "Foam/coating thickness and UV-protection continuity per system listing." },
  { id: "irc_r906_1", label: "IRC R906.1 - Re-roofing general", details: "Determine tear-off vs recover eligibility, structural/deck integrity, and moisture concerns." },
  { id: "irc_r906_2", label: "IRC R906.2 - Recover limitations", details: "No recover over water-soaked/deteriorated deck or where prohibited by code/product listing." },
  { id: "irc_r906_3", label: "IRC R906.3 - Recover prohibited cases", details: "Certain systems/slopes/conditions require full removal and code-compliant replacement." },
  { id: "irc_r907_1", label: "IRC R907.1 - Roof replacement", details: "Replacement must include required flashings, underlayment, and deck repairs as needed." },
  { id: "irc_r908_1", label: "IRC R908.1 - Reroof permit / admin", details: "Project documentation should align with local permit and inspection requirements." },
  { id: "irc_r806_1", label: "IRC R806 - Roof ventilation", details: "Verify attic/roof ventilation intake-exhaust balance where required by assembly type." },
];

function makeCodeInfo(opts: { jurisdiction?: string; codeReference?: string }): BuildingCodeInfo {
  const base: BuildingCodeInfo = {
    jurisdiction: opts.jurisdiction,
    codeReference: opts.codeReference,
    checks: IRC_ROOF_CHECKS.map((c) => ({ id: c.id, label: c.label, details: c.details })),
  };
  return base;
}

/**
 * Demo mapping:
 * - For real production, you would replace this with a proper jurisdiction/building-code lookup service.
 */
export function getBuildingCodeInfoForLocation(stateCodeOrName?: string): BuildingCodeInfo {
  const code = (stateCodeOrName ?? "").toUpperCase();
  const ref = "IRC Roofing Compliance Matrix (R901-R908, R806; local amendments may apply)";

  if (code === "MN" || code.includes("MINNESOTA")) {
    return makeCodeInfo({
      jurisdiction: "Minnesota (MN)",
      codeReference: ref,
    });
  }

  if (code === "WI" || code.includes("WISCONSIN")) {
    return makeCodeInfo({
      jurisdiction: "Wisconsin (WI)",
      codeReference: ref,
    });
  }

  return makeCodeInfo({
    jurisdiction: stateCodeOrName ? `Jurisdiction: ${stateCodeOrName}` : undefined,
    codeReference: ref,
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
};

/**
 * Filters the IRC checklist to only include roof-type / building-context-relevant code items.
 * Best-effort mapping, since we don't have full jurisdiction + detailed system specs.
 */
export function filterIrcChecksForRoofType(buildingCode: BuildingCodeInfo | undefined, ctx: RoofIrcContext) {
  if (!buildingCode) return undefined;
  const material = (ctx.roofMaterialType ?? "").toLowerCase();
  const roofForm = (ctx.roofFormType ?? "").toLowerCase();

  const lowSlopeRiseCutoff = Number.isFinite(ctx.lowSlopeRiseCutoff) ? (ctx.lowSlopeRiseCutoff as number) : 2;
  const isLowSlope =
    roofForm.includes("flat") || roofForm.includes("low slope") || (typeof ctx.roofPitchRise === "number" && ctx.roofPitchRise <= lowSlopeRiseCutoff);

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
  const wantsFlashing = ctx.damageTypes.some((d) => String(d).toLowerCase() === "flashing") || ctx.damageTypes.some((d) => String(d).toLowerCase() === "leaks");
  const flashing: string[] = wantsFlashing ? ["irc_r903_1", "irc_r903_2", "irc_r903_2_1"] : ["irc_r903_1"];

  // Underlayment (always relevant, but emphasize more for low-slope).
  const underlayment: string[] = ["irc_r905_1"];

  // Roof covering / system type.
  let systemSpecific: string[] = [];
  switch (material) {
    case "shingle":
      systemSpecific = ["irc_r905_2"];
      break;
    case "tpo":
      systemSpecific = ["irc_r905_13"];
      break;
    case "slate":
    case "tile":
      // Our template doesn't include dedicated R905 tile/slate entries, but R901/R903/R904 + underlayment still applies.
      systemSpecific = [];
      break;
    default:
      // If unknown, keep underlayment + generic roof covering/flashing.
      systemSpecific = [];
  }

  // Drainage outlets emphasis for low-slope.
  const drainage: string[] = isLowSlope ? ["irc_r903_4"] : [];

  // Re-roof / replace administration items.
  const replacement: string[] =
    ctx.recommendedAction === "Replace"
      ? include(["irc_r906_1", "irc_r906_2", "irc_r906_3", "irc_r907_1", "irc_r908_1"])
      : [];

  // Ventilation: best-effort building context by stories and slope.
  const occupancy = String(ctx.occupancy ?? "").toLowerCase();
  const isOtherOcc = occupancy.includes("other") || occupancy.includes("mixed") || occupancy.includes("commercial") || occupancy.includes("non-res");
  const ventilation: string[] = !isLowSlope && (isOtherOcc || (typeof ctx.roofStories === "number" && ctx.roofStories >= 2)) ? ["irc_r806_1"] : [];

  const selectedIds = uniqueStrings([...base, ...flashing, ...underlayment, ...systemSpecific, ...drainage, ...replacement, ...ventilation]);

  const checkMap = new Map(buildingCode.checks.map((c) => [c.id, c]));
  const filteredChecks = selectedIds.map((id) => checkMap.get(id)).filter(Boolean) as BuildingCodeInfo["checks"];

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
  if (edition && next.codeReference && !next.codeReference.toLowerCase().includes("edition")) {
    next.codeReference = `${next.codeReference} (based on IRC ${edition}; local amendments may apply)`;
  }

  return next;
}

