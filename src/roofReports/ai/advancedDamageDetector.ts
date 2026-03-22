/**
 * Advanced Damage Detection & Classification
 * Identifies and classifies multiple damage types with severity scoring and evidence.
 */

export type DamageTypeLabel =
  | "hail"
  | "wind"
  | "missing-shingles"
  | "debris"
  | "water-damage"
  | "aging"
  | "moss-algae"
  | "penetrations"
  | "unknown";

export interface DetectedDamageType {
  label: DamageTypeLabel;
  confidence: number;
  severity: number;
  evidencePixels?: Array<{ x: number; y: number; confidence: number }>;
  count?: number;
  description: string;
}

export interface AdvancedDamageAssessment {
  damageDetected: boolean;
  totalSeverity: number;
  damageTypes: DetectedDamageType[];
  patternAnalysis?: string;
  weatherContext?: WeatherContext;
  riskFactors: string[];
  recommendations: string[];
  overallConfidence: number;
}

export interface WeatherContext {
  recentStorm?: boolean;
  stormDate?: string;
  hailSwathProbability?: number;
  windGustMph?: number;
  lastHailEvent?: string;
}

export function assessDamageAdvanced(
  aiVisionResult: {
    damageTypes: string[];
    severity: number;
    notes: string;
  },
  imageMetadata: {
    roofAge?: number;
    roofType?: string;
    imageQuality?: "high" | "medium" | "low";
    angle?: "orthogonal" | "oblique" | "satellite";
  },
  weatherContext?: WeatherContext,
): AdvancedDamageAssessment {
  const damageTypes = classifyDamageTypes(
    aiVisionResult.damageTypes,
    imageMetadata,
    weatherContext,
  );

  const totalSeverity = calculateAggregateSeverity(damageTypes);
  const riskFactors = identifyRiskFactors(
    damageTypes,
    imageMetadata,
    weatherContext,
  );

  return {
    damageDetected: damageTypes.length > 0,
    totalSeverity,
    damageTypes,
    patternAnalysis: analyzePattern(damageTypes),
    weatherContext,
    riskFactors,
    recommendations: generateRecommendations(
      damageTypes,
      totalSeverity,
      riskFactors,
    ),
    overallConfidence: Math.min(
      ...damageTypes.map((d) => d.confidence),
      getImageQualityConfidence(imageMetadata.imageQuality),
    ),
  };
}

function classifyDamageTypes(
  detectedLabels: string[],
  metadata: {
    roofAge?: number;
    roofType?: string;
    imageQuality?: string;
    angle?: string;
  },
  weather?: WeatherContext,
): DetectedDamageType[] {
  const classified: DetectedDamageType[] = [];

  const damageTypeMap: Record<string, DamageTypeLabel> = {
    hail: "hail",
    wind: "wind",
    missing: "missing-shingles",
    shingles: "missing-shingles",
    debris: "debris",
    water: "water-damage",
    aging: "aging",
    moss: "moss-algae",
    algae: "moss-algae",
    penetration: "penetrations",
  };

  for (const label of detectedLabels) {
    const normalized = label.toLowerCase();
    const mappedLabel =
      damageTypeMap[normalized] || ("unknown" as DamageTypeLabel);

    const damageConfig = getDamageConfig(mappedLabel, metadata, weather);

    classified.push({
      label: mappedLabel,
      confidence: damageConfig.baseConfidence,
      severity: damageConfig.baseSeverity,
      description: damageConfig.description,
      count: damageConfig.count,
    });
  }

  return classified;
}

