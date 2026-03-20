/**
 * Dispute Resolution API
 * Handles buyer disputes with vendors over leads
 */

import { analyzeDispute } from "../ai/disputeModel";
import { requirePermission } from "../middleware/rbac";
import { logAudit } from "../middleware/rbac";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  company_id?: string;
  [key: string]: any;
}

/**
 * POST /api/disputes/create
 * Buyer creates dispute for a purchased lead
 */
export async function createDispute(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { orderId, leadId, vendorId, reason } = body;

    if (!orderId || !leadId || !reason) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const disputeId = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO vendor_disputes (id, order_id, buyer_id, vendor_id, lead_id, reason, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      disputeId,
      orderId,
      user.company_id,
      vendorId,
      leadId,
      reason,
      "open",
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    // Log audit
    await logAudit(env, user.id, "dispute_created", "vendor_dispute", { disputeId });

    return new Response(JSON.stringify({ success: true, disputeId }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Create dispute error:", error);
    return new Response(JSON.stringify({ error: "Failed to create dispute" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/admin/disputes/resolve
 * Admin resolves dispute using AI recommendation
 */
export async function resolveDispute(req: Request, env: Env, user: User) {
  try {
    // Check permission
    const allowed = await requirePermission(env, user.id, "admin.disputes.manage");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const { disputeId } = body;

    if (!disputeId) {
      return new Response(JSON.stringify({ error: "Missing disputeId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get dispute
    const dispute = await env.DB.prepare(
      "SELECT * FROM vendor_disputes WHERE id = ?"
    ).bind(disputeId).first();

    if (!dispute) {
      return new Response(JSON.stringify({ error: "Dispute not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get lead details
    const lead = await env.DB.prepare(
      "SELECT * FROM leads WHERE id = ?"
    ).bind(dispute.lead_id).first();

    // Get vendor details
    const vendor = await env.DB.prepare(
      "SELECT * FROM companies WHERE id = ?"
    ).bind(dispute.vendor_id).first();

    // Get AI recommendation
    const aiAnalysis = await analyzeDispute(env, dispute, lead || {}, vendor || {});

    // Determine new status
    let newStatus = "under_review";
    if (aiAnalysis.decision === "approved_refund") {
      newStatus = "approved_refund";
    } else if (aiAnalysis.decision === "replacement") {
      newStatus = "replaced";
    } else if (aiAnalysis.decision === "rejected") {
      newStatus = "rejected";
    }

    // Update dispute
    await env.DB.prepare(
      `UPDATE vendor_disputes
       SET status = ?, resolution = ?, ai_recommendation = ?, updated_at = ?
       WHERE id = ?`
    ).bind(
      newStatus,
      aiAnalysis.reason,
      JSON.stringify(aiAnalysis),
      new Date().toISOString(),
      disputeId
    ).run();

    // Log audit
    await logAudit(env, user.id, "dispute_resolved", "vendor_dispute", {
      disputeId,
      decision: aiAnalysis.decision,
      vendorImpact: aiAnalysis.vendorImpact
    });

    return new Response(JSON.stringify({
      success: true,
      decision: aiAnalysis.decision,
      status: newStatus,
      reason: aiAnalysis.reason,
      vendorImpact: aiAnalysis.vendorImpact
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Resolve dispute error:", error);
    return new Response(JSON.stringify({ error: "Failed to resolve dispute" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/admin/disputes
 * List all disputes
 */
export async function listDisputes(req: Request, env: Env, user: User) {
  try {
    const allowed = await requirePermission(env, user.id, "admin.disputes.view");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const disputes = await env.DB.prepare(
      "SELECT * FROM vendor_disputes ORDER BY created_at DESC LIMIT 100"
    ).all();

    return new Response(JSON.stringify(disputes.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("List disputes error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch disputes" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
