import { computeAiDamageRisk, type RoofMaterialType } from "./roofLogicEngine";
import { classifyRoofSystem, buildRoofScopeOfWork } from "./roofSystemScope";
import { inferPropertyUseType } from "./propertyUseClassification";
import { getCompanyLogoUrlByName } from "./companyBranding";
import type {
  DamageRoofReport,
  DamageType,
  PropertySelection,
  RecommendedAction,
  RoofReportCreatedBy,
  Severity,
} from "./roofReportTypes";

function createReportId(seed: number) {
  return `r_${seed}_${Math.random().toString(16).slice(2)}`;
}

function getTodayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function mapboxSatelliteUrl(lat: number, lng: number): string | undefined {
  const token =
    typeof process !== "undefined" &&
    (process as { env?: Record<string, string | undefined> }).env
      ? (process as { env?: Record<string, string | undefined> }).env
          ?.EXPO_PUBLIC_MAPBOX_TOKEN
      : undefined;
  if (!token) return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const style = "mapbox/satellite-streets-v11";
  const zoom = 20;
  const bearing = 0;
  const pitch = 0;
  const width = 1200;
  const height = 700;
  return `https://api.mapbox.com/styles/v1/${style}/static/${lng},${lat},${zoom},${bearing},${pitch}/${width}x${height}?access_token=${token}`;
}

function materialForAi(normalizedRoofType: string): RoofMaterialType {
  const t = normalizedRoofType.toLowerCase();
  if (/\btpo\b/.test(t)) return "tpo";
  if (/\bslate\b/.test(t)) return "slate";
  if (/\b(tile|clay|concrete)\b/.test(t)) return "tile";
  if (/\bmetal\b/.test(t)) return "metal";
  return "shingle";
}

const DEFAULT_DAMAGE: DamageType[] = ["Hail"];
const DEFAULT_SEVERITY: Severity = 3;
const DEFAULT_ACTION: RecommendedAction = "Insurance Claim Help";

export function createBulkDamageReportFromLead(
  property: PropertySelection,
  opts: {
    idSeed: number;
    companyNameFallback?: string;
    createdBy?: RoofReportCreatedBy;
    /** Omit heavy URL fields so large CSV imports stay under browser storage limits (~5MB). */
    compact?: boolean;
  },
): DamageRoofReport {
  const roofTypeRaw = property.roofType?.trim() || "Asphalt Shingle";
  const classified = classifyRoofSystem(roofTypeRaw);
  const propertyUse =
    property.propertyUse ??
    inferPropertyUseType({
      address: property.address,
      roofType: classified.normalizedRoofType,
    }).use;

  const scopeOfWork = buildRoofScopeOfWork({
    roofType: classified.normalizedRoofType,
    damageTypes: DEFAULT_DAMAGE,
    severity: DEFAULT_SEVERITY,
    recommendedAction: DEFAULT_ACTION,
    roofAreaSqFt: property.roofSqFt,
  });

  const risk = computeAiDamageRisk({
    severity: DEFAULT_SEVERITY,
    damageTypes: DEFAULT_DAMAGE,
    roofMaterialType: materialForAi(classified.normalizedRoofType),
    pitchRise: undefined,
  });

  const companyName =
    (
      property.companyName?.trim() ||
      opts.companyNameFallback?.trim() ||
      ""
    ).trim() || undefined;

  const compact = opts.compact === true;

  const measurements =
    typeof property.roofSqFt === "number" &&
    Number.isFinite(property.roofSqFt) &&
    property.roofSqFt > 0
      ? {
          roofAreaSqFt: property.roofSqFt,
          notes:
            "Roof area from CSV import (review before relying on estimates).",
        }
      : undefined;

  return {
    id: createReportId(opts.idSeed),
    createdAtIso: new Date().toISOString(),
    property: {
      ...property,
      propertyUse,
    },
    propertyUse,
    inspectionDate: getTodayYmd(),
    homeownerName: property.homeownerName?.trim() || undefined,
    homeownerEmail: property.email?.trim() || undefined,
    homeownerPhone: property.phone?.trim() || undefined,
    roofType: classified.normalizedRoofType,
    roofSystemCategory: classified.category,
    scopeOfWork,
    damageTypes: DEFAULT_DAMAGE,
    severity: DEFAULT_SEVERITY,
    recommendedAction: DEFAULT_ACTION,
    notes:
      "Auto-generated from CSV contact import. Review all fields, photos, and measurements before final export.",
    companyName,
    companyLogoUrl: compact ? undefined : getCompanyLogoUrlByName(companyName),
    creatorName: opts.createdBy?.name,
    createdBy: opts.createdBy,
    measurements,
    aiDamageRisk: {
      score: risk.score,
      level: risk.level,
      factors: risk.factors,
      actionPlan: risk.actionPlan,
    },
    ...(compact
      ? {}
      : {
          propertyImageUrl: mapboxSatelliteUrl(property.lat, property.lng),
          propertyImageSource: "Mapbox Satellite" as const,
        }),
  };
}
