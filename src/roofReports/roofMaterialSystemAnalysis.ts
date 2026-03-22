/**
 * Automatic roof system understanding: maps roof type text + material selector
 * to a resolved category and a full component/layer breakdown for accurate reports.
 */

import type { RoofMaterialType } from "@/src/roofReports/roofLogicEngine";
import {
  classifyRoofSystem,
  type RoofSystemCategory,
} from "@/src/roofReports/roofSystemScope";
import {
  geometryWasteNarrative,
  knowledgeBaseFigureRefs,
  reportAlertsForMaterial,
  structuralLoadLbsPerSqForMaterial,
} from "@/src/roofReports/roofMaterialKnowledgeBase";

export type RoofMaterialComponent = {
  name: string;
  purpose: string;
  notes?: string;
};

export type MaterialSystemAgreement =
  | "aligned"
  | "roof_type_only"
  | "material_selector_only"
  | "conflict";

export interface RoofMaterialSystemAnalysis {
  resolvedCategory: RoofSystemCategory;
  systemLabel: string;
  coveringDescription: string;
  agreement: MaterialSystemAgreement;
  sources: {
    roofTypeField: string;
    materialSelector: string;
  };
  components: RoofMaterialComponent[];
  layeringNotes: string[];
  accuracyNotes: string[];
  generatedAtIso: string;
  /** Typical dead load (lbs/sq) for planning — see knowledge base doc. */
  structuralLoadLbsPerSq?: number;
  /** Weight / membrane / specialty callouts for reports. */
  reportAlerts?: string[];
  /** Gable vs hip/valley waste context (when applicable). */
  geometryWasteNote?: string;
  /** Pointers to the five numbered knowledge-base figures. */
  knowledgeBaseFigureRefs?: string[];
}

function mapMaterialTypeToCategory(m: RoofMaterialType): RoofSystemCategory {
  const x = String(m).toLowerCase();
  if (x === "shingle") return "asphalt-shingle";
  if (x === "metal") return "metal";
  if (x === "tile") return "tile";
  if (x === "slate") return "slate";
  if (x === "tpo") return "tpo";
  return "unknown";
}

const CATEGORY_LABEL: Record<RoofSystemCategory, string> = {
  "asphalt-shingle": "Asphalt shingle system",
  metal: "Metal panel roof system",
  tile: "Clay / concrete tile system",
  slate: "Natural slate system",
  tpo: "TPO single-ply system",
  epdm: "EPDM single-ply system",
  pvc: "PVC single-ply system",
  "modified-bitumen": "Modified bitumen system",
  coating: "Roof coating system",
  "built-up": "Built-up roofing (BUR)",
  "flat-generic": "Low-slope / flat roof system",
  unknown: "Roof system (unspecified)",
};

