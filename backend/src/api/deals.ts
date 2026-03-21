/**
 * Deals API endpoints
 * Enterprise-grade CRM pipeline with AI forecasting
 */

import { evaluateDeal } from "../ai/dealModel";

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

/**
 * GET /api/deals
 * Retrieve all deals in the pipeline
 */
export async function getDeals(req: Request, env: Env, user: User) {
  try {
    const deals = await env.DB.prepare(
      "SELECT * FROM deals ORDER BY created_at DESC"
    ).all();

    return new Response(JSON.stringify(deals.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get deals error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch deals" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/deals/create
 * Create a new deal with AI forecasting
 */
export async function createDeal(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const id = crypto.randomUUID();

    if (!body.contactName || !body.value) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // AI forecasting
    const ai = await evaluateDeal(env, body);

    // Insert into database
    await env.DB.prepare(
      `INSERT INTO deals (
        id, contact_name, company, value, stage, probability,
        phone, email, notes, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.contactName,
      body.company || "",
      body.value,
      body.stage || "new",
      ai.probability,
      body.phone || "",
      body.email || "",
      ai.summary,
      user.id
    ).run();

    return new Response(JSON.stringify({
      id,
      probability: ai.probability,
      summary: ai.summary,
      stageRecommendation: ai.stageRecommendation,
      nextActions: ai.nextActions
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Create deal error:", error);
    return new Response(JSON.stringify({ error: "Failed to create deal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/deals/:id
 * Retrieve a specific deal by ID
 */
export async function getDeal(req: Request, env: Env, user: User, dealId: string) {
  try {
    const deal = await env.DB.prepare(
      "SELECT * FROM deals WHERE id = ?"
    ).bind(dealId).first();

    if (!deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(deal), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get deal error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch deal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/deals/update-stage
 * Update deal stage with AI re-evaluation
 */
export async function updateDealStage(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { dealId, stage } = body;

    if (!dealId || !stage) {
      return new Response(JSON.stringify({ error: "Missing dealId or stage" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get current deal
    const deal = await env.DB.prepare(
      "SELECT * FROM deals WHERE id = ?"
    ).bind(dealId).first();

    if (!deal) {
      return new Response(JSON.stringify({ error: "Deal not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update deal stage
    deal.stage = stage;

    // Re-evaluate with AI
    const ai = await evaluateDeal(env, deal);

    // Update database
    await env.DB.prepare(
      "UPDATE deals SET stage = ?, probability = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(stage, ai.probability, dealId).run();

    return new Response(JSON.stringify({
      success: true,
      probability: ai.probability,
      recommendation: ai.stageRecommendation,
      nextActions: ai.nextActions
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Update deal stage error:", error);
    return new Response(JSON.stringify({ error: "Failed to update deal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/deals/forecast
 * Get pipeline forecast summary for dashboard
 */
export async function getForecasts(req: Request, env: Env, user: User) {
  try {
    const deals = await env.DB.prepare(
      "SELECT * FROM deals"
    ).all();

    const results = deals.results || [];
    const sum = results.reduce((acc: any, d: any) => {
      acc.total += d.value || 0;
      acc.weighted += ((d.value || 0) * (d.probability || 50)) / 100;
      return acc;
    }, { total: 0, weighted: 0 });

    return new Response(JSON.stringify({
      totalPipelineValue: sum.total,
      expectedRevenue: sum.weighted,
      dealCount: results.length,
      deals: results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get forecast error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch forecast" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
