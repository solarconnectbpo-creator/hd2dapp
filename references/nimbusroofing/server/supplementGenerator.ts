/**
 * SATCALC Supplement Generator
 * 
 * Generates aggressive, detailed insurance supplements with the personality
 * of a 20-year veteran who's seen every adjuster trick in the book.
 */

import { invokeLLM } from "./_core/llm";

interface RoofMeasurement {
  totalSquares: number;
  wasteFactorSquares: number;
  pitchMultiplier: number;
  ridgeCapLinearFeet: number;
  valleyMetalLinearFeet: number;
  dripEdgeLinearFeet: number;
  hipAndRidgeLinearFeet: number;
}

interface DamageItem {
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  dollarAmount: number;
  lineItem?: string;
  quantity?: number;
  unitCost?: number;
}

interface SupplementReport {
  summary: string;
  totalRecovery: number;
  lineItems: DamageItem[];
  satcalcNotes: string;
  xactimateFormat: string;
}

/**
 * Analyze roof photos using Gemini Vision API
 * Returns measurements and damage assessment
 */
export async function analyzeRoofPhotos(
  photoUrls: string[]
): Promise<{ measurements: RoofMeasurement; damages: DamageItem[] }> {
  const prompt = `You are SATCALC, a badass roof measurement analyst with 20 years of experience catching insurance adjuster BS.

Analyze these roof photos and provide:
1. Accurate square footage measurements
2. Pitch multiplier (based on roof slope)
3. Linear feet of ridge cap, valleys, drip edge
4. Waste factor (typically 10-15% depending on complexity)
5. Any damage or missing items the adjuster might skip

Be aggressive and thorough. If you see something that should be included, call it out. 
Insurance companies try to lowball—your job is to catch every dollar.

Return your analysis as JSON with this structure:
{
  "measurements": {
    "totalSquares": number,
    "wasteFactorSquares": number,
    "pitchMultiplier": number,
    "ridgeCapLinearFeet": number,
    "valleyMetalLinearFeet": number,
    "dripEdgeLinearFeet": number,
    "hipAndRidgeLinearFeet": number
  },
  "damages": [
    {
      "type": "critical|warning|info",
      "title": "Short description",
      "description": "Detailed explanation in SATCALC's aggressive voice",
      "dollarAmount": estimated_recovery,
      "lineItem": "Xactimate line item code if applicable",
      "quantity": number,
      "unitCost": number
    }
  ]
}`;

  const response = await invokeLLM({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...photoUrls.map(url => ({
            type: "image_url" as const,
            image_url: { url, detail: "high" as const }
          }))
        ]
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "roof_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            measurements: {
              type: "object",
              properties: {
                totalSquares: { type: "number" },
                wasteFactorSquares: { type: "number" },
                pitchMultiplier: { type: "number" },
                ridgeCapLinearFeet: { type: "number" },
                valleyMetalLinearFeet: { type: "number" },
                dripEdgeLinearFeet: { type: "number" },
                hipAndRidgeLinearFeet: { type: "number" }
              },
              required: ["totalSquares", "wasteFactorSquares", "pitchMultiplier", "ridgeCapLinearFeet", "valleyMetalLinearFeet", "dripEdgeLinearFeet", "hipAndRidgeLinearFeet"],
              additionalProperties: false
            },
            damages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["critical", "warning", "info"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  dollarAmount: { type: "number" },
                  lineItem: { type: "string" },
                  quantity: { type: "number" },
                  unitCost: { type: "number" }
                },
                required: ["type", "title", "description", "dollarAmount"],
                additionalProperties: false
              }
            }
          },
          required: ["measurements", "damages"],
          additionalProperties: false
        }
      }
    }
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("No analysis returned from AI");
  }

  return JSON.parse(content);
}

/**
 * Generate supplement report in SATCALC's aggressive style
 */
export async function generateSupplementReport(
  measurements: RoofMeasurement,
  damages: DamageItem[],
  adjusterEstimate?: {
    totalSquares?: number;
    ridgeCap?: number;
    valleys?: number;
  }
): Promise<SupplementReport> {
  const totalRecovery = damages.reduce((sum, d) => sum + d.dollarAmount, 0);

  const prompt = `You are SATCALC, writing a supplement report to an insurance adjuster.

Your measurements:
${JSON.stringify(measurements, null, 2)}

Items they missed or undercounted:
${JSON.stringify(damages, null, 2)}

${adjusterEstimate ? `Their original estimate:\n${JSON.stringify(adjusterEstimate, null, 2)}` : ''}

Write a professional but firm supplement report that:
1. Summarizes the total recovery amount
2. Lists each line item with quantities and costs
3. Calls out discrepancies between their estimate and reality
4. Uses industry terminology (Xactimate codes where applicable)
5. Maintains your no-BS personality while staying professional

Format the response as JSON:
{
  "summary": "Executive summary paragraph",
  "satcalcNotes": "Your aggressive commentary on what they tried to skip",
  "xactimateFormat": "Line items in Xactimate-style format"
}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are SATCALC, a veteran roof supplement specialist with zero tolerance for adjuster games." },
      { role: "user", content: prompt }
    ]
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== 'string') {
    throw new Error("Failed to generate supplement");
  }

  const generated = JSON.parse(content);

  return {
    summary: generated.summary,
    totalRecovery,
    lineItems: damages,
    satcalcNotes: generated.satcalcNotes,
    xactimateFormat: generated.xactimateFormat
  };
}

/**
 * Full pipeline: Analyze photos → Generate supplement
 */
export async function analyzeAndGenerateSupplement(
  photoUrls: string[],
  adjusterEstimate?: any
): Promise<SupplementReport> {
  // Step 1: Analyze photos
  const { measurements, damages } = await analyzeRoofPhotos(photoUrls);

  // Step 2: Generate supplement report
  const report = await generateSupplementReport(measurements, damages, adjusterEstimate);

  return report;
}