function componentsForCategory(
  cat: RoofSystemCategory,
): RoofMaterialComponent[] {
  switch (cat) {
    case "asphalt-shingle":
      return [
        {
          name: "Roof deck",
          purpose:
            "Structural substrate; must be sound, dry, and properly nailed.",
        },
        {
          name: "Ice & water barrier",
          purpose:
            "Self-adhered membrane at eaves, valleys, penetrations, and vertical walls per code.",
          notes: 'Often 24"+ at eaves in northern climates.',
        },
        {
          name: "Underlayment",
          purpose:
            "Secondary barrier — synthetic or felt; sheds water if primary cover fails.",
        },
        {
          name: "Drip edge",
          purpose: "Metal flashing at eaves/rakes; directs water into gutters.",
        },
        {
          name: "Starter strip",
          purpose: "Seals first course at eaves/rakes; resists wind uplift.",
        },
        {
          name: "Field shingles",
          purpose:
            "Primary weather surface; courses staggered per manufacturer.",
        },
        {
          name: "Hip / ridge cap",
          purpose:
            "Finished caps at hips/ridge; ventilation-compatible where used.",
        },
        {
          name: "Ridge vent / intake",
          purpose: "Attic ventilation when part of specified system.",
          notes: "Optional depending on existing ventilation strategy.",
        },
        {
          name: "Step & apron flashing",
          purpose: "Walls, chimneys, skylights — shed water at transitions.",
        },
        {
          name: "Pipe boots & penetration seals",
          purpose: "Seal plumbing stacks and mechanical penetrations.",
        },
        {
          name: "Fasteners",
          purpose:
            "Roofing nails per manufacturer — length for deck thickness.",
        },
      ];
    case "metal":
      return [
        {
          name: "Deck / substrate",
          purpose: "Must meet deflection and fastener pull-out.",
        },
        {
          name: "Underlayment / slip sheet",
          purpose: "Often synthetic; reduces abrasion and moisture.",
        },
        {
          name: "Metal panels",
          purpose: "Primary weather surface — standing seam, R-panel, etc.",
        },
        {
          name: "Clips / concealed fasteners",
          purpose: "Thermal movement and wind uplift (system-dependent).",
        },
        {
          name: "Ridge / eave trim",
          purpose: "Closures and wind-driven rain protection.",
        },
        {
          name: "Sealants & butyl tape",
          purpose: "Seams, transitions, and penetrations.",
        },
        {
          name: "Flashings",
          purpose: "Headwall, sidewall, valley, and penetration metal.",
        },
      ];
    case "tile":
      return [
        { name: "Deck", purpose: "Structurally rated for tile dead load." },
        {
          name: "Underlayment",
          purpose: "Secondary barrier — often 2-ply in high wind.",
        },
        {
          name: "Battens / direct deck",
          purpose: "Attachment per profile and regional practice.",
        },
        { name: "Field tile", purpose: "Primary cover — clay or concrete." },
        { name: "Bird stop / eave closure", purpose: "Blocks entry at eaves." },
        {
          name: "Hip / ridge caps",
          purpose: "Finish and secure ridge/hip lines.",
        },
        {
          name: "Fasteners",
          purpose: "Corrosion-resistant; torque per manufacturer.",
        },
        { name: "Flashings", purpose: "Valleys, walls, penetrations." },
      ];
    case "slate":
      return [
        {
          name: "Deck / strapping",
          purpose: "Support layout and fastener pattern.",
        },
        {
          name: "Underlayment",
          purpose: "Often required under slate for ice/water management.",
        },
        {
          name: "Slate field",
          purpose: "Natural slate courses with proper headlap.",
        },
        {
          name: "Fasteners",
          purpose: "Copper or stainless nails — never mixed metals casually.",
        },
        {
          name: "Flashings",
          purpose: "Valleys, walls, penetrations — often metal.",
        },
      ];
    case "tpo":
    case "epdm":
    case "pvc":
      return [
        {
          name: "Deck / insulation",
          purpose:
            "Flat substrate; tapered insulation for drainage when designed.",
        },
        {
          name: "Vapor / retarder layers",
          purpose: "Per climate and building science (when specified).",
        },
        { name: "Membrane", purpose: "Primary waterproofing layer." },
        {
          name: "Seams",
          purpose: "Heat-welded, taped, or adhered per product line.",
          notes: "Critical QC point for leaks.",
        },
        {
          name: "Mechanical fasteners / plates",
          purpose: "When mechanically attached system.",
        },
        {
          name: "Flashings & terminations",
          purpose: "Walls, edges, drains, penetrations.",
        },
        {
          name: "Walk pads / protection",
          purpose: "HVAC access routes on membrane (when required).",
        },
      ];
    case "modified-bitumen":
      return [
        { name: "Deck / insulation", purpose: "Stable, dry substrate." },
        { name: "Base sheet / ply", purpose: "Part of multi-ply system." },
        {
          name: "Cap sheet",
          purpose: "Weather surface — torch, cold adhesive, or self-adhered.",
        },
        {
          name: "Flashings",
          purpose: "Details at walls, drains, penetrations.",
        },
      ];
    case "coating":
      return [
        {
          name: "Surface prep",
          purpose: "Clean, repair, and prime substrate.",
        },
        {
          name: "Base / build coats",
          purpose: "Achieve specified dry-film thickness.",
        },
        { name: "Top coat", purpose: "UV and weathering layer." },
        {
          name: "Fabric reinforcement",
          purpose: "At seams and details when specified.",
        },
      ];
    case "built-up":
    case "flat-generic":
      return [
        { name: "Structural deck", purpose: "Slope and drainage as designed." },
        {
          name: "Insulation",
          purpose: "Thermal and sometimes compressive (roofing assembly).",
        },
        {
          name: "Membrane / surfacing",
          purpose: "Primary waterproofing (system-specific).",
        },
        {
          name: "Flashings & drains",
          purpose: "Waterproof transitions and drainage.",
        },
      ];
    default:
      return [
        {
          name: "Primary roof covering",
          purpose: "Verify manufacturer system and compatible components.",
        },
        {
          name: "Underlayment / barrier",
          purpose: "Secondary protection per jurisdiction.",
        },
        {
          name: "Flashings & penetrations",
          purpose: "Critical leak paths — document all.",
        },
        {
          name: "Ventilation",
          purpose:
            "Attic/exhaust strategy where steep-slope; drainage where low-slope.",
        },
      ];
  }
}

