# AI Enhancement Module Documentation

## Overview

The AI Enhancement module provides a comprehensive system for:

- **Measurement Fusion**: Combines multiple measurement sources with confidence weighting
- **Advanced Damage Detection**: Classifies damage types and generates risk assessments
- **User Guidance**: Real-time feedback and measurement quality checks
- **Feedback Loops**: Stores user corrections for continuous model improvement
- **Explainable AI**: Generates human-readable explanations for all predictions

## Architecture

```
src/roofReports/ai/
├── measurementFusion.ts           # Measurement source fusion with confidence weighting
├── advancedDamageDetector.ts      # Damage classification and risk scoring
├── userGuidanceSystem.ts          # Real-time guidance and quality checks
├── feedbackLoopStorage.ts         # User feedback persistence and analysis
├── explainableAi.ts               # Explanation generation for predictions
├── hooks/
│   └── useAIEnhancement.ts        # Custom hook integrating all modules
├── components/
│   ├── GuidanceOverlay.tsx        # Real-time guidance messages
│   └── MeasurementQualityBadge.tsx# Quality score indicator
└── __tests__/
    ├── measurementFusion.test.ts
    ├── advancedDamageDetector.test.ts
    ├── userGuidanceSystem.test.ts
    └── explainableAi.test.ts
```

## Usage Guide

### 1. Basic Measurement Fusion

```typescript
import { fuseMeasurements, MeasurementSource } from "@/src/roofReports/ai/measurementFusion";

const sources: MeasurementSource[] = [
  {
    areaSqFt: 1000,
    confidence: 0.9,
    source: "ai-vision",
    timestamp: Date.now(),
  },
  {
    areaSqFt: 1050,
    confidence: 0.85,
    source: "user-trace",
    timestamp: Date.now(),
  },
];

const fused = fuseMeasurements(sources);
console.log(`Fused area: ${fused.areaSqFt} sq ft (${fused.confidence * 100}% confidence)`);
```

### 2. Advanced Damage Detection

```typescript
import { assessDamageAdvanced } from "@/src/roofReports/ai/advancedDamageDetector";

const assessment = assessDamageAdvanced(
  {
    damageTypes: ["hail", "wind"],
    severity: 4,
    notes: "Storm damage visible",
  },
  {
    roofAge: 8,
    roofType: "asphalt shingle",
    imageQuality: "high",
  },
  {
    hailSwathProbability: 0.85,
    windGustMph: 65,
  },
);

console.log(`Risk level: ${assessment.totalSeverity}/5`);
console.log(`Recommendations: ${assessment.recommendations}`);
```

### 3. Using the Custom Hook

```typescript
import { useAIEnhancement } from "@/src/roofReports/ai/hooks/useAIEnhancement";

function MyComponent() {
  const { fusedMeasurement, damageAssessment, guidanceMessages, recordCorrection } = useAIEnhancement();

  return (
    <View>
      {fusedMeasurement && <Text>Roof area: {fusedMeasurement.areaSqFt} sq ft</Text>}
      {damageAssessment && <Text>Severity: {damageAssessment.totalSeverity}/5</Text>}
    </View>
  );
}
```

### 4. UI Components

```typescript
import GuidanceOverlay from "@/src/roofReports/ai/components/GuidanceOverlay";
import MeasurementQualityBadge from "@/src/roofReports/ai/components/MeasurementQualityBadge";
```

### 5. Recording User Corrections

```typescript
const { recordCorrection } = useAIEnhancement();

await recordCorrection({
  reportId: "report-123",
  aiPrediction: {
    field: "area",
    value: 1000,
    confidence: 0.85,
  },
  userCorrection: {
    value: 1050,
    reason: "Manual trace adjustment",
  },
  roofType: "asphalt shingle",
});
```

## Testing

Run all tests for this module:

```bash
npm test -- src/roofReports/ai
```

---

For API details, see inline JSDoc on each module and the `__tests__` files for examples.
