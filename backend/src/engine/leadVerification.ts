/**
 * Lead Verification Pipeline
 * Runs on every lead: upload, API, purchase, delivery, or manual add
 */

import { runAI } from "../utils/ai";
import { verifyPhone } from "../utils/phoneVerify";
import { verifyEmail } from "../utils/emailVerify";
import { getVendorScore } from "../utils/vendorScore";
import { determineVerificationStatus } from "../utils/statusDeterminer";
import type { LeadVerificationStatus, VerificationResult as VerificationResponse, LeadVerificationData } from "../types/verification";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  notes?: string;
  [key: string]: any;
}

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface VerificationResult {
  isReal?: boolean;
  intent?: "high" | "medium" | "low";
  riskScore?: number;
  qualityScore?: number;
  recycledLead?: boolean;
  spam?: boolean;
  tcpaSafe?: boolean;
  justification?: string;
  phone: any;
  email: any;
  vendorScore: any;
}

export async function verifyLead(
  env: Env,
  lead: Lead,
  vendorId: string
): Promise<VerificationResult> {
  try {
    // Step 1: Phone validation
    const phoneCheck = verifyPhone(lead.phone);

    // Step 2: Email validation
    const emailCheck = verifyEmail(lead.email || "");

    // Step 3: Vendor reputation score
    const vendorScore = await getVendorScore(env, vendorId);

    // Step 4: AI intent + fraud analysis
    const aiPrompt = `
You are LeadGuardGPT, an AI that validates incoming leads for authenticity, intent, fraud, and quality.

Evaluate the following lead and provide:
- isReal: boolean (is the lead real?)
- intent: 'high' | 'medium' | 'low' (likelihood lead will convert)
- riskScore: 0-100 (fraud/quality risk)
- qualityScore: 0-100 (overall quality)
- recycledLead: boolean (recycled/resold lead?)
- spam: boolean (spam or bot-generated?)
- tcpaSafe: boolean (TCPA compliant?)
- justification: string (brief explanation)

Return ONLY valid JSON, no markdown.

Lead Data:
${JSON.stringify(lead)}

Phone Validation:
${JSON.stringify(phoneCheck)}

Email Validation:
${JSON.stringify(emailCheck)}

Vendor Score (0-100):
${JSON.stringify(vendorScore)}`;

    const aiAnalysis = await runAI(env, aiPrompt);

    let aiResult: any = {};
    try {
      aiResult = JSON.parse(aiAnalysis);
    } catch (error) {
      console.error("AI analysis parse error:", error);
      aiResult = {
        isReal: phoneCheck.valid && emailCheck.valid,
        intent: "medium",
        riskScore: 50,
        qualityScore: 50,
        recycledLead: false,
        spam: false,
        tcpaSafe: true,
        justification: "Failed to analyze with AI"
      };
    }

    const result: VerificationResult = {
      ...aiResult,
      phone: phoneCheck,
      email: emailCheck,
      vendorScore
    };

    // Save verification result to database
    await env.DB.prepare(
      `INSERT INTO lead_verification (id, lead_id, vendor_id, result_json, risk_score, quality_score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      lead.id,
      vendorId,
      JSON.stringify(result),
      result.riskScore || 50,
      result.qualityScore || 50,
      new Date().toISOString()
    ).run();

    // Update lead quality score
    await env.DB.prepare(
      "UPDATE leads SET quality_score = ? WHERE id = ?"
    ).bind(result.qualityScore || 50, lead.id).run();

    return result;
  } catch (error) {
    console.error("Lead verification error:", error);
    return {
      isReal: false,
      intent: "low",
      riskScore: 100,
      qualityScore: 0,
      recycledLead: true,
      spam: true,
      tcpaSafe: false,
      justification: "Verification failed",
      phone: { valid: false, reason: "error" },
      email: { valid: false, reason: "error" },
      vendorScore: { score: 0, riskLevel: "high" }
    };
  }
}
