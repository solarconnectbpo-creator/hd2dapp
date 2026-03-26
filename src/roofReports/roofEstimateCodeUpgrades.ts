import type { RoofCodeUpgradeHint } from "./roofReportTypes";

/** States where ice dam / self-adhered eaves protection is commonly required or amended in IRC. */
const ICE_DAM_COMMON_STATES = new Set([
  "AK",
  "CO",
  "CT",
  "IA",
  "ID",
  "IL",
  "IN",
  "MA",
  "ME",
  "MI",
  "MN",
  "MT",
  "ND",
  "NE",
  "NH",
  "NJ",
  "NY",
  "OH",
  "OR",
  "PA",
  "RI",
  "SD",
  "UT",
  "VT",
  "WA",
  "WI",
  "WV",
  "WY",
]);

/** Parse "6/12", "8:12", "6.5/12" → rise per 12" run. */
export function shouldIncludeIceWaterLine(
  stateCode?: string,
  roofPitch?: string,
): boolean {
  const st = stateCode?.trim().toUpperCase();
  if (st && ICE_DAM_COMMON_STATES.has(st)) return true;
  const r = parseRoofPitchRise(roofPitch);
  return r != null && r < 6;
}

export function parseRoofPitchRise(pitch?: string): number | undefined {
  if (!pitch?.trim()) return undefined;
  const t = pitch.trim();
  const s = t.replace(/[：:]/g, "/");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*12/);
  if (m) return Number(m[1]);
  return undefined;
}

function classifyRoofSystem(roofType: string | undefined): {
  isAsphalt: boolean;
  isMetal: boolean;
  isTile: boolean;
  isSlate: boolean;
  isLowSlopeMembrane: boolean;
  isCoating: boolean;
} {
  const rt = (roofType ?? "").toLowerCase();
  return {
    isAsphalt:
      rt.includes("shingle") ||
      rt.includes("asphalt") ||
      rt.includes("composition") ||
      rt.includes("3-tab") ||
      rt.includes("3 tab"),
    isMetal:
      rt.includes("metal") ||
      rt.includes("steel") ||
      rt.includes("standing seam"),
    isTile:
      rt.includes("tile") ||
      rt.includes("clay") ||
      rt.includes("concrete tile"),
    isSlate: rt.includes("slate"),
    isLowSlopeMembrane:
      rt.includes("tpo") ||
      rt.includes("epdm") ||
      rt.includes("pvc") ||
      rt.includes("modified") ||
      rt.includes("mod bit") ||
      rt.includes("modbit") ||
      rt.includes("sbs") ||
      rt.includes("app") ||
      (rt.includes("flat") && !rt.includes("coating")),
    isCoating:
      rt.includes("coating") ||
      rt.includes("silicone") ||
      rt.includes("acrylic") ||
      rt.includes("spf"),
  };
}

export function getRoofCodeUpgradeHints(opts: {
  roofType?: string;
  stateCode?: string;
  roofPitch?: string;
  scope: "repair" | "replace";
}): RoofCodeUpgradeHint[] {
  const { roofType, stateCode, roofPitch, scope } = opts;
  const sys = classifyRoofSystem(roofType);
  const rise = parseRoofPitchRise(roofPitch);
  const st = stateCode?.trim().toUpperCase();
  const iceClimate = st ? ICE_DAM_COMMON_STATES.has(st) : false;

  const out: RoofCodeUpgradeHint[] = [];

  if (sys.isAsphalt) {
    out.push({
      id: "drip-edge",
      title: "Drip edge (eaves & rakes)",
      codeReference: "IRC R905.2.8.5",
      rationale:
        "Metal drip edge is required at eaves and rakes for asphalt shingle roofs. Verify width, overlap, and attachment with local amendments.",
      applicability: "typical",
    });
    out.push({
      id: "starter-course",
      title: "Starter strip & first course alignment",
      codeReference: "IRC R905.2.7 (starter / wind resistance)",
      rationale:
        "Starter strips or equivalent are required to seal the first course and support wind resistance. Match manufacturer instructions.",
      applicability: "typical",
    });
    if (iceClimate || (rise != null && rise < 6)) {
      out.push({
        id: "ice-water",
        title: "Ice & water / self-adhered underlayment",
        codeReference: "IRC R905.2.7",
        rationale:
          "In areas with snow/ice, self-adhered underlayment is typically required at eaves (and often in valleys). Low-slope pitches near eaves increase risk.",
        applicability: "climate_dependent",
      });
    } else {
      out.push({
        id: "ice-water-verify",
        title: "Ice & water / self-adhered underlayment (verify)",
        codeReference: "IRC R905.2.7",
        rationale:
          "Even if not in the coldest climate zones, valleys and penetrations may require self-adhered underlayment per manufacturer or local code.",
        applicability: "verify_local",
      });
    }
    out.push({
      id: "decking-nail",
      title: "Decking inspection & fastener pull resistance",
      codeReference: "IRC R803 / R905.2.6",
      rationale:
        "If decking is OSB/plywood with gaps, delamination, or insufficient nail holding, re-nail or replace panels before re-cover.",
      applicability: "verify_local",
    });
  }

  if (sys.isMetal) {
    out.push({
      id: "metal-uplift",
      title: "Wind clips, fasteners & uplift resistance",
      codeReference: "IRC R905.10 / manufacturer",
      rationale:
        "Metal panel systems require clip spacing, fastener type, and sealant details matching wind speed and exposure class.",
      applicability: "verify_local",
    });
  }

  if (sys.isTile || sys.isSlate) {
    out.push({
      id: "tile-slate-attachment",
      title: "Attachment & batten / fastening pattern",
      codeReference: "IRC R905.3 / R905.6",
      rationale:
        "Tile and slate require corrosion-resistant fasteners and often upgraded attachment in high-wind zones.",
      applicability: "verify_local",
    });
  }

  if (sys.isLowSlopeMembrane) {
    out.push({
      id: "slope-minimum",
      title: "Minimum slope vs. system type",
      codeReference: "IRC R905.11–R905.13",
      rationale:
        "Single-ply and modified systems require minimum slopes; crickets and tapered insulation may be needed for drainage.",
      applicability: "verify_local",
    });
    out.push({
      id: "wind-ballast",
      title: "Mechanically attached vs. adhered vs. ballasted",
      codeReference: "IRC R905 + FM / manufacturer",
      rationale:
        "Attachment method must match wind uplift and fire requirements for the jurisdiction.",
      applicability: "verify_local",
    });
  }

  if (sys.isCoating) {
    out.push({
      id: "substrate-coating",
      title: "Substrate preparation & mil thickness",
      codeReference: "Manufacturer + IRC R905",
      rationale:
        "Restoration coatings require clean, dry substrates and often specified mil thickness; ponding areas may need repair first.",
      applicability: "verify_local",
    });
  }

  if (sys.isAsphalt && rise != null && rise < 2) {
    out.push({
      id: "slope-asphalt",
      title: "Minimum slope for asphalt shingles",
      codeReference: "IRC R905.2.2",
      rationale:
        "Standard asphalt shingles are limited to slopes ≥ 2:12 with special underlayment; below that, a different system is usually required.",
      applicability: "typical",
    });
  }

  if (scope === "replace") {
    out.push({
      id: "ventilation",
      title: "Attic ventilation / balanced intake-exhaust",
      codeReference: "IRC R806",
      rationale:
        "Full roof replacement is the right time to verify net free vent area and balanced airflow to reduce moisture and ice dam risk.",
      applicability: "climate_dependent",
    });
  }

  return out;
}
