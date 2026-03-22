/**
 * Re-export: project alias `@/services` maps to repo-root `services/`.
 * Implementation: `services/aiAgents/OpenAIService.ts`
 */
export { default } from "../../../services/aiAgents/OpenAIService";
export type {
  OpenAIMessage,
  OpenAIResponse,
} from "../../../services/aiAgents/OpenAIService";
