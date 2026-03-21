/**
 * Real-time call state management using Cloudflare KV
 * Persists call state across webhook events
 */

interface CallState {
  id: string;
  from: string;
  to: string;
  status: string;
  agentId: string | null;
  intent?: string;
  transcript?: string;
  summary?: string;
  aiSummary?: string;
  [key: string]: any;
}

interface Env {
  HD2D_CACHE: any;
  [key: string]: any;
}

export async function setCallState(env: Env, callId: string, state: CallState): Promise<void> {
  try {
    await env.HD2D_CACHE.put(`call:${callId}`, JSON.stringify(state), {
      expirationTtl: 3600
    });
  } catch (error) {
    console.error("Error setting call state:", error);
    throw error;
  }
}

export async function getCallState(env: Env, callId: string): Promise<CallState | null> {
  try {
    const raw = await env.HD2D_CACHE.get(`call:${callId}`);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Error getting call state:", error);
    return null;
  }
}

export async function deleteCallState(env: Env, callId: string): Promise<void> {
  try {
    await env.HD2D_CACHE.delete(`call:${callId}`);
  } catch (error) {
    console.error("Error deleting call state:", error);
  }
}
