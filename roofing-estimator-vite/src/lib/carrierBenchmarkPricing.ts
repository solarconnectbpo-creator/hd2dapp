import carrierProfilesJson from "../data/carrier-benchmark-profiles.json";

type CarrierProfileJson = {
  id: string;
  name: string;
  description: string;
  baseMultiplier: number;
  defaultRegionFactor: number;
  defaultComplexityFactor: number;
  requiredLineCategories?: string[];
  optionalLineCategories?: string[];
};

type CarrierProfilesJson = {
  metadata?: {
    label?: string;
    version?: string;
    notes?: string;
  };
  profiles?: CarrierProfileJson[];
};

export interface CarrierBenchmarkProfile {
  id: string;
  name: string;
  description: string;
  baseMultiplier: number;
  defaultRegionFactor: number;
  defaultComplexityFactor: number;
  requiredLineCategories: string[];
  optionalLineCategories: string[];
}

export interface CarrierBenchmarkComputation {
  sourceLabel: string;
  profile: CarrierBenchmarkProfile;
  regionFactor: number;
  complexityFactor: number;
  blendedMultiplier: number;
  baseRcv: number;
  adjustedRcv: number;
}

const DEFAULT_PROFILE_ID = "carrier-standard";
const FACTOR_MIN = 0.75;
const FACTOR_MAX = 1.4;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function normalizeProfile(raw: CarrierProfileJson): CarrierBenchmarkProfile {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    baseMultiplier: Number.isFinite(raw.baseMultiplier) ? raw.baseMultiplier : 1,
    defaultRegionFactor: Number.isFinite(raw.defaultRegionFactor) ? raw.defaultRegionFactor : 1,
    defaultComplexityFactor: Number.isFinite(raw.defaultComplexityFactor)
      ? raw.defaultComplexityFactor
      : 1,
    requiredLineCategories: Array.isArray(raw.requiredLineCategories) ? raw.requiredLineCategories : [],
    optionalLineCategories: Array.isArray(raw.optionalLineCategories) ? raw.optionalLineCategories : [],
  };
}

function getProfilesData(): CarrierProfilesJson {
  return carrierProfilesJson as CarrierProfilesJson;
}

export function getCarrierBenchmarkSourceLabel(): string {
  return (
    getProfilesData().metadata?.label ??
    "Benchmark (non-Xactimate proprietary feed)"
  );
}

export function getCarrierBenchmarkProfiles(): CarrierBenchmarkProfile[] {
  const raw = getProfilesData().profiles;
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      {
        id: DEFAULT_PROFILE_ID,
        name: "Carrier Standard",
        description: "Fallback benchmark profile.",
        baseMultiplier: 1,
        defaultRegionFactor: 1,
        defaultComplexityFactor: 1,
        requiredLineCategories: [],
        optionalLineCategories: [],
      },
    ];
  }
  return raw.map(normalizeProfile);
}

export function getCarrierBenchmarkProfile(profileId: string): CarrierBenchmarkProfile {
  const profiles = getCarrierBenchmarkProfiles();
  return profiles.find((p) => p.id === profileId) ?? profiles[0];
}

export function getDefaultCarrierBenchmarkProfileId(): string {
  const profiles = getCarrierBenchmarkProfiles();
  const hasDefault = profiles.some((p) => p.id === DEFAULT_PROFILE_ID);
  return hasDefault ? DEFAULT_PROFILE_ID : profiles[0].id;
}

export function computeCarrierBenchmark(args: {
  profileId: string;
  baseRcv: number;
  regionFactor: number;
  complexityFactor: number;
}): CarrierBenchmarkComputation {
  const profile = getCarrierBenchmarkProfile(args.profileId);
  const safeBase = Number.isFinite(args.baseRcv) ? Math.max(0, args.baseRcv) : 0;
  const regionFactor = clamp(
    Number.isFinite(args.regionFactor) ? args.regionFactor : profile.defaultRegionFactor,
    FACTOR_MIN,
    FACTOR_MAX,
  );
  const complexityFactor = clamp(
    Number.isFinite(args.complexityFactor)
      ? args.complexityFactor
      : profile.defaultComplexityFactor,
    FACTOR_MIN,
    FACTOR_MAX,
  );
  const blendedMultiplier = profile.baseMultiplier * regionFactor * complexityFactor;
  const adjustedRcv = Math.round(safeBase * blendedMultiplier);

  return {
    sourceLabel: getCarrierBenchmarkSourceLabel(),
    profile,
    regionFactor,
    complexityFactor,
    blendedMultiplier,
    baseRcv: Math.round(safeBase),
    adjustedRcv,
  };
}
