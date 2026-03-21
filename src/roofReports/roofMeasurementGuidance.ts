import type { RoofSystemCategory } from "./roofSystemScope";

/**
 * Plain-language notes so traced footprint area is not mistaken for material takeoff
 * or sloped surface area without adjustment.
 */
export function buildRoofMeasurementGuidanceNotes(opts: {
  roofAreaSqFt?: number;
  roofPerimeterFt?: number;
  roofSystemCategory?: RoofSystemCategory;
  roofFormType?: string;
  pitchRise?: number;
}): string | undefined {
  const lines: string[] = [];

  if (
    typeof opts.roofAreaSqFt === "number" &&
    Number.isFinite(opts.roofAreaSqFt) &&
    opts.roofAreaSqFt > 0
  ) {
    lines.push(
      `Footprint / plan area from trace: ~${Math.round(opts.roofAreaSqFt).toLocaleString()} sq ft (horizontal projection).`,
    );
  }

  const rise = opts.pitchRise;
  if (
    typeof rise === "number" &&
    Number.isFinite(rise) &&
    rise > 0 &&
    rise < 12 &&
    typeof opts.roofAreaSqFt === "number" &&
    opts.roofAreaSqFt > 0
  ) {
    const run = 12;
    const cos = run / Math.sqrt(rise * rise + run * run);
    const surface = opts.roofAreaSqFt / cos;
    if (surface > opts.roofAreaSqFt * 1.02) {
      lines.push(
        `Approx. roof surface (single uniform pitch ~${rise}/12, planar footprint): ~${Math.round(surface).toLocaleString()} sq ft — ordering often still uses plan area with waste factors, not this surface alone.`,
      );
    }
  }

  const form = (opts.roofFormType ?? "").toLowerCase();
  if (form.includes("hip") || form.includes("valley")) {
    lines.push(
      "Hip / valley layouts add cut-up waste vs. a simple gable; material orders typically add waste on top of plan area.",
    );
  }

  const cat = opts.roofSystemCategory;
  if (
    cat === "tpo" ||
    cat === "epdm" ||
    cat === "pvc" ||
    cat === "modified-bitumen" ||
    cat === "built-up" ||
    cat === "flat-generic" ||
    cat === "coating"
  ) {
    lines.push(
      "Low-slope: confirm drainage, membrane seams, and penetration flashing — footprint area alone does not reflect detail labor.",
    );
  }

  if (
    typeof opts.roofPerimeterFt === "number" &&
    Number.isFinite(opts.roofPerimeterFt) &&
    opts.roofPerimeterFt > 0
  ) {
    lines.push(
      `Edge length (traced): ~${Math.round(opts.roofPerimeterFt).toLocaleString()} lf — use for starter/drip/edge metal context; not a full accessory takeoff.`,
    );
  }

  return lines.length ? lines.join("\n") : undefined;
}

export function mergeMeasurementGuidanceIntoNotes(
  existing: string | undefined,
  guidance: string,
): string {
  const marker = "[Measurement accuracy]";
  const idx = (existing ?? "").indexOf(marker);
  const next = `${marker}\n${guidance}`;
  if (idx === -1) {
    const t = existing?.trim();
    return t ? `${t}\n\n${next}` : next;
  }
  const before = (existing ?? "").slice(0, idx).replace(/\n+$/g, "").trim();
  return before ? `${before}\n\n${next}` : next;
}
