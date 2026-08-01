/**
 * Normalize roof pitch strings to Atlas `rise:run` (e.g. `6:12`).
 * Keep in sync with roofing-estimator-vite/src/lib/cox/normalizePitch.ts
 */

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

export function normalizePitchToColon(pitch: string): { colon: string; rise: number; run: number } {
  const parts = parsePitchParts(pitch);
  if (!parts) {
    throw new Error("Pitch must be in format 'rise:run' or 'rise/run' (e.g. 6:12)");
  }
  let { rise, run } = parts;
  if (run !== 12) {
    rise = (rise / run) * 12;
    run = 12;
  }
  if (!(rise >= 0 && rise <= 12 && run > 0 && run <= 12)) {
    throw new Error("Pitch must be between 0:12 and 12:12");
  }
  const riseInt = Math.round(rise);
  const runInt = Math.round(run);
  return { colon: `${riseInt}:${runInt}`, rise: riseInt, run: runInt };
}
