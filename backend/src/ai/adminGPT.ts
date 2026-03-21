/**
 * AdminGPT - AI System Monitor
 * Analyzes logs and metrics to detect issues and suggest improvements
 */

import { runAI } from "../utils/ai";

interface SystemAnalysis {
  issues: string[];
  warnings: string[];
  security: string[];
  optimizations: string[];
  bottlenecks: string[];
  recommendations: string[];
}

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

export async function analyzeSystem(
  env: Env,
  logs: any[],
  metrics: any[]
): Promise<SystemAnalysis> {
  const prompt = `
You are AdminGPT, an AI system monitoring and diagnosing a SaaS platform.

Analyze the provided logs and metrics to detect issues and suggest improvements.

Return ONLY a JSON object with:
- "issues": array of critical issues detected
- "warnings": array of performance warnings
- "security": array of security alerts
- "optimizations": array of optimization opportunities
- "bottlenecks": array of workflow bottlenecks
- "recommendations": array of specific recommendations

Look for:
- API errors and failures
- Performance degradation
- Security concerns
- Unusual patterns
- Failed workflows
- Call center issues
- CRM sync problems
- User onboarding drops

Logs: ${JSON.stringify(logs.slice(0, 50))}

Metrics: ${JSON.stringify(metrics.slice(0, 50))}

Return ONLY valid JSON, no markdown formatting.`;

  try {
    const text = await runAI(env, prompt);
    const parsed = JSON.parse(text);

    return {
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      security: Array.isArray(parsed.security) ? parsed.security : [],
      optimizations: Array.isArray(parsed.optimizations) ? parsed.optimizations : [],
      bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
    };
  } catch (error) {
    console.error("System analysis error:", error);
    return {
      issues: [],
      warnings: [],
      security: [],
      optimizations: [],
      bottlenecks: [],
      recommendations: []
    };
  }
}