/**
 * Resolves roof system from free-text roof type + material dropdown, then expands
 * standard components for reporting (similar depth to industry measurement reports).
 */
export function analyzeRoofMaterialSystem(opts: {
  roofTypeRaw: string;
  roofMaterialType: RoofMaterialType;
  roofFormType?: string;
  pitchRise?: number;
}): RoofMaterialSystemAnalysis {
  const fromRoofType = classifyRoofSystem(
    opts.roofTypeRaw?.trim() || undefined,
  );
  const fromMaterial = mapMaterialTypeToCategory(opts.roofMaterialType);

  let resolvedCategory: RoofSystemCategory = fromRoofType.category;
  let agreement: MaterialSystemAgreement = "aligned";

  if (fromRoofType.category === "unknown") {
    resolvedCategory = fromMaterial !== "unknown" ? fromMaterial : "unknown";
    agreement = "material_selector_only";
  } else if (fromMaterial !== "unknown") {
    const typeRank = categoryRank(fromRoofType.category);
    const matRank = categoryRank(fromMaterial);
    if (
      typeRank !== matRank &&
      typeRank !== "unknown" &&
      matRank !== "unknown"
    ) {
      agreement = "conflict";
      resolvedCategory = fromRoofType.category;
    } else {
      agreement = "aligned";
    }
  } else {
    agreement = "roof_type_only";
  }

  const lowSlope =
    typeof opts.pitchRise === "number" &&
    Number.isFinite(opts.pitchRise) &&
    opts.pitchRise <= 2;

  const layeringNotes: string[] = [];
  const accuracyNotes: string[] = [];

  if (agreement === "conflict") {
    layeringNotes.push(
      `Roof type field suggests “${fromRoofType.normalizedRoofType}” (${fromRoofType.category}) but the material selector is “${String(opts.roofMaterialType)}”. This report uses the roof type field for the system breakdown — confirm on site.`,
    );
  }
  if (lowSlope && !isLowSlopeCategory(resolvedCategory)) {
    layeringNotes.push(
      "Pitch is low-slope (≤2:12 rise/run). Steep-slope component lists may not apply; verify membrane or low-slope assembly.",
    );
  }
  if (opts.roofFormType) {
    layeringNotes.push(
      `Roof form context: ${opts.roofFormType} (affects waste, hips, and accessory quantities).`,
    );
  }

  const structuralLoadLbsPerSq = structuralLoadLbsPerSqForMaterial(
    opts.roofMaterialType,
  );
  const reportAlerts = reportAlertsForMaterial(opts.roofMaterialType);
  const geometryWasteNote = geometryWasteNarrative(
    opts.roofMaterialType,
    opts.roofFormType,
  );
  const kbRefs = knowledgeBaseFigureRefs(
    opts.roofMaterialType,
    opts.roofFormType,
  );

  accuracyNotes.push(
    "Component list is a standard industry template for the resolved system — field-verify manufacturer, warranty, and code for your jurisdiction.",
  );
  accuracyNotes.push(
    "Quantities are driven elsewhere (trace, EagleView-style calculator); this section names what belongs in a complete system.",
  );

  const components = componentsForCategory(resolvedCategory);

  return {
    resolvedCategory,
    systemLabel: CATEGORY_LABEL[resolvedCategory] ?? CATEGORY_LABEL.unknown,
    coveringDescription: fromRoofType.normalizedRoofType,
    agreement,
    sources: {
      roofTypeField: opts.roofTypeRaw?.trim() || "(empty)",
      materialSelector: String(opts.roofMaterialType),
    },
    components,
    layeringNotes,
    accuracyNotes,
    generatedAtIso: new Date().toISOString(),
    structuralLoadLbsPerSq,
    reportAlerts,
    geometryWasteNote,
    knowledgeBaseFigureRefs: kbRefs,
  };
}

function isLowSlopeCategory(c: RoofSystemCategory): boolean {
  return (
    c === "tpo" ||
    c === "epdm" ||
    c === "pvc" ||
    c === "modified-bitumen" ||
    c === "coating" ||
    c === "built-up" ||
    c === "flat-generic"
  );
}

/** Map categories to a coarse family for mismatch detection. */
function categoryRank(c: RoofSystemCategory): string {
  if (c === "asphalt-shingle") return "steep_shingle";
  if (c === "metal" || c === "tile" || c === "slate") return "steep_other";
  if (isLowSlopeCategory(c)) return "low_slope";
  if (c === "unknown") return "unknown";
  return "other";
}
