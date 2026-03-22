/**
 * Lead Verification API
 * Handles lead verification and returns status/risk/quality
 */

import { verifyLead } from "../engine/leadVerification";
import { determineVerificationStatus } from "../utils/statusDeterminer";
import type { VerificationResult } from "../types/verification";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  notes?: string;
  [key: string]: any;
}

/**
 * POST /api/lead/verify
 * Verify a lead and return its status, risk, and quality scores
 */
export async function verifyLeadEndpoint(
  req: Request,
  env: Env,
  user: User,
): Promise<Response> {
  try {
    const body = await req.json();
    const { leadId, vendorId } = body;

    if (!leadId) {
      return new Response(JSON.stringify({ error: "Missing leadId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get lead from database
    const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?")
      .bind(leadId)
      .first();

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if verification already exists
    const existingVerification = await env.DB.prepare(
      "SELECT result_json FROM lead_verification WHERE lead_id = ?",
    )
      .bind(leadId)
      .first();

    let verificationData: any;

    if (existingVerification) {
      // Use cached verification
      verificationData = JSON.parse(existingVerification.result_json);
    } else {
      // Run verification
      verificationData = await verifyLead(
        env,
        lead,
        vendorId || lead.company_id,
      );
    }

    // Determine status and actions
    const result: VerificationResult =
      determineVerificationStatus(verificationData);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Lead verify endpoint error:", error);
    return new Response(JSON.stringify({ error: "Failed to verify lead" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
