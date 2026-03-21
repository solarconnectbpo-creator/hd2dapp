import type { DamageType, RecommendedAction, Severity } from "./roofReportTypes";

export type RoofSystemCategory =
  | "asphalt-shingle"
  | "metal"
  | "tile"
  | "slate"
  | "tpo"
  | "epdm"
  | "pvc"
  | "modified-bitumen"
  | "coating"
  | "built-up"
  | "flat-generic"
  | "unknown";

const CATEGORY_LABEL: Record<RoofSystemCategory, string> = {
  "asphalt-shingle": "Asphalt Shingle",
  metal: "Metal",
  tile: "Tile",
  slate: "Slate",
  tpo: "TPO Single-Ply",
  epdm: "EPDM Single-Ply",
  pvc: "PVC Single-Ply",
  "modified-bitumen": "Modified Bitumen",
  coating: "Roof Coating",
  "built-up": "Built-Up Roofing (BUR)",
  "flat-generic": "Low-Slope / Flat Roof",
  unknown: "Unknown Roof Type",
};

export function classifyRoofSystem(rawRoofType?: string): {
  category: RoofSystemCategory;
  normalizedRoofType: string;
} {
  const raw = (rawRoofType ?? "").trim();
  const t = raw.toLowerCase();

  if (!t) return { category: "unknown", normalizedRoofType: CATEGORY_LABEL.unknown };
  if (/\bslate\b/.test(t)) return { category: "slate", normalizedRoofType: CATEGORY_LABEL.slate };
  if (/\bmetal|standing seam|r-panel|corrugated\b/.test(t))
    return { category: "metal", normalizedRoofType: CATEGORY_LABEL.metal };
  if (/\btile|clay|concrete tile\b/.test(t)) return { category: "tile", normalizedRoofType: CATEGORY_LABEL.tile };
  if (/\btpo\b/.test(t)) return { category: "tpo", normalizedRoofType: CATEGORY_LABEL.tpo };
  if (/\bepdm\b/.test(t)) return { category: "epdm", normalizedRoofType: CATEGORY_LABEL.epdm };
  if (/\bpvc\b/.test(t)) return { category: "pvc", normalizedRoofType: CATEGORY_LABEL.pvc };
  if (/\bmod(ified)?\s*bit|sbs|app\b/.test(t))
    return { category: "modified-bitumen", normalizedRoofType: CATEGORY_LABEL["modified-bitumen"] };
  if (/\bcoat|silicone|acrylic|elastomer|spf|spray foam\b/.test(t))
    return { category: "coating", normalizedRoofType: CATEGORY_LABEL.coating };
  if (/\bbur|built[- ]?up|tar and gravel\b/.test(t))
    return { category: "built-up", normalizedRoofType: CATEGORY_LABEL["built-up"] };
  if (/\bflat|low[- ]?slope\b/.test(t))
    return { category: "flat-generic", normalizedRoofType: CATEGORY_LABEL["flat-generic"] };
  if (/\bshingle|architectural|laminate|composition|comp\b/.test(t))
    return { category: "asphalt-shingle", normalizedRoofType: CATEGORY_LABEL["asphalt-shingle"] };

  return { category: "unknown", normalizedRoofType: raw };
}

export function buildRoofScopeOfWork(opts: {
  roofType?: string;
  damageTypes: DamageType[];
  severity: Severity;
  recommendedAction: RecommendedAction;
  roofAreaSqFt?: number;
}): string[] {
  const { category, normalizedRoofType } = classifyRoofSystem(opts.roofType);
  const out: string[] = [];
  const area = opts.roofAreaSqFt && Number.isFinite(opts.roofAreaSqFt) ? Math.round(opts.roofAreaSqFt) : undefined;
  const squares = area ? (area / 100).toFixed(2) : undefined;

  out.push(`Roof system identified: ${normalizedRoofType}.`);
  if (area) out.push(`Measured roof area: ${area.toLocaleString()} sq ft (${squares} squares).`);
  out.push(`Recommended action: ${opts.recommendedAction}.`);

  const hasHail = opts.damageTypes.includes("Hail");
  const hasWind = opts.damageTypes.includes("Wind");
  const hasLeaks = opts.damageTypes.includes("Leaks");
  const highSeverity = opts.severity >= 4;

  switch (category) {
    case "asphalt-shingle":
      out.push("Remove damaged shingle courses and inspect deck for soft spots.");
      out.push("Install ice/water protection at eaves/valleys and synthetic underlayment where disturbed.");
      out.push("Install starter, field shingles, hip/ridge, and match existing exposure/profile.");
      out.push("Replace pipe boots, step/apron flashing, and ridge vent as required.");
      break;
    case "metal":
      out.push("Remove/replace impacted metal panels and inspect clips/fasteners for pull-through.");
      out.push("Re-seal seams, transitions, and penetrations with manufacturer-approved sealant/tape.");
      out.push("Replace closure strips, flashing, and accessories at affected sections.");
      break;
    case "tile":
      out.push("Carefully remove and replace broken/dislodged tiles with matching profile/color.");
      out.push("Repair/replace underlayment and battens in impacted areas.");
      out.push("Reset ridge/hip mortar or dry-ridge system components as needed.");
      break;
    case "slate":
      out.push("Replace cracked/slipped slates using proper slate hooks/nails and layout alignment.");
      out.push("Inspect and repair flashings at valleys, walls, and penetrations.");
      out.push("Perform brittle-roof access protocol and minimize foot traffic during repairs.");
      break;
    case "tpo":
    case "epdm":
    case "pvc":
      out.push("Perform membrane test cuts/probes at suspected impact areas and wet-insulation check.");
      out.push("Replace saturated insulation and damaged membrane sections.");
      out.push("Heat-weld/adhere patches and reinforce penetrations/curbs per membrane spec.");
      out.push("Verify seam integrity and complete final QC leak test.");
      break;
    case "modified-bitumen":
      out.push("Remove damaged cap/base plies and inspect substrate moisture condition.");
      out.push("Install replacement ply system (torch/self-adhered/heat-welded to match spec).");
      out.push("Reinforce transitions, drains, and penetrations with compatible flashing details.");
      break;
    case "coating":
      out.push("Power-clean and prep substrate; remove failed coating at delaminated zones.");
      out.push("Repair substrate and seams prior to re-coat.");
      out.push("Apply specified primer/base/top coats to target dry-film thickness.");
      break;
    case "built-up":
    case "flat-generic":
      out.push("Perform core cut and moisture scan to map wet areas.");
      out.push("Replace wet insulation/plie layers and restore membrane continuity.");
      out.push("Rebuild flashing and edge-metal details; verify drainage functionality.");
      break;
    default:
      out.push("Complete detailed system verification and match materials to existing roof build.");
      out.push("Replace damaged roofing components and flashings per manufacturer requirements.");
      break;
  }

  if (hasHail) out.push("Document hail impacts by slope/elevation with photo references for claim support.");
  if (hasWind) out.push("Verify uplift resistance and reseal/resecure all wind-affected components.");
  if (hasLeaks) out.push("Perform post-repair leak check and interior moisture follow-up.");
  if (highSeverity) out.push("High-severity condition: evaluate full-slope/system replacement feasibility.");

  out.push("Protect landscaping/site, provide daily cleanup, and haul away roofing debris.");
  out.push("Final walk-through with photo closeouts and warranty registration documentation.");

  return out;
}
