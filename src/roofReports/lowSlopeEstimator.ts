import type {
  LowSlopeEstimateLineItem,
  LowSlopeMaterialEstimate,
  RecommendedAction,
} from "./roofReportTypes";
import type { RoofSystemCategory } from "./roofSystemScope";
import {
  LOW_SLOPE_PRICE_LIST_REFERENCE,
  LOW_SLOPE_PRICING_LINES,
  type LowSlopeCatalogSystem,
  type LowSlopePricingLineItem,
} from "./lowSlopePricingCatalog.generated";

function roundQty(n: number): number {
  return Math.round(n * 100) / 100;
}

function isRepairScope(action: RecommendedAction): boolean {
  return action === "Repair";
}

export function roofCategoryToLowSlopeCatalog(
  category: RoofSystemCategory,
): LowSlopeCatalogSystem | null {
  switch (category) {
    case "tpo":
    case "flat-generic":
      return "tpo";
    case "epdm":
      return "epdm";
    case "pvc":
      return "pvc";
    case "modified-bitumen":
    case "built-up":
      return "modified-bitumen";
    case "coating":
      return "roof-coatings";
    default:
      return null;
  }
}

function firstMatch(
  system: LowSlopeCatalogSystem,
  predicate: (l: LowSlopePricingLineItem) => boolean,
): LowSlopePricingLineItem | undefined {
  return LOW_SLOPE_PRICING_LINES.find(
    (l) => l.system === system && predicate(l),
  );
}

function buildLine(
  line: LowSlopePricingLineItem,
  qty: number,
): LowSlopeEstimateLineItem {
  const removeTotalUsd = qty * (line.removePerUnitUsd ?? 0);
  const replaceTotalUsd = qty * (line.replacePerUnitUsd ?? 0);
  const taxTotalUsd = qty * (line.taxPerUnitUsd ?? 0);
  return {
    description: line.description,
    section: line.section,
    unit: line.unit,
    quantity: roundQty(qty),
    removePerUnitUsd: line.removePerUnitUsd,
    replacePerUnitUsd: line.replacePerUnitUsd,
    taxPerUnitUsd: line.taxPerUnitUsd,
    removeTotalUsd,
    replaceTotalUsd,
    taxTotalUsd,
    lineTotalUsd: removeTotalUsd + replaceTotalUsd + taxTotalUsd,
  };
}

function pickDumpsterLine(
  system: LowSlopeCatalogSystem,
): LowSlopePricingLineItem | undefined {
  return firstMatch(
    system,
    (l) =>
      l.section === "GENERAL CONDITIONS" &&
      l.description.includes("Dumpster load") &&
      l.unit === "EA",
  );
}

function pickMembraneSystemLines(system: LowSlopeCatalogSystem): {
  remove?: LowSlopePricingLineItem;
  prep: LowSlopePricingLineItem;
  main: LowSlopePricingLineItem;
} | null {
  if (system === "tpo") {
    const remove = firstMatch(
      "tpo",
      (l) =>
        l.description.includes("Remove TPO membrane roofing") &&
        l.unit === "SQ",
    );
    const prep = firstMatch(
      "tpo",
      (l) =>
        l.description.includes("Prepare deck for new membrane") &&
        l.description.includes("clean & prime"),
    );
    const main = firstMatch(
      "tpo",
      (l) =>
        l.description.includes("TPO membrane 60-mil") &&
        l.description.includes("mechanically attached (MA)"),
    );
    if (!prep || !main) return null;
    return { remove, prep, main };
  }
  if (system === "epdm") {
    const remove = firstMatch(
      "epdm",
      (l) =>
        l.description.includes("Remove EPDM membrane roofing") &&
        !l.description.includes("ballast"),
    );
    const prep = firstMatch(
      "epdm",
      (l) =>
        l.description.includes("Prepare deck") &&
        l.description.includes("prime for EPDM"),
    );
    const main = firstMatch(
      "epdm",
      (l) =>
        l.description.includes("EPDM 60-mil") &&
        l.description.includes("mechanically attached") &&
        !l.description.includes("ballasted"),
    );
    if (!prep || !main) return null;
    return { remove, prep, main };
  }
  if (system === "pvc") {
    const remove = firstMatch(
      "pvc",
      (l) => l.description.includes("Remove PVC membrane") && l.unit === "SQ",
    );
    const prep = firstMatch(
      "pvc",
      (l) =>
        l.description.includes("Prepare deck") &&
        l.description.includes("prime for PVC"),
    );
    const main = firstMatch(
      "pvc",
      (l) =>
        l.description.includes("PVC membrane 60-mil") &&
        l.description.includes("mechanically attached (MA)"),
    );
    if (!prep || !main) return null;
    return { remove, prep, main };
  }
  if (system === "modified-bitumen") {
    const remove = firstMatch("modified-bitumen", (l) =>
      l.description.includes("Remove Modified Bitumen roofing – 1 layer"),
    );
    const prep = firstMatch(
      "modified-bitumen",
      (l) =>
        l.description.includes("Prepare deck") &&
        l.description.includes("prime for mod bit"),
    );
    const main = firstMatch(
      "modified-bitumen",
      (l) =>
        l.description.includes("SBS Modified Bitumen") &&
        l.description.includes("self-adhered 2-ply system"),
    );
    if (!prep || !main) return null;
    return { remove, prep, main };
  }
  return null;
}

