import type { PropertyUseType } from "./roofReportTypes";
import { classifyRoofSystem, type RoofSystemCategory } from "./roofSystemScope";

const COMMERCIAL_ADDR =
  /\b(warehouse|industrial|commercial|plaza|strip mall|shopping|office building|retail|storage|church|school|hospital|clinic|medical|dental|hotel|motel|mall|factory|manufacturing|distribution|self[- ]storage)\b/i;

const COMMERCIAL_ROOF_CATEGORIES = new Set<RoofSystemCategory>([
  "tpo",
  "epdm",
  "pvc",
  "modified-bitumen",
  "coating",
  "built-up",
  "flat-generic",
]);

const RESIDENTIAL_ROOF_CATEGORIES = new Set<RoofSystemCategory>([
  "asphalt-shingle",
  "slate",
  "tile",
  "metal",
]);

export function inferPropertyUseType(input: {
  address: string;
  roofType?: string;
}): { use: PropertyUseType; reason?: string } {
  const addr = (input.address ?? "").trim();
  if (COMMERCIAL_ADDR.test(addr.toLowerCase())) {
    return {
      use: "commercial",
      reason: "Address keywords suggest nonresidential or institutional use.",
    };
  }

  const raw = (input.roofType ?? "").trim();
  if (!raw) {
    return { use: "unknown" };
  }

  const { category } = classifyRoofSystem(raw);
  if (COMMERCIAL_ROOF_CATEGORIES.has(category)) {
    return {
      use: "commercial",
      reason:
        "Roof system category is typical of commercial / low-slope construction.",
    };
  }
  if (RESIDENTIAL_ROOF_CATEGORIES.has(category)) {
    return {
      use: "residential",
      reason:
        "Roof system category is typical of one- and two-family / similar residential construction.",
    };
  }

  return { use: "unknown" };
}

/**
 * Maps property use to IRC checklist occupancy context (`filterIrcChecksForRoofType`).
 * Unknown keeps the app’s historical default (`otherOcc`).
 */
export function ircOccupancyForPropertyUse(
  propertyUse: PropertyUseType | undefined,
): "res_sf" | "otherOcc" {
  if (propertyUse === "residential") return "res_sf";
  if (propertyUse === "commercial") return "otherOcc";
  return "otherOcc";
}

export function formatPropertyUseLabel(
  propertyUse: PropertyUseType | undefined,
): string {
  if (propertyUse === "residential") return "Residential";
  if (propertyUse === "commercial") return "Commercial";
  if (propertyUse === "unknown") return "Not specified";
  return "Not specified";
}
