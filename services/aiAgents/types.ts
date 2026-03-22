/**
 * Shared types for AI agent services (roof reports / data analysis).
 */

export type DataSourceType = "api" | "database" | "static";

export interface DataSource {
  id?: string;
  type: DataSourceType;
  /** REST endpoint when type is api */
  endpoint?: string;
  /** Query string when type is database (app-specific) */
  query?: string;
  /** Inline rows for tests / static analysis */
  rows?: unknown[];
}

export type AgentStatus = "success" | "error";

export interface AgentResponse<T = unknown> {
  status: AgentStatus;
  data?: T;
  error?: string;
}

export interface ReportAgentSection {
  title: string;
  body: string;
  priority?: number;
}
