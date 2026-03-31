/**
 * Claim Analyzer Agent
 * Extracts and validates insurance claim documents using Gemini Vision API
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { insuranceClaims } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Required line items per Texas building code
const REQUIRED_LINE_ITEMS = [
  "roof replacement",
  "ice and water shield",
  "drip edge installation",
  "flashing",
  "ridge cap shingles",
  "tear-off labor",
  "dump fees",
  "underlayment",
];

export interface ClaimAnalysisInput {
  claimId: number;
  fileUrl: string;
  claimNumber?: string;
  insuranceCompany?: string;
}

export interface LineItem {
  item: string;
  code?: string; // Xactimate code if found
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
}

export interface ClaimAnalysisResult {
  claimId: number;
  ocrText: string;
  lineItems: LineItem[];
  missingItems: string[];
  xactimateIssues: string[];
  totalEstimate?: number;
  confidence: number; // 0-100
}

/**
 * Analyze insurance claim document using Gemini Vision API
 */
export async function analyzeClaim(
  input: ClaimAnalysisInput
): Promise<ClaimAnalysisResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update claim status
  await db
    .update(insuranceClaims)
    .set({ status: "analyzing" })
    .where(eq(insuranceClaims.id, input.claimId));

  try {
    // Use Gemini Vision API to extract text and structure from claim document
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert insurance claim analyzer for roofing contractors. Extract all line items, quantities, prices, and codes from the insurance claim document. Identify any Xactimate codes (usually format: RFG-XXX or similar). Return structured JSON only.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this insurance claim document and extract all line items with quantities, prices, and codes. Return JSON with: ocrText (full extracted text), lineItems (array of {item, code, quantity, unit, unitPrice, totalPrice}), totalEstimate (sum of all line items).",
            },
            {
              type: "image_url",
              image_url: {
                url: input.fileUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "claim_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              ocrText: { type: "string" },
              lineItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" },
                    code: { type: "string" },
                    quantity: { type: "number" },
                    unit: { type: "string" },
                    unitPrice: { type: "number" },
                    totalPrice: { type: "number" },
                  },
                  required: ["item"],
                  additionalProperties: false,
                },
              },
              totalEstimate: { type: "number" },
            },
            required: ["ocrText", "lineItems"],
            additionalProperties: false,
          },
        },
      },
    });

    const analysis = JSON.parse(response.choices[0].message.content || "{}");

    // Find missing required items
    const missingItems = findMissingItems(analysis.ocrText, analysis.lineItems);

    // Validate Xactimate codes
    const xactimateIssues = validateXactimateCodes(analysis.lineItems);

    // Calculate confidence based on completeness
    const confidence = calculateConfidence(
      analysis.lineItems,
      missingItems,
      xactimateIssues
    );

    const result: ClaimAnalysisResult = {
      claimId: input.claimId,
      ocrText: analysis.ocrText,
      lineItems: analysis.lineItems,
      missingItems,
      xactimateIssues,
      totalEstimate: analysis.totalEstimate,
      confidence,
    };

    // Update database with results
    await db
      .update(insuranceClaims)
      .set({
        status: "reviewed",
        ocrText: analysis.ocrText,
        lineItems: JSON.stringify(analysis.lineItems),
        missingItems: JSON.stringify(missingItems),
        analyzedAt: new Date(),
      })
      .where(eq(insuranceClaims.id, input.claimId));

    return result;
  } catch (error: any) {
    // Update claim status to failed
    await db
      .update(insuranceClaims)
      .set({
        status: "rejected",
        reviewNotes: `Analysis failed: ${error.message}`,
      })
      .where(eq(insuranceClaims.id, input.claimId));

    throw error;
  }
}

/**
 * Find missing required line items
 */
function findMissingItems(ocrText: string, lineItems: LineItem[]): string[] {
  const textLower = ocrText.toLowerCase();
  const itemsLower = lineItems.map((item) => item.item.toLowerCase());

  return REQUIRED_LINE_ITEMS.filter((required) => {
    const requiredLower = required.toLowerCase();
    // Check if it's in OCR text or line items
    return (
      !textLower.includes(requiredLower) &&
      !itemsLower.some((item) => item.includes(requiredLower))
    );
  });
}

/**
 * Validate Xactimate codes (basic rule-based validation)
 */
function validateXactimateCodes(lineItems: LineItem[]): string[] {
  const issues: string[] = [];

  lineItems.forEach((item) => {
    // Check if code exists and follows standard format
    if (!item.code) {
      issues.push(`Missing Xactimate code for: ${item.item}`);
    } else if (!/^[A-Z]{3}-/.test(item.code)) {
      // Basic format check: XXX-XXX
      issues.push(`Non-standard code format for ${item.item}: ${item.code}`);
    }
  });

  return issues;
}

/**
 * Calculate confidence score based on completeness
 */
function calculateConfidence(
  lineItems: LineItem[],
  missingItems: string[],
  xactimateIssues: string[]
): number {
  let score = 100;

  // Deduct for missing items
  score -= missingItems.length * 10;

  // Deduct for Xactimate issues
  score -= xactimateIssues.length * 5;

  // Deduct if no line items found
  if (lineItems.length === 0) {
    score -= 50;
  }

  // Deduct if no prices
  const itemsWithPrices = lineItems.filter((item) => item.totalPrice);
  if (itemsWithPrices.length === 0) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Get claim analysis by ID
 */
export async function getClaimAnalysis(claimId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const claims = await db
    .select()
    .from(insuranceClaims)
    .where(eq(insuranceClaims.id, claimId))
    .limit(1);

  if (claims.length === 0) {
    throw new Error("Claim not found");
  }

  const claim = claims[0];

  return {
    ...claim,
    lineItems: claim.lineItems ? JSON.parse(claim.lineItems) : [],
    missingItems: claim.missingItems ? JSON.parse(claim.missingItems) : [],
    supplierPricing: claim.supplierPricing
      ? JSON.parse(claim.supplierPricing)
      : {},
    fraudFlags: claim.fraudFlags ? JSON.parse(claim.fraudFlags) : [],
  };
}
