/**
 * Xactimate XML Validation Layer
 * Cross-checks generated Xactimate XML against local building codes
 * Flags discrepancies and suggests necessary code upgrades
 */

import { invokeLLM } from "./_core/llm";

/**
 * Texas Building Code Database (McKinney, Collin County)
 * Based on 2021 International Residential Code (IRC) adopted by Texas
 */
export const TEXAS_BUILDING_CODES = {
  roofing: {
    // Wind Speed Requirements
    windSpeed: {
      mckinney: 115, // mph (Design Wind Speed for Collin County)
      requirement: "All roof coverings must be designed for 115 mph wind speed",
      code: "IRC R301.2.1.1"
    },
    
    // Roof Covering Materials
    materials: {
      asphaltShingles: {
        minWeight: 240, // lbs per square
        requirement: "Minimum 240 lb/sq asphalt shingles or equivalent",
        code: "IRC R905.2.4"
      },
      underlayment: {
        requirement: "Ice barrier required in areas with average daily temp ≤ 25°F",
        texasException: "Not required in McKinney (avg daily temp > 25°F)",
        code: "IRC R905.2.7.1"
      },
      flashings: {
        requirement: "Corrosion-resistant metal flashing at all roof penetrations",
        code: "IRC R903.2"
      }
    },

    // Ventilation Requirements
    ventilation: {
      minRatio: "1:150", // 1 sq ft vent per 150 sq ft attic space
      requirement: "Minimum 1 sq ft of ventilation for every 150 sq ft of attic space",
      code: "IRC R806.2"
    },

    // Fire Resistance
    fireRating: {
      requirement: "Class A, B, or C fire rating required",
      recommended: "Class A (highest fire resistance) recommended for Texas",
      code: "IRC R902.1"
    },

    // Hail Resistance (Texas-specific)
    hailResistance: {
      recommended: "Class 4 Impact Resistance (UL 2218)",
      benefit: "Insurance discounts up to 35% with Class 4 IR shingles",
      code: "Texas Insurance Code Chapter 2210"
    },

    // Roof Slope
    minSlope: {
      asphaltShingles: "2:12", // 2 inches rise per 12 inches run
      requirement: "Minimum 2:12 slope for asphalt shingles",
      code: "IRC R905.2.2"
    },

    // Fasteners
    fasteners: {
      minNails: 4, // per shingle
      nailLength: "1.25 inches minimum for new construction",
      requirement: "Minimum 4 nails per shingle, 1.25\" length",
      code: "IRC R905.2.5"
    },

    // Deck Requirements
    deck: {
      material: "Minimum 7/16\" OSB or 1/2\" plywood",
      requirement: "Solid wood deck required for asphalt shingles",
      code: "IRC R905.2.6"
    }
  },

  // HOA-specific requirements (common in McKinney neighborhoods)
  hoa: {
    colorRestrictions: "Many McKinney HOAs restrict shingle colors (earth tones common)",
    approvalRequired: "HOA approval required before installation in deed-restricted communities",
    commonRestrictions: [
      "No bright or reflective colors",
      "Must match neighborhood aesthetic",
      "Architectural shingles often required (no 3-tab)",
      "Specific manufacturer/product line requirements"
    ]
  }
};

/**
 * Xactimate Line Item Structure
 */
