import type { AgentResponse, DataSource } from "./types";

export interface DataMetrics {
  total: number;
  average: number;
  median: number;
  max: number;
  min: number;
}

export interface DataQualityReport {
  completeness: number;
  accuracy: number;
  consistency: number;
  issues: string[];
}

export interface AnalysisResult {
  metrics: DataMetrics;
  quality: DataQualityReport;
  anomalies: unknown[];
}

/**
 * Numeric / tabular analysis for imported leads or API payloads.
 */
export default class DataAnalyzerAgent {
  private dataSources = new Map<string, DataSource>();

  async analyzeData(source: DataSource): Promise<AgentResponse<AnalysisResult>> {
    try {
      const rawData = await this.fetchData(source);
      const analysis = await this.performAnalysis(rawData);
      return { status: "success", data: analysis };
    } catch (error) {
      return {
        status: "error",
        error: error instanceof Error ? error.message : "Analysis failed",
      };
    }
  }

  private async fetchData(source: DataSource): Promise<unknown[]> {
    if (source.type === "static" && source.rows?.length) {
      return source.rows;
    }
    if (source.type === "api" && source.endpoint) {
      return await this.fetchFromAPI(source.endpoint);
    }
    if (source.type === "database" && source.query) {
      return await this.fetchFromDatabase(source.query);
    }
    return [];
  }

  private async fetchFromAPI(endpoint: string): Promise<unknown[]> {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    return Array.isArray(json) ? json : [json];
  }

  private async fetchFromDatabase(_query: string): Promise<unknown[]> {
    return [];
  }

  private async performAnalysis(data: unknown[]): Promise<AnalysisResult> {
    return {
      metrics: this.calculateMetrics(data),
      quality: this.assessQuality(data),
      anomalies: this.detectAnomalies(data),
    };
  }

  private calculateMetrics(data: unknown[]): DataMetrics {
    const numbers = data.filter((d): d is number => typeof d === "number");
    if (numbers.length === 0) {
      return { total: 0, average: 0, median: 0, max: 0, min: 0 };
    }
    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mid = sorted[Math.floor(sorted.length / 2)] ?? 0;

    return {
      total: numbers.length,
      average: sum / numbers.length,
      median: mid,
      max: Math.max(...numbers),
      min: Math.min(...numbers),
    };
  }

  private assessQuality(data: unknown[]): DataQualityReport {
    const n = data.length;
    const issues: string[] = [];
    if (n === 0) {
      issues.push("No rows to analyze.");
    }
    return {
      completeness: n > 0 ? 100 : 0,
      accuracy: n > 0 ? 95 : 0,
      consistency: n > 0 ? 98 : 0,
      issues,
    };
  }

  private detectAnomalies(data: unknown[]): unknown[] {
    return [];
  }

  registerDataSource(id: string, source: DataSource): void {
    this.dataSources.set(id, source);
  }

  getDataSource(id: string): DataSource | undefined {
    return this.dataSources.get(id);
  }
}
