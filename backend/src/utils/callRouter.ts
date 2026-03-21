/**
 * AI-powered call routing engine
 * Skills-based and availability-based routing
 */

interface Agent {
  id: string;
  name: string;
  status: string;
  skills: string;
  last_active: string;
  webhook_url?: string;
}

interface Env {
  DB: any;
  [key: string]: any;
}

export async function routeCall(
  env: Env,
  fromNumber: string,
  intent: string
): Promise<Agent | null> {
  try {
    // Get all online agents
    const result = await env.DB.prepare(
      "SELECT * FROM agents WHERE status = 'online' OR status = 'available'"
    ).all();

    const agents = result.results || [];

    if (!agents || agents.length === 0) {
      console.warn("No online agents available");
      return null;
    }

    // 1. Try skill-based matching
    const skillAgents = agents.filter((a: Agent) =>
      a.skills && a.skills.toLowerCase().includes(intent.toLowerCase())
    );

    if (skillAgents.length > 0) {
      // Return random agent from skill matches
      return skillAgents[Math.floor(Math.random() * skillAgents.length)];
    }

    // 2. Fall back to least recently active agent
    const sortedAgents = agents.sort((a: Agent, b: Agent) => {
      const aTime = new Date(a.last_active || 0).getTime();
      const bTime = new Date(b.last_active || 0).getTime();
      return aTime - bTime;
    });

    return sortedAgents[0] || null;
  } catch (error) {
    console.error("Error routing call:", error);
    return null;
  }
}

export async function getAgent(env: Env, agentId: string): Promise<Agent | null> {
  try {
    const agent = await env.DB.prepare(
      "SELECT * FROM agents WHERE id = ?"
    ).bind(agentId).first();

    return agent || null;
  } catch (error) {
    console.error("Error getting agent:", error);
    return null;
  }
}
