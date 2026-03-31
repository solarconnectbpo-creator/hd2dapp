/**
 * Fraud Detector Agent
 * Identifies fraudulent practices in insurance claims and contractor behavior
 */

import { getDb } from "../db";
import { fraudPatterns, insuranceClaims } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Enhanced fraud keywords from research
const DEFAULT_FRAUD_PATTERNS = [
  // Claim denial patterns
  { pattern: "denied", category: "claim_denial", weight: 15 },
  { pattern: "not covered", category: "claim_denial", weight: 15 },
  { pattern: "closed without inspection", category: "claim_denial", weight: 20 },
  { pattern: "partial approval", category: "claim_denial", weight: 10 },
  { pattern: "claim rejected", category: "claim_denial", weight: 15 },

  // Illegal practices (Texas)
  { pattern: "waived deductible", category: "illegal_practice", weight: 30 },
  { pattern: "free roof", category: "illegal_practice", weight: 30 },
  { pattern: "no out-of-pocket", category: "illegal_practice", weight: 25 },
  { pattern: "we pay your deductible", category: "illegal_practice", weight: 30 },

  // Inflated claims
  { pattern: "inflated claim", category: "inflated_claim", weight: 25 },
  { pattern: "manufactured damage", category: "inflated_claim", weight: 30 },
  { pattern: "exaggerated estimate", category: "inflated_claim", weight: 20 },

  // Storm chaser tactics
  { pattern: "storm chaser", category: "storm_chaser", weight: 25 },
  { pattern: "door-to-door", category: "storm_chaser", weight: 15 },
  { pattern: "expires today", category: "pressure_tactic", weight: 20 },
  { pattern: "limited time offer", category: "pressure_tactic", weight: 15 },
  { pattern: "sign now", category: "pressure_tactic", weight: 20 },

  // Suspicious contractor behavior
  { pattern: "cash only", category: "suspicious_payment", weight: 25 },
  { pattern: "upfront payment", category: "suspicious_payment", weight: 15 },
  { pattern: "no license", category: "unlicensed", weight: 30 },
  { pattern: "no insurance", category: "uninsured", weight: 30 },
];

export interface FraudDetectionInput {
  text: string;
  claimId?: number;
  contractorInfo?: {
    name?: string;
    license?: string;
    insurance?: string;
  };
}

export interface FraudFlag {
  sentence: string;
  pattern: string;
  category: string;
  weight: number;
}

export interface FraudDetectionResult {
  fraudScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  flaggedSentences: FraudFlag[];
  recommendations: string[];
  requiresManualReview: boolean;
}

/**
 * Detect fraudulent patterns in claim text
 */
export async function detectFraud(
  input: FraudDetectionInput
): Promise<FraudDetectionResult> {
  const db = await getDb();

  // Load fraud patterns from database (or use defaults)
  let patterns = DEFAULT_FRAUD_PATTERNS;
  if (db) {
    const dbPatterns = await db
      .select()
      .from(fraudPatterns)
      .where(eq(fraudPatterns.isActive, true));

    if (dbPatterns.length > 0) {
      patterns = dbPatterns.map((p) => ({
        pattern: p.pattern,
        category: p.category,
        weight: p.riskWeight,
      }));
    }
  }

  // Split text into sentences for context
  const sentences = splitIntoSentences(input.text);

  // Find matches
  const flaggedSentences: FraudFlag[] = [];
  let totalScore = 0;

  sentences.forEach((sentence) => {
    const sentenceLower = sentence.toLowerCase();

    patterns.forEach((pattern) => {
      if (sentenceLower.includes(pattern.pattern.toLowerCase())) {
        flaggedSentences.push({
          sentence: sentence.trim(),
          pattern: pattern.pattern,
          category: pattern.category,
          weight: pattern.weight,
        });
        totalScore += pattern.weight;

        // Update pattern match count in database
        if (db) {
          updatePatternMatchCount(pattern.pattern);
        }
      }
    });
  });

  // Cap fraud score at 100
  const fraudScore = Math.min(100, totalScore);

  // Determine risk level
  const riskLevel = getRiskLevel(fraudScore);

  // Generate recommendations
  const recommendations = generateRecommendations(flaggedSentences, riskLevel);

  // Determine if manual review is required
  const requiresManualReview = fraudScore >= 50 || riskLevel === "critical";

  // Update claim with fraud score if claimId provided
  if (input.claimId && db) {
    await db
      .update(insuranceClaims)
      .set({
        fraudScore,
        fraudFlags: JSON.stringify(flaggedSentences),
        status: requiresManualReview ? "reviewed" : "approved",
      })
      .where(eq(insuranceClaims.id, input.claimId));
  }

  return {
    fraudScore,
    riskLevel,
    flaggedSentences,
    recommendations,
    requiresManualReview,
  };
}

