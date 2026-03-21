import type { PropertyUseType } from "./roofReportTypes";

/** IBC Chapter 15 — nonresidential / general building context; hide when user marks residential-only. */
export function showIbcChapter15Knowledge(
  propertyUse: PropertyUseType | undefined,
): boolean {
  return propertyUse !== "residential";
}

/** IRC Ch.8 / Ch.9 + Missouri IRC supplement — one- and two-family–oriented; hide when user marks commercial-only. */
export function showIrcChaptersKnowledge(
  propertyUse: PropertyUseType | undefined,
): boolean {
  return propertyUse !== "commercial";
}
