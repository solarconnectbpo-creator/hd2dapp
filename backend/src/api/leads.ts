/**
 * Leads API endpoints
 * AI-powered lead management with geocoding, analysis, and assignment
 */

import { geocodeAddress } from "../utils/geo";
import { analyzeLead } from "../ai/leadModel";

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
 * GET /api/leads
 * Retrieve all leads for the authenticated user
 */
export async function getLeads(req: Request, env: Env, user: User) {
  try {
    const leads = await env.DB.prepare(
      "SELECT * FROM leads ORDER BY created_at DESC"
    ).all();

    return new Response(JSON.stringify(leads.results), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get leads error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch leads" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/leads/create
 * Create a new lead with AI analysis and geocoding
 */
export async function createLead(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const id = crypto.randomUUID();

    if (!body.contactName || !body.phone) {
      return new Response(JSON.stringify({ error: "Missing contact name or phone" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Geocode the address
    const geo = body.location ? await geocodeAddress(body.location, env) : { lat: null, lon: null };

    // Run AI analysis
    const ai = await analyzeLead(env, body);

    // Insert into database
    await env.DB.prepare(
      `INSERT INTO leads (
        id, contact_name, phone, email, industry,
        location, city, latitude, longitude, price,
        quality_score, lead_type, notes, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.contactName,
      body.phone,
      body.email || null,
      ai.industry || body.industry,
      body.location || null,
      body.city || null,
      geo.lat || null,
      geo.lon || null,
      body.price || null,
      ai.score || 50,
      body.leadType || "local-exclusive",
      body.notes || ai.summary,
      null
    ).run();

    return new Response(JSON.stringify({
      id,
      score: ai.score,
      summary: ai.summary,
      predictedObjections: ai.predictedObjections,
      recommendedActions: ai.recommendedActions
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Create lead error:", error);
    return new Response(JSON.stringify({ error: "Failed to create lead" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/leads/:id
 * Retrieve a specific lead by ID
 */
export async function getLead(req: Request, env: Env, user: User, leadId: string) {
  try {
    const lead = await env.DB.prepare(
      "SELECT * FROM leads WHERE id = ?"
    ).bind(leadId).first();

    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(lead), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get lead error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch lead" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/leads/assign
 * Assign a lead to a sales representative
 */
export async function assignLead(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { leadId, repId } = body;

    if (!leadId || !repId) {
      return new Response(JSON.stringify({ error: "Missing leadId or repId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await env.DB.prepare(
      "UPDATE leads SET assigned_to = ? WHERE id = ?"
    ).bind(repId, leadId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Assign lead error:", error);
    return new Response(JSON.stringify({ error: "Failed to assign lead" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/leads/import
 * Batch import multiple leads with AI analysis
 */
export async function importLeads(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { leads } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return new Response(JSON.stringify({ error: "No leads to import" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let count = 0;

    for (const row of leads) {
      try {
        const id = crypto.randomUUID();
        const geo = row.location ? await geocodeAddress(row.location, env) : { lat: null, lon: null };
        const ai = await analyzeLead(env, row);

        await env.DB.prepare(
          `INSERT INTO leads (id, contact_name, phone, email, industry, location, city, latitude,
           longitude, price, quality_score, lead_type, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          id,
          row.contactName,
          row.phone,
          row.email || "",
          ai.industry || row.industry,
          row.location,
          row.city,
          geo.lat || null,
          geo.lon || null,
          row.price || null,
          ai.score,
          row.leadType || "local-exclusive",
          row.notes || ai.summary
        ).run();

        count++;
      } catch (error) {
        console.error("Error importing lead:", error);
        continue;
      }
    }

    return new Response(JSON.stringify({ success: true, count }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Import leads error:", error);
    return new Response(JSON.stringify({ error: "Failed to import leads" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
