// Cloudflare Worker Template for HD2D Inbound Agents
// Deploy to: https://dash.cloudflare.com/2b2f31d4f2fd46db5be5d72e772ecac5/hardcoredoortodoorclosers.com/workers/routes

export default {
  async fetch(request, env) {
    // Only accept POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Verify webhook signature
    const signature = request.headers.get("X-Webhook-Signature");
    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    try {
      const payload = await request.json();

      // Log to Cloudflare Analytics Engine
      await env.ANALYTICS.writeDataPoint({
        indexes: [payload.agentId, payload.type],
        blobs: [
          payload.callId,
          payload.fromNumber,
          payload.toNumber,
          payload.transcript || "",
        ],
        doubles: [payload.duration || 0],
      });

      // Store call record in KV (Cloudflare Workers KV Storage)
      const callKey = `call-${payload.callId}`;
      await env.HD2D_CALLS.put(
        callKey,
        JSON.stringify({
          ...payload,
          processedAt: new Date().toISOString(),
        }),
        { expirationTtl: 86400 * 30 }, // 30 days
      );

      // Process based on call type
      switch (payload.type) {
        case "incoming":
          await handleIncomingCall(payload, env);
          break;
        case "connected":
          await handleConnectedCall(payload, env);
          break;
        case "ended":
          await handleEndedCall(payload, env);
          break;
      }

      return new Response(
        JSON.stringify({
          success: true,
          callId: payload.callId,
          processedAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};

async function handleIncomingCall(payload, env) {
  // Called when inbound call arrives
  console.log("Incoming call:", payload.fromNumber, "→", payload.toNumber);
  // Add custom logic: notify team, route to correct agent, etc.
}

async function handleConnectedCall(payload, env) {
  // Called when call connects to agent
  console.log("Connected call:", payload.callId);
  // Add custom logic: start recording, track agent availability, etc.
}

async function handleEndedCall(payload, env) {
  // Called when call ends
  console.log("Ended call:", payload.callId, "Duration:", payload.duration);
  // Add custom logic: save transcript, update metrics, trigger follow-up, etc.
}
