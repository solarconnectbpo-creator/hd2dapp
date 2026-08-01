/**
 * Steep-slope and multi-story access pricing.
 *
 * Walkable single-story roofs add nothing. Anything at 4/12 or steeper, or above one
 * story, costs measurably more in staging, fall protection, and production rate, so it
 * is priced as its own visible per-square line rather than hidden in the base rate.
 */

/** Per-square uplift by walkability tier (rise per 12" run). */
export const STEEP_SURCHARGE_PER_SQ: Record<SteepTier, number> = {
  "4-6": 18.5,
  "7-9": 32.0,
  "10+": 55.0,
};

/** Per-square uplift by story count. */
export const HEIGHT_SURCHARGE_PER_SQ: Record<HeightTier, number> = {
  "2story": 8.1,
  "3story": 15.5,
  "4story": 24.0,
};

export type SteepTier = "4-6" | "7-9" | "10+";
export type HeightTier = "2story" | "3story" | "4story";

/** Steep-slope tier for a pitch rise, or null when the roof is walkable (below 4/12). */
export function steepSurchargeTier(pitchRise: number | null | undefined): SteepTier | null {
  if (pitchRise == null || !Number.isFinite(pitchRise) || pitchRise < 4) return null;
  if (pitchRise < 7) return "4-6";
  if (pitchRise < 10) return "7-9";
  return "10+";
}

/** Height tier for a story count, or null for a single story. */
export function heightSurchargeTier(stories: number | null | undefined): HeightTier | null {
  if (stories == null || !Number.isFinite(stories) || stories < 2) return null;
  if (stories < 3) return "2story";
  if (stories < 4) return "3story";
  return "4story";
}

/** Combined per-square access uplift; 0 for a walkable single-story roof. */
export function accessSurchargePerSquare(
  pitchRise: number | null | undefined,
  stories: number | null | undefined,
): number {
  const steepTier = steepSurchargeTier(pitchRise);
  const heightTier = heightSurchargeTier(stories);
  const steep = steepTier ? STEEP_SURCHARGE_PER_SQ[steepTier] : 0;
  const height = heightTier ? HEIGHT_SURCHARGE_PER_SQ[heightTier] : 0;
  return Math.round((steep + height) * 100) / 100;
}

/** Human-readable reason for the surcharge line, or null when there is no surcharge. */
export function accessSurchargeLabel(
  pitchRise: number | null | undefined,
  stories: number | null | undefined,
): string | null {
  const steepTier = steepSurchargeTier(pitchRise);
  const heightTier = heightSurchargeTier(stories);
  const parts: string[] = [];
  if (steepTier) parts.push(`${steepTier}/12 pitch`);
  if (heightTier) parts.push(heightTier.replace("story", "-story"));
  return parts.length ? parts.join(" + ") : null;
}
