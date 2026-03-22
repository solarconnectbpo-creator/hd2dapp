/**
 * Dispute Resolution Engine
 * AI-driven dispute analysis and resolution recommendations
 */

import { runAI } from "../utils/ai";

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface Dispute {
  id: string;
  reason: string;
  [key: string]: any;
}

interface Lead {
  id: string;
  contact_name: string;
  phone: string;
  quality_score: number;
  [key: string]: any;
}

interface Vendor {
  id: string;
  name: string;
  [key: string]: any;
}

interface DisputeResolution {
  decision: "approved_refund" | "rejected" | "replacement";
  reason: string;
  vendorImpact: "none" | "warning" | "strike";
}

export async function analyzeDispute(
  env: Env,
  dispute: Dispute,
  lead: Lead,
  vendor: Vendor,
): Promise<DisputeResolution> {
  try {
    const prompt = `
You are DisputeGPT, an AI that resolves disputes between buyers and vendors for purchased leads.

Analyze the dispute and decide on resolution:
- "approved_refund": Buyer gets refund, vendor responsible for failed lead
- "rejected": Dispute dismissed, no refund
- "replacement": Send buyer a replacement lead instead of refund

Also determine vendor impact:
- "none": No action taken against vendor
- "warning": Vendor receives warning, affects reputation
- "strike": Vendor gets strike on record (affects future disputes)

Return ONLY valid JSON with:
- "decision": "approved_refund" | "rejected" | "replacement"
- "reason": string (brief explanation)
- "vendorImpact": "none" | "warning" | "strike"

Dispute Reason: ${dispute.reason}

Lead Quality Score: ${lead.quality_score}

Vendor: ${vendor.name}

Return ONLY valid JSON, no markdown.`;

    const text = await runAI(env, prompt);
    const parsed = JSON.parse(text);

    return {
      decision: parsed.decision || "rejected",
      reason: parsed.reason || "Unable to determine",
      vendorImpact: parsed.vendorImpact || "none",
    };
  } catch (error) {
    console.error("Dispute model error:", error);
    return {
      decision: "rejected",
      reason: "AI parsing error",
      vendorImpact: "none",
    };
  }
}
