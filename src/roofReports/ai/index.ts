/**
 * Advanced AI enhancement modules for roof reports (fusion, damage, guidance, feedback, explainability).
 */

export * from "./measurementFusion";
export * from "./advancedDamageDetector";
export * from "./userGuidanceSystem";
export * from "./feedbackLoopStorage";
export * from "./explainableAi";

export { useAIEnhancement } from "./hooks/useAIEnhancement";
export { default as GuidanceOverlay } from "./components/GuidanceOverlay";
export { default as MeasurementQualityBadge } from "./components/MeasurementQualityBadge";

export {
  AIReportAgent,
  default as aiReportAgent,
} from "./services/aiReportAgent";
export type {
  ReportData,
  ReportGenerationRequest,
  ReportGenerationResponse,
  ReportSection,
} from "./services/aiReportAgent";
