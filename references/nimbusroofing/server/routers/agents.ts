/**
 * AI Agents tRPC Router
 * Exposes AI agent capabilities to the frontend
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { insuranceClaims } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import {
  createAgentTask,
  executeAgentTask,
  recordAgentMetrics,
  getAgentMetrics,
  getPendingTasks,
} from "../agents/orchestrator";
import { analyzeClaim, getClaimAnalysis } from "../agents/claimAnalyzer";
import { detectFraud, initializeFraudPatterns } from "../agents/fraudDetector";

export const agentsRouter = router({
  /**
   * Upload and analyze insurance claim document
   */
  uploadClaim: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file
        claimNumber: z.string().optional(),
        insuranceCompany: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Upload file to S3
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const fileKey = `claims/${ctx.user.id}/${Date.now()}-${input.fileName}`;

      const { url: fileUrl } = await storagePut(
        fileKey,
        fileBuffer,
        "application/pdf"
      );

      // Create claim record
      const result = await db.insert(insuranceClaims).values({
        userId: ctx.user.id,
        claimNumber: input.claimNumber,
        insuranceCompany: input.insuranceCompany,
        uploadedFileUrl: fileUrl,
        uploadedFileName: input.fileName,
        status: "pending",
      });

      // @ts-ignore - insertId exists
      const claimId = result[0].insertId;

      return {
        claimId,
        fileUrl,
        status: "uploaded",
      };
    }),

  /**
   * Analyze claim (runs Claim Analyzer + Fraud Detector)
   */
  analyzeClaim: protectedProcedure
    .input(
      z.object({
        claimId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify claim belongs to user
      const claims = await db
        .select()
        .from(insuranceClaims)
        .where(eq(insuranceClaims.id, input.claimId))
        .limit(1);

      if (claims.length === 0 || claims[0].userId !== ctx.user.id) {
        throw new Error("Claim not found");
      }

      const claim = claims[0];

      // Create agent task
      const taskId = await createAgentTask({
        taskType: "analyzeClaim",
        agentName: "ClaimAnalyzer",
        inputData: {
          claimId: input.claimId,
          fileUrl: claim.uploadedFileUrl,
          claimNumber: claim.claimNumber,
          insuranceCompany: claim.insuranceCompany,
        },
        priority: 7,
      });

      // Execute claim analysis
      const analysisResult = await executeAgentTask(taskId, async () => {
        return await analyzeClaim({
          claimId: input.claimId,
          fileUrl: claim.uploadedFileUrl!,
          claimNumber: claim.claimNumber || undefined,
          insuranceCompany: claim.insuranceCompany || undefined,
        });
      });

      // Record metrics
      await recordAgentMetrics(
        "ClaimAnalyzer",
        analysisResult.executionTimeMs,
        analysisResult.success
      );

      if (!analysisResult.success) {
        throw new Error(analysisResult.error);
      }

      // Run fraud detection on extracted text
      const fraudTaskId = await createAgentTask({
        taskType: "detectFraud",
        agentName: "FraudDetector",
        inputData: {
          text: analysisResult.data.ocrText,
          claimId: input.claimId,
        },
        priority: 8,
      });

      const fraudResult = await executeAgentTask(fraudTaskId, async () => {
        return await detectFraud({
          text: analysisResult.data.ocrText,
          claimId: input.claimId,
        });
      });

      await recordAgentMetrics(
        "FraudDetector",
        fraudResult.executionTimeMs,
        fraudResult.success
      );

      return {
        analysis: analysisResult.data,
        fraud: fraudResult.data,
        taskIds: [taskId, fraudTaskId],
      };
    }),

  /**
   * Get claim analysis results
   */
  getClaimAnalysis: protectedProcedure
    .input(
      z.object({
        claimId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify claim belongs to user
      const claims = await db
        .select()
        .from(insuranceClaims)
        .where(eq(insuranceClaims.id, input.claimId))
        .limit(1);

      if (claims.length === 0 || claims[0].userId !== ctx.user.id) {
        throw new Error("Claim not found");
      }

      return await getClaimAnalysis(input.claimId);
    }),

  /**
   * Get user's claims
   */
  getMyClaims: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const claims = await db
      .select()
      .from(insuranceClaims)
      .where(eq(insuranceClaims.userId, ctx.user.id))
      .orderBy(desc(insuranceClaims.createdAt))
      .limit(50);

    return claims.map((claim) => ({
      ...claim,
      lineItems: claim.lineItems ? JSON.parse(claim.lineItems) : [],
      missingItems: claim.missingItems ? JSON.parse(claim.missingItems) : [],
      fraudFlags: claim.fraudFlags ? JSON.parse(claim.fraudFlags) : [],
    }));
  }),

  /**
   * Detect fraud in text (standalone)
   */
  detectFraud: publicProcedure
    .input(
      z.object({
        text: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const taskId = await createAgentTask({
        taskType: "detectFraud",
        agentName: "FraudDetector",
        inputData: { text: input.text },
        priority: 5,
      });

      const result = await executeAgentTask(taskId, async () => {
        return await detectFraud({ text: input.text });
      });

      await recordAgentMetrics(
        "FraudDetector",
        result.executionTimeMs,
        result.success
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    }),

  /**
   * Get agent performance metrics (admin only)
   */
  getAgentMetrics: protectedProcedure
    .input(
      z.object({
        agentName: z
          .enum([
            "ClaimAnalyzer",
            "FraudDetector",
            "PricingAgent",
            "RoutingAgent",
            "PaymentAgent",
            "DocumentationAgent",
          ])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // Only admins can view metrics
      if (ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      return await getAgentMetrics(input.agentName);
    }),

  /**
   * Get pending agent tasks (admin only)
   */
  getPendingTasks: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    return await getPendingTasks(undefined, 50);
  }),

  /**
   * Initialize fraud patterns (admin only, run once)
   */
  initializeFraudPatterns: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await initializeFraudPatterns();

    return { success: true, message: "Fraud patterns initialized" };
  }),
});