export interface XactimateLineItem {
  code: string; // e.g., "RFG COMP" (Roof - Comp Shingle)
  description: string;
  quantity: number;
  unit: string; // "SQ" for squares, "LF" for linear feet, etc.
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

/**
 * Xactimate Estimate Structure
 */
export interface XactimateEstimate {
  projectName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  claimNumber?: string;
  dateOfLoss?: string;
  lineItems: XactimateLineItem[];
  subtotal: number;
  overhead: number;
  profit: number;
  total: number;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  isValid: boolean;
  discrepancies: Discrepancy[];
  codeUpgrades: CodeUpgrade[];
  complianceScore: number; // 0-100
  summary: string;
}

export interface Discrepancy {
  severity: "critical" | "warning" | "info";
  lineItem?: string;
  issue: string;
  code: string;
  recommendation: string;
}

export interface CodeUpgrade {
  category: string;
  current: string;
  recommended: string;
  benefit: string;
  estimatedCost: number;
  code: string;
}

/**
 * Parse Xactimate XML to structured estimate
 */
export function parseXactimateXML(xml: string): XactimateEstimate {
  // Simplified parser - in production, use a proper XML parser
  // This is a placeholder for the actual implementation
  
  // For now, return a mock structure
  return {
    projectName: "Roof Replacement",
    address: "123 Main St",
    city: "McKinney",
    state: "TX",
    zipCode: "75070",
    lineItems: [],
    subtotal: 0,
    overhead: 0,
    profit: 0,
    total: 0
  };
}

/**
 * Validate Xactimate estimate against Texas building codes
 * Uses Gemini AI to cross-check line items and suggest upgrades
 */
export async function validateXactimateEstimate(
  estimate: XactimateEstimate
): Promise<ValidationResult> {
  const discrepancies: Discrepancy[] = [];
  const codeUpgrades: CodeUpgrade[] = [];

  // Build context for Gemini
  const buildingCodeContext = JSON.stringify(TEXAS_BUILDING_CODES, null, 2);
  const estimateContext = JSON.stringify(estimate, null, 2);

  const prompt = `You are a Texas building code expert specializing in roofing compliance for McKinney, Collin County.

BUILDING CODES:
${buildingCodeContext}

XACTIMATE ESTIMATE:
${estimateContext}

TASK: Analyze this Xactimate estimate and identify:
1. Code compliance issues (discrepancies)
2. Recommended upgrades for better performance/value
3. Missing line items that should be included per code

For each discrepancy, provide:
- severity: "critical" | "warning" | "info"
- lineItem: the Xactimate line item code (if applicable)
- issue: description of the problem
- code: the relevant building code reference
- recommendation: how to fix it

For each upgrade, provide:
- category: type of upgrade (e.g., "Hail Resistance", "Wind Rating")
- current: what the estimate currently specifies
- recommended: what should be upgraded to
- benefit: why this upgrade matters (insurance discounts, durability, etc.)
- estimatedCost: additional cost in dollars
- code: relevant code or standard

Return your analysis as JSON:
{
  "discrepancies": [{ severity, lineItem, issue, code, recommendation }],
  "codeUpgrades": [{ category, current, recommended, benefit, estimatedCost, code }],
  "complianceScore": 0-100,
  "summary": "Brief overall assessment"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a Texas building code expert. Always return valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "validation_result",
          strict: true,
          schema: {
            type: "object",
            properties: {
              discrepancies: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    severity: { type: "string", enum: ["critical", "warning", "info"] },
                    lineItem: { type: "string" },
                    issue: { type: "string" },
                    code: { type: "string" },
                    recommendation: { type: "string" }
                  },
                  required: ["severity", "issue", "code", "recommendation"],
                  additionalProperties: false
                }
              },
              codeUpgrades: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    current: { type: "string" },
                    recommended: { type: "string" },
                    benefit: { type: "string" },
                    estimatedCost: { type: "number" },
                    code: { type: "string" }
                  },
                  required: ["category", "current", "recommended", "benefit", "estimatedCost", "code"],
                  additionalProperties: false
                }
              },
              complianceScore: { type: "number" },
              summary: { type: "string" }
            },
            required: ["discrepancies", "codeUpgrades", "complianceScore", "summary"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No validation result returned from AI");
    }

    const result = JSON.parse(content);

    return {
      isValid: result.discrepancies.filter((d: Discrepancy) => d.severity === "critical").length === 0,
      discrepancies: result.discrepancies,
      codeUpgrades: result.codeUpgrades,
      complianceScore: result.complianceScore,
      summary: result.summary
    };
  } catch (error) {
    console.error("[Xactimate Validator] Error:", error);
    throw error;
  }
}

/**
 * Generate compliance report in markdown format
 */
export function generateComplianceReport(
  estimate: XactimateEstimate,
  validation: ValidationResult
): string {
  let report = `# Building Code Compliance Report\n\n`;
  report += `**Project:** ${estimate.projectName}\n`;
  report += `**Address:** ${estimate.address}, ${estimate.city}, ${estimate.state} ${estimate.zipCode}\n`;
  report += `**Compliance Score:** ${validation.complianceScore}/100\n\n`;

  report += `## Summary\n\n${validation.summary}\n\n`;

  if (validation.discrepancies.length > 0) {
    report += `## Discrepancies Found (${validation.discrepancies.length})\n\n`;
    
    const critical = validation.discrepancies.filter(d => d.severity === "critical");
    const warnings = validation.discrepancies.filter(d => d.severity === "warning");
    const info = validation.discrepancies.filter(d => d.severity === "info");

    if (critical.length > 0) {
      report += `### 🔴 Critical Issues (${critical.length})\n\n`;
      critical.forEach((d, i) => {
        report += `${i + 1}. **${d.issue}**\n`;
        report += `   - Code: ${d.code}\n`;
        if (d.lineItem) report += `   - Line Item: ${d.lineItem}\n`;
        report += `   - Recommendation: ${d.recommendation}\n\n`;
      });
    }

    if (warnings.length > 0) {
      report += `### 🟠 Warnings (${warnings.length})\n\n`;
      warnings.forEach((d, i) => {
        report += `${i + 1}. **${d.issue}**\n`;
        report += `   - Code: ${d.code}\n`;
        if (d.lineItem) report += `   - Line Item: ${d.lineItem}\n`;
        report += `   - Recommendation: ${d.recommendation}\n\n`;
      });
    }

    if (info.length > 0) {
      report += `### ℹ️ Informational (${info.length})\n\n`;
      info.forEach((d, i) => {
        report += `${i + 1}. **${d.issue}**\n`;
        report += `   - Code: ${d.code}\n`;
        if (d.lineItem) report += `   - Line Item: ${d.lineItem}\n`;
        report += `   - Recommendation: ${d.recommendation}\n\n`;
      });
    }
  }

  if (validation.codeUpgrades.length > 0) {
    report += `## Recommended Upgrades (${validation.codeUpgrades.length})\n\n`;
    
    let totalUpgradeCost = 0;
    validation.codeUpgrades.forEach((u, i) => {
      report += `${i + 1}. **${u.category}**\n`;
      report += `   - Current: ${u.current}\n`;
      report += `   - Recommended: ${u.recommended}\n`;
      report += `   - Benefit: ${u.benefit}\n`;
      report += `   - Estimated Cost: $${u.estimatedCost.toLocaleString()}\n`;
      report += `   - Code: ${u.code}\n\n`;
      totalUpgradeCost += u.estimatedCost;
    });

    report += `**Total Upgrade Investment:** $${totalUpgradeCost.toLocaleString()}\n\n`;
  }

  report += `---\n\n`;
  report += `*Report generated by Nimbus IQ AI Building Code Validator*\n`;
  report += `*Based on 2021 International Residential Code (IRC) as adopted by Texas*\n`;

  return report;
}
