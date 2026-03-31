/**
 * AI Agent Orchestrator
 * Central coordination system for all AI agents
 */

import { getDb } from "../db";
import { agentTasks, agentMetrics } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export type AgentName = 
  | "ClaimAnalyzer"
  | "FraudDetector"
  | "PricingAgent"
  | "RoutingAgent"
  | "PaymentAgent"
  | "DocumentationAgent";

export type TaskType =
  | "analyzeClaim"
  | "detectFraud"
  | "getSupplierPricing"
  | "routeTask"
  | "createInvoice"
  | "generateReport";

export interface AgentTask {
  taskType: TaskType;
  agentName: AgentName;
  inputData: any;
  priority?: number;
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs: number;
}

/**
 * Create a new agent task in the queue
 */
export async function createAgentTask(task: AgentTask): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startTime = Date.now();

  const result = await db.insert(agentTasks).values({
    taskType: task.taskType,
    agentName: task.agentName,
    inputData: JSON.stringify(task.inputData),
    priority: task.priority || 5,
    status: "queued",
    createdAt: new Date(),
  });

  // @ts-ignore - insertId exists on result
  return result[0].insertId;
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: number,
  status: "queued" | "processing" | "completed" | "failed",
  outputData?: any,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updates: any = {
    status,
    updatedAt: new Date(),
  };

  if (status === "processing") {
    updates.startedAt = new Date();
  }

  if (status === "completed" || status === "failed") {
    updates.completedAt = new Date();
    if (outputData) {
      updates.outputData = JSON.stringify(outputData);
    }
    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }
  }

  await db.update(agentTasks).set(updates).where(eq(agentTasks.id, taskId));
}

/**
 * Execute an agent task with error handling and logging
 */
export async function executeAgentTask(
  taskId: number,
  executor: () => Promise<any>
): Promise<AgentResult> {
  const startTime = Date.now();

  try {
    await updateTaskStatus(taskId, "processing");

    const result = await executor();
    const executionTimeMs = Date.now() - startTime;

    await updateTaskStatus(taskId, "completed", result);

    return {
      success: true,
      data: result,
      executionTimeMs,
    };
  } catch (error: any) {
    const executionTimeMs = Date.now() - startTime;

    await updateTaskStatus(taskId, "failed", null, error.message);

    return {
      success: false,
      error: error.message,
      executionTimeMs,
    };
  }
}

/**
 * Record agent performance metrics
 */
export async function recordAgentMetrics(
  agentName: AgentName,
  executionTimeMs: number,
  success: boolean,
  costCents: number = 0
) {
  const db = await getDb();
  if (!db) return;

  // Get today's metrics or create new
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await db
    .select()
    .from(agentMetrics)
    .where(eq(agentMetrics.agentName, agentName))
    .limit(1);

  if (existing.length > 0) {
    const metric = existing[0];
    const newTasksCompleted = success
      ? metric.tasksCompleted + 1
      : metric.tasksCompleted;
    const newTasksFailed = success
      ? metric.tasksFailed
      : metric.tasksFailed + 1;
    const totalTasks = newTasksCompleted + newTasksFailed;

    // Calculate new average execution time
    const currentAvg = metric.avgExecutionTimeMs || 0;
    const newAvg = Math.round(
      (currentAvg * (totalTasks - 1) + executionTimeMs) / totalTasks
    );

    await db
      .update(agentMetrics)
      .set({
        tasksCompleted: newTasksCompleted,
        tasksFailed: newTasksFailed,
        avgExecutionTimeMs: newAvg,
        totalCostCents: metric.totalCostCents + costCents,
      })
      .where(eq(agentMetrics.id, metric.id));
  } else {
    await db.insert(agentMetrics).values({
      agentName,
      metricDate: today,
      tasksCompleted: success ? 1 : 0,
      tasksFailed: success ? 0 : 1,
      avgExecutionTimeMs: executionTimeMs,
      totalCostCents: costCents,
    });
  }
}

/**
 * Get agent performance metrics
 */
export async function getAgentMetrics(agentName?: AgentName) {
  const db = await getDb();
  if (!db) return [];

  if (agentName) {
    return await db
      .select()
      .from(agentMetrics)
      .where(eq(agentMetrics.agentName, agentName))
      .limit(30);
  }

  return await db.select().from(agentMetrics).limit(100);
}

/**
 * Get pending tasks for an agent
 */
export async function getPendingTasks(agentName?: AgentName, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select()
    .from(agentTasks)
    .where(eq(agentTasks.status, "queued"))
    .orderBy(agentTasks.priority)
    .limit(limit);

  if (agentName) {
    query = query.where(eq(agentTasks.agentName, agentName)) as any;
  }

  return await query;
}