/**
 * Split text into sentences
 */
function splitIntoSentences(text: string): string[] {
  // Simple sentence splitting (can be enhanced with NLP library)
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Determine risk level based on fraud score
 */
function getRiskLevel(
  score: number
): "low" | "medium" | "high" | "critical" {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 30) return "medium";
  return "low";
}

/**
 * Generate recommendations based on fraud flags
 */
function generateRecommendations(
  flags: FraudFlag[],
  riskLevel: string
): string[] {
  const recommendations: string[] = [];

  // Group flags by category
  const categories = new Set(flags.map((f) => f.category));

  if (categories.has("illegal_practice")) {
    recommendations.push(
      "⚠️ ILLEGAL PRACTICE DETECTED: Waiving deductibles is illegal in Texas (§4102). Report to Texas Department of Insurance."
    );
  }

  if (categories.has("claim_denial")) {
    recommendations.push(
      "Review claim denial reasons. Ensure all required documentation is provided."
    );
  }

  if (categories.has("inflated_claim")) {
    recommendations.push(
      "Verify all line items against current market pricing. Request itemized breakdown."
    );
  }

  if (categories.has("storm_chaser")) {
    recommendations.push(
      "Verify contractor license and insurance. Check BBB and online reviews."
    );
  }

  if (categories.has("pressure_tactic")) {
    recommendations.push(
      "Do not sign under pressure. Take time to review contract and get multiple quotes."
    );
  }

  if (categories.has("suspicious_payment")) {
    recommendations.push(
      "Never pay cash upfront. Use escrow or payment schedule tied to milestones."
    );
  }

  if (categories.has("unlicensed") || categories.has("uninsured")) {
    recommendations.push(
      "🚨 CRITICAL: Verify contractor has valid Texas license and insurance before proceeding."
    );
  }

  if (riskLevel === "critical" || riskLevel === "high") {
    recommendations.push(
      "🔴 HIGH RISK: Manual review required. Contact Nimbus Roofing for expert analysis."
    );
  }

  return recommendations;
}

/**
 * Update pattern match count in database
 */
async function updatePatternMatchCount(pattern: string) {
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db
      .select()
      .from(fraudPatterns)
      .where(eq(fraudPatterns.pattern, pattern))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(fraudPatterns)
        .set({ matchCount: existing[0].matchCount + 1 })
        .where(eq(fraudPatterns.id, existing[0].id));
    }
  } catch (error) {
    console.error("Failed to update pattern match count:", error);
  }
}

/**
 * Initialize fraud patterns in database
 */
export async function initializeFraudPatterns() {
  const db = await getDb();
  if (!db) return;

  try {
    // Check if patterns already exist
    const existing = await db.select().from(fraudPatterns).limit(1);
    if (existing.length > 0) return; // Already initialized

    // Insert default patterns
    for (const pattern of DEFAULT_FRAUD_PATTERNS) {
      await db.insert(fraudPatterns).values({
        pattern: pattern.pattern,
        patternType: "keyword",
        category: pattern.category,
        riskWeight: pattern.weight,
        description: `Auto-generated pattern for ${pattern.category}`,
        isActive: true,
        matchCount: 0,
      });
    }

    console.log("[Fraud Detector] Initialized fraud patterns");
  } catch (error) {
    console.error("[Fraud Detector] Failed to initialize patterns:", error);
  }
}