function getDamageConfig(
  label: DamageTypeLabel,
  metadata: {
    roofAge?: number;
    roofType?: string;
    imageQuality?: string;
    angle?: string;
  },
  weather?: WeatherContext,
): {
  baseConfidence: number;
  baseSeverity: number;
  description: string;
  count?: number;
} {
  const configs: Record<
    DamageTypeLabel,
    {
      baseConfidence: number;
      baseSeverity: number;
      description: string;
      weatherBoost?: number;
      count?: number;
    }
  > = {
    hail: {
      baseConfidence: 0.85,
      baseSeverity: 4,
      description: "Hail damage detected with dents and bruising",
      weatherBoost: weather?.hailSwathProbability ? 0.1 : 0,
    },
    wind: {
      baseConfidence: 0.8,
      baseSeverity: 3,
      description: "Wind damage with lifted/peeling shingles",
    },
    "missing-shingles": {
      baseConfidence: 0.9,
      baseSeverity: 4,
      description: "Missing or severely damaged shingles requiring replacement",
    },
    debris: {
      baseConfidence: 0.75,
      baseSeverity: 2,
      description: "Debris accumulation detected",
    },
    "water-damage": {
      baseConfidence: 0.7,
      baseSeverity: 3,
      description: "Water staining or moisture damage observed",
    },
    aging: {
      baseConfidence: 0.65,
      baseSeverity: metadata.roofAge && metadata.roofAge > 15 ? 4 : 2,
      description: "Material aging and weathering detected",
    },
    "moss-algae": {
      baseConfidence: 0.8,
      baseSeverity: 1,
      description: "Moss or algae growth present",
    },
    penetrations: {
      baseConfidence: 0.85,
      baseSeverity: 3,
      description: "Roof penetrations (vents, pipes) with potential leak risk",
    },
    unknown: {
      baseConfidence: 0.4,
      baseSeverity: 1,
      description: "Unclassified roof condition",
    },
  };

  const config = configs[label] || configs.unknown;
  return {
    baseConfidence: Math.min(
      0.95,
      config.baseConfidence + (config.weatherBoost || 0),
    ),
    baseSeverity: config.baseSeverity,
    description: config.description,
    count: config.count,
  };
}

export function calculateAggregateSeverity(
  damageTypes: DetectedDamageType[],
): number {
  if (!damageTypes.length) return 1;

  const weightedSum = damageTypes.reduce((sum, dt) => {
    return sum + dt.severity * dt.confidence;
  }, 0);

  const totalConfidence = damageTypes.reduce(
    (sum, dt) => sum + dt.confidence,
    0,
  );
  const avg = totalConfidence > 0 ? weightedSum / totalConfidence : 1;

  return Math.min(5, Math.ceil(avg));
}

function analyzePattern(damageTypes: DetectedDamageType[]): string {
  const types = damageTypes.map((d) => d.label).join(", ");
  const highSeverity = damageTypes.filter((d) => d.severity >= 4);

  if (highSeverity.length === 0) {
    return `Minor damage detected: ${types}.`;
  }

  if (damageTypes.some((d) => d.label === "hail")) {
    return `Storm damage pattern detected with hail impact. Multiple shingles affected.`;
  }

  if (damageTypes.some((d) => d.label === "wind")) {
    return `Wind damage concentrated on exposed surfaces.`;
  }

  return `Multiple damage types present: ${types}. Recommend immediate inspection.`;
}

function identifyRiskFactors(
  damageTypes: DetectedDamageType[],
  metadata: { roofAge?: number; roofType?: string },
  weather?: WeatherContext,
): string[] {
  const factors: string[] = [];

  if (metadata.roofAge && metadata.roofAge > 15) {
    factors.push(
      "Roof age exceeds recommended lifespan (20 years). Replacement may be due.",
    );
  }

  if (damageTypes.some((d) => d.severity >= 4)) {
    factors.push(
      "High-severity damage present. Claims investigation recommended.",
    );
  }

  if (weather?.hailSwathProbability && weather.hailSwathProbability > 0.7) {
    factors.push(
      "Property in high-probability hail zone. Future storm risk elevated.",
    );
  }

  if (damageTypes.length > 2) {
    factors.push(
      "Multiple damage mechanisms. Comprehensive inspection warranted.",
    );
  }

  return factors;
}

function generateRecommendations(
  damageTypes: DetectedDamageType[],
  totalSeverity: number,
  riskFactors: string[],
): string[] {
  const recommendations: string[] = [];

  if (totalSeverity >= 4) {
    recommendations.push(
      "URGENT: Schedule immediate professional roof inspection.",
    );
    recommendations.push(
      "Contact insurance provider for damage claim evaluation.",
    );
  } else if (totalSeverity >= 3) {
    recommendations.push(
      "Schedule professional roof inspection within 30 days.",
    );
  } else {
    recommendations.push(
      "Monitor roof condition. Routine maintenance recommended.",
    );
  }

  if (damageTypes.some((d) => d.label === "penetrations")) {
    recommendations.push(
      "Inspect roof penetrations (vents, pipes) for water tightness.",
    );
  }

  if (riskFactors.length > 0) {
    recommendations.push(`Address risk factors: ${riskFactors[0]}`);
  }

  return recommendations;
}

function getImageQualityConfidence(quality?: string): number {
  return (
    {
      high: 0.95,
      medium: 0.75,
      low: 0.4,
    }[quality || "medium"] ?? 0.75
  );
}
