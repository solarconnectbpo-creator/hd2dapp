/**
 * Inbound Call API endpoints
 * SimpleTalk webhook integration for AI-powered call center
 */

import { analyzeCall } from "../ai/callModel";
import { routeCall } from "../utils/callRouter";
import { setCallState, getCallState } from "../utils/callState";

interface Env {
  DB: any;
  HD2D_CACHE: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface SimpleTalkEvent {
  event: string;
  callId: string;
  fromNumber: string;
  toNumber: string;
  transcript?: string;
  summary?: string;
  appointment?: any;
}

/**
 * POST /webhook/simpletalk/inbound
 * Main webhook entry point for SimpleTalk AI events
 */
export async function handleSimpleTalkWebhook(req: Request, env: Env) {
  try {
    const body = await req.json();
    const event: SimpleTalkEvent = body;

    const callId = event.callId;

    // Get or create call state
    let state = (await getCallState(env, callId)) || {
      id: callId,
      from: event.fromNumber,
      to: event.toNumber,
      status: "incoming",
      agentId: null,
    };

    // ===== CALL STARTED =====
    if (event.event === "call_started") {
      state.intent = "general";

      // Route to best agent
      const agent = await routeCall(env, event.fromNumber, state.intent);
      if (agent) {
        state.agentId = agent.id;

        // Update agent status
        await env.DB.prepare(
          "UPDATE agents SET status = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?",
        )
          .bind("handling_call", agent.id)
          .run();
      }

      state.status = "ringing";
      await setCallState(env, callId, state);

      return new Response(JSON.stringify({ action: "ROUTE_CALL", agent }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== CALL CONNECTED =====
    if (event.event === "call_connected") {
      state.status = "connected";
      await setCallState(env, callId, state);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== TRANSCRIPT SLICE RECEIVED =====
    if (event.event === "transcript") {
      state.transcript =
        (state.transcript || "") + "\n" + (event.transcript || "");
      await setCallState(env, callId, state);

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== SUMMARY FROM SIMPLETALK =====
    if (event.event === "summary") {
      state.summary = event.summary;

      // AI analyze call
      const ai = await analyzeCall(env, state.transcript || "");

      state.intent = ai.intent;
      state.aiSummary = ai.summary;
      state.sentiment = ai.sentiment;

      await setCallState(env, callId, state);

      // Insert into database
      await env.DB.prepare(
        `INSERT INTO inbound_calls (id, agent_id, from_number, to_number, status, transcript, summary, intent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          callId,
          state.agentId || null,
          state.from,
          state.to,
          "connected",
          state.transcript || "",
          ai.summary,
          ai.intent,
        )
        .run();

      return new Response(
        JSON.stringify({
          ai,
          nextAction: ai.recommendedNextAction,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // ===== CALL ENDED =====
    if (event.event === "call_ended") {
      state.status = "ended";

      // Mark agent as available again
      if (state.agentId) {
        await env.DB.prepare("UPDATE agents SET status = ? WHERE id = ?")
          .bind("online", state.agentId)
          .run();
      }

      // Update call record with final status
      await env.DB.prepare("UPDATE inbound_calls SET status = ? WHERE id = ?")
        .bind("ended", callId)
        .run();

      await setCallState(env, callId, state);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown event type" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SimpleTalk webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook processing failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * GET /api/calls/:callId
 * Get call details
 */
export async function getCall(req: Request, env: Env, callId: string) {
  try {
    const call = await env.DB.prepare(
      "SELECT * FROM inbound_calls WHERE id = ?",
    )
      .bind(callId)
      .first();

    if (!call) {
      return new Response(JSON.stringify({ error: "Call not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(call), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get call error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch call" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/calls
 * List all calls
 */
export async function listCalls(req: Request, env: Env) {
  try {
    const calls = await env.DB.prepare(
      "SELECT * FROM inbound_calls ORDER BY created_at DESC LIMIT 100",
    ).all();

    return new Response(JSON.stringify(calls.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List calls error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch calls" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /api/agents
 * Register or update agent
 */
export async function registerAgent(req: Request, env: Env) {
  try {
    const body = await req.json();
    const { id, name, skills, webhookUrl } = body;

    if (!id || !name) {
      return new Response(JSON.stringify({ error: "Missing id or name" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if agent exists
    const existing = await env.DB.prepare("SELECT * FROM agents WHERE id = ?")
      .bind(id)
      .first();

    if (existing) {
      // Update existing agent
      await env.DB.prepare(
        `UPDATE agents SET name = ?, skills = ?, webhook_url = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?`,
      )
        .bind(name, skills || "", webhookUrl || "", id)
        .run();
    } else {
      // Insert new agent
      await env.DB.prepare(
        `INSERT INTO agents (id, name, status, skills, webhook_url, last_active)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      )
        .bind(id, name, "online", skills || "", webhookUrl || "")
        .run();
    }

    return new Response(JSON.stringify({ success: true, agentId: id }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Register agent error:", error);
    return new Response(JSON.stringify({ error: "Failed to register agent" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /api/agents
 * List all agents
 */
export async function listAgents(req: Request, env: Env) {
  try {
    const agents = await env.DB.prepare(
      "SELECT id, name, status, skills, last_active FROM agents ORDER BY last_active DESC",
    ).all();

    return new Response(JSON.stringify(agents.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("List agents error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch agents" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
