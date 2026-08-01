/**
 * Normalize roof pitch strings to Atlas `rise:run` (e.g. `6:12`).
 * Accepts `6:12`, `6/12`, `6 on 12`, or a plain rise number.
 */

export type NormalizedPitch = {
  /** Canonical Atlas form, e.g. `6:12`. */
  colon: string;
  rise: number;
  run: number;
  ratio: number;
};

/** Parse pitch into rise/run over 12 when possible. */
export function parsePitchParts(pitch: string): { rise: number; run: number } | null {
  if (!pitch?.trim()) return null;
  const s = pitch.trim().replace(/：/g, ":").replace(/\s+/g, " ");

  const slash12 = s.replace(/:/g, "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*12$/i);
  if (slash12?.[1]) {
    const rise = Number.parseFloat(slash12[1]);
    if (Number.isFinite(rise)) return { rise, run: 12 };
  }

  const ratio = s.replace(/:/g, "/").match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (ratio?.[1] && ratio?.[2]) {
    const rise = Number.parseFloat(ratio[1]);
    const run = Number.parseFloat(ratio[2]);
    if (Number.isFinite(rise) && Number.isFinite(run) && run > 0) return { rise, run };
  }

  const on12 = s.match(/^(\d+(?:\.\d+)?)\s*(?:on|in|per)\s*12$/i);
  if (on12?.[1]) {
    const rise = Number.parseFloat(on12[1]);
    if (Number.isFinite(rise)) return { rise, run: 12 };
  }

  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain?.[1]) {
    const rise = Number.parseFloat(plain[1]);
    if (Number.isFinite(rise) && rise >= 0 && rise <= 24) return { rise, run: 12 };
  }

  return null;
}

/**
 * Normalize to `rise:run` for the Atlas estimate engine.
 * Rounds rise to nearest integer when run is 12 (Atlas schema is `\d+:\d+`).
 */
export function normalizePitchToColon(pitch: string): NormalizedPitch {
  const parts = parsePitchParts(pitch);
  if (!parts) {
    throw new Error("Pitch must be in format 'rise:run' or 'rise/run' (e.g. 6:12)");
  }
  let { rise, run } = parts;
  // Normalize arbitrary run to /12 for Atlas pricing bands.
  if (run !== 12) {
    rise = (rise / run) * 12;
    run = 12;
  }
  if (!(rise >= 0 && rise <= 12 && run > 0 && run <= 12)) {
    throw new Error("Pitch must be between 0:12 and 12:12");
  }
  const riseInt = Math.round(rise);
  const runInt = Math.round(run);
  return {
    colon: `${riseInt}:${runInt}`,
    rise: riseInt,
    run: runInt,
    ratio: riseInt / runInt,
  };
}

/** Format a numeric rise (inches per 12) as `N:12`. */
export function pitchRiseToColon(rise: number): string {
  if (!Number.isFinite(rise) || rise <= 0) return "6:12";
  const clamped = Math.max(0, Math.min(12, Math.round(rise)));
  return `${clamped}:12`;
}
