/**
 * IRC / IBC / ASTM references for proposals — filtered by material/roof category.
 * Always pair with AHJ disclaimer; adopted code edition varies by jurisdiction.
 */

export const ICC_IBC2018_CHAPTER15_ROOF_URL =
  "https://codes.iccsafe.org/content/IBC2018P6/chapter-15-roof-assemblies-and-rooftop-structures#IBC2018P6_Ch15";

export const ICC_IRC2024_URL = "https://codes.iccsafe.org/content/IRC2024P2";

/** Shown on every proposal/report that cites model codes. */
export const AHJ_COMPLIANCE_DISCLAIMER =
  "Confirm the adopted code edition, local amendments, and manufacturer installation requirements with your authority having jurisdiction (AHJ). Model code citations are references only.";

/** Explains map-based takeoff limits — not survey-grade without field verification. */
export const MEASUREMENT_METHODOLOGY_BLURB =
  "Quantities in this estimate are derived from map-drawn footprints, entered pitch, waste percentage, and (where used) modeled ridge/eave/hip/valley lengths. They are planning estimates for bidding and must be field-verified before construction, permits, or insurance settlements. Surface area uses plan area × pitch factor unless measured squares override; accessory linear feet use drawn lines when present, otherwise modeled lengths from plan geometry.";

const COMMON_ALWAYS: readonly string[] = [
  "IRC R903 — Weather protection (flashing, drainage)",
  "IRC R904 — Materials (roof covering)",
  "IRC R806 — Roof ventilation (when applicable)",
  "IBC Chapter 15 — Roof assemblies & rooftop structures; confirm adopted IBC edition with AHJ",
];

const ASPHALT_STEEP: readonly string[] = [
  ...COMMON_ALWAYS,
  "IRC R905.2 — Asphalt shingles",
  "ASTM D3462 — Asphalt shingles (glass mat)",
  "ASTM D7158 — Asphalt shingles (wind-resistance classification)",
  "ASTM D3161 — Asphalt shingles (fan-induced wind)",
  "ASTM D1970 — Self-adhering polymer-modified bituminous underlayment (ice & water shield)",
  "ASTM D6757 / D4869 / D228 — Underlayments used with steep-slope roofing",
];

const METAL: readonly string[] = [
  ...COMMON_ALWAYS,
  "IRC R905.5 — Metal roof shingles / structural metal panel roof systems (confirm subsection for your product)",
  "ASTM E96 — Water vapor transmission of materials (as applicable to assembly)",
];

const TILE_SLATE: readonly string[] = [
  ...COMMON_ALWAYS,
  "IRC R905.3 — Slate shingles",
  "IRC R905.4 — Clay and concrete tile",
];

const SINGLE_PLY: readonly string[] = [
  ...COMMON_ALWAYS,
  "IBC §1504 / §1507 — Weather protection and roof coverings (low-slope assemblies; confirm adopted edition)",
  "ASTM D6878 — TPO sheet roofing",
  "ASTM D4434 — PVC sheet roofing",
  "ASTM D4637 — EPDM sheet roofing",
];

const MODBIT: readonly string[] = [
  ...COMMON_ALWAYS,
  "IBC Chapter 15 — Modified bitumen and built-up assemblies (confirm § with AHJ)",
  "ASTM D6162 — SBS-modified bituminous sheet (modified bitumen)",
];

const COATING: readonly string[] = [
  ...COMMON_ALWAYS,
  "IBC Chapter 15 — Roof coatings and liquid-applied systems (confirm product listing and wind/fire with AHJ)",
];

/**
 * @param category — return value of `classifyRoofType` in App.tsx (asphalt, metal, tile, flat, tpo, epdm, pvc, modbit, coating, slate, …)
 */
export function getComplianceReferencesForCategory(category: string): string[] {
  const c = category.toLowerCase();
  if (c === "metal") return [...METAL];
  if (c === "tile" || c === "slate") return [...TILE_SLATE];
  if (c === "tpo" || c === "pvc" || c === "epdm" || c === "flat") return [...SINGLE_PLY];
  if (c === "modbit") return [...MODBIT];
  if (c === "coating") return [...COATING];
  return [...ASPHALT_STEEP];
}