function pickCoatingLines(opts: { repair: boolean }): {
  prep: LowSlopePricingLineItem;
  main: LowSlopePricingLineItem;
  seam?: LowSlopePricingLineItem;
  survey?: LowSlopePricingLineItem;
} | null {
  const prep = firstMatch("roof-coatings", (l) =>
    l.description.includes("Pressure wash / clean existing roof surface"),
  );
  const main = firstMatch(
    "roof-coatings",
    (l) =>
      l.description.includes("Silicone coating – 2-coat system total") &&
      l.description.includes("40 mils"),
  );
  const seam = firstMatch("roof-coatings", (l) =>
    l.description.includes("Seam repair – re-adhere lifting seams"),
  );
  const survey = firstMatch(
    "roof-coatings",
    (l) =>
      l.description.includes("Roof moisture survey") &&
      l.description.includes("infrared"),
  );
  if (!prep || !main) return null;
  if (opts.repair) {
    return { prep, main, seam, survey };
  }
  return { prep, main };
}

function sumTotals(lines: LowSlopeEstimateLineItem[]) {
  let removeUsd = 0;
  let replaceUsd = 0;
  let taxUsd = 0;
  for (const ln of lines) {
    removeUsd += ln.removeTotalUsd;
    replaceUsd += ln.replaceTotalUsd;
    taxUsd += ln.taxTotalUsd;
  }
  return {
    removeUsd,
    replaceUsd,
    taxUsd,
    subtotalUsd: removeUsd + replaceUsd + taxUsd,
  };
}

/**
 * Ballpark material pricing from the MOSL8X low-slope cheat sheet (generated catalog).
 * Not a substitute for a job-specific bid — uses default assembly lines (e.g. TPO 60-mil MA).
 */
export function calculateLowSlopeMaterialEstimate(opts: {
  roofSystemCategory: RoofSystemCategory;
  roofAreaSqFt: number;
  roofPerimeterFt?: number;
  recommendedAction: RecommendedAction;
}): LowSlopeMaterialEstimate | undefined {
  const catalog = roofCategoryToLowSlopeCatalog(opts.roofSystemCategory);
  if (!catalog) return undefined;
  if (!Number.isFinite(opts.roofAreaSqFt) || opts.roofAreaSqFt <= 0)
    return undefined;

  const squares = opts.roofAreaSqFt / 100;
  const repair = isRepairScope(opts.recommendedAction);
  const scopeMode = repair ? "repair-indicative" : "full-replacement";
  const notes: string[] = [
    "Unit costs from MOSL8X reference list; verify quantities and assembly on site.",
  ];

  if (opts.roofSystemCategory === "flat-generic") {
    notes.push(
      "Generic flat/low-slope — priced as TPO 60-mil mechanically attached; change roof type if another system applies.",
    );
  }
  if (opts.roofSystemCategory === "built-up") {
    notes.push(
      "BUR — tear-off and replacement lines reference the modified bitumen price sheet.",
    );
  }
  if (repair) {
    notes.push(
      "Repair scope uses indicative partial quantities (patch + details); adjust after inspection.",
    );
  }

  const lines: LowSlopeEstimateLineItem[] = [];

  if (catalog === "roof-coatings") {
    const picked = pickCoatingLines({ repair });
    if (!picked) return undefined;
    const perim = opts.roofPerimeterFt;
    const seamLf =
      perim != null && Number.isFinite(perim)
        ? Math.max(20, roundQty(perim * 0.12))
        : 50;

    if (repair) {
      if (picked.survey) {
        lines.push(buildLine(picked.survey, roundQty(squares)));
      }
      const prepQty = Math.max(1, roundQty(squares * 0.35));
      lines.push(buildLine(picked.prep, prepQty));
      if (picked.seam) {
        lines.push(buildLine(picked.seam, seamLf));
      }
      const coatQty = Math.max(3, roundQty(squares * 0.2));
      lines.push(buildLine(picked.main, coatQty));
    } else {
      lines.push(buildLine(picked.prep, roundQty(squares)));
      lines.push(buildLine(picked.main, roundQty(squares)));
      const dump = pickDumpsterLine("roof-coatings");
      if (dump) lines.push(buildLine(dump, 1));
    }

    return {
      priceListReference: LOW_SLOPE_PRICE_LIST_REFERENCE,
      catalogSystem: "roof-coatings",
      roofSquares: roundQty(squares),
      scopeMode,
      lines,
      totals: sumTotals(lines),
      notes,
    };
  }

  const bundle = pickMembraneSystemLines(catalog);
  if (!bundle) return undefined;

  const dump = pickDumpsterLine(catalog);

  if (repair) {
    const prepQty = Math.max(1, roundQty(squares * 0.25));
    const memQty = Math.max(2, roundQty(squares * 0.18));
    lines.push(buildLine(bundle.prep, prepQty));
    lines.push(buildLine(bundle.main, memQty));
    const seam = firstMatch(
      catalog,
      (l) =>
        l.description.includes("base flashing") &&
        l.description.includes("walls") &&
        l.unit === "LF",
    );
    if (seam) {
      const lf =
        opts.roofPerimeterFt != null && Number.isFinite(opts.roofPerimeterFt)
          ? Math.max(30, roundQty(opts.roofPerimeterFt * 0.15))
          : 80;
      lines.push(buildLine(seam, lf));
    }
  } else {
    if (bundle.remove) {
      lines.push(buildLine(bundle.remove, roundQty(squares)));
    }
    lines.push(buildLine(bundle.prep, roundQty(squares)));
    lines.push(buildLine(bundle.main, roundQty(squares)));
    if (dump) lines.push(buildLine(dump, 1));
  }

  return {
    priceListReference: LOW_SLOPE_PRICE_LIST_REFERENCE,
    catalogSystem: catalog,
    roofSquares: roundQty(squares),
    scopeMode,
    lines,
    totals: sumTotals(lines),
    notes,
  };
}
