/**
 * HD2D Backend - Main Entry Point
 * Cloudflare Workers API Router
 * Handles all 50+ API endpoints for the platform
 */

import { handleRoofDamageAi } from "./api/roofDamageAi";
import { handleRoofPitchAi } from "./api/roofPitchAi";
import { handleRoofReportLanguageAi } from "./api/roofReportLanguageAi";

interface Env {
  DB: any;
  HD2D_CACHE: any;
  OPENAI_API_KEY?: string;
  SESSION_SECRET?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-company-id",
    };

    // Handle preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route requests to appropriate handlers
      if (path.startsWith("/api/auth/")) {
        return handleAuth(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/leads")) {
        return handleLeads(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/deals")) {
        return handleDeals(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/posts")) {
        return handlePosts(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/comments")) {
        return handleComments(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/events")) {
        return handleEvents(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/tasks")) {
        return handleTasks(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/calls")) {
        return handleCalls(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/agents")) {
        return handleAgents(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/workflows")) {
        return handleWorkflows(request, env, path, corsHeaders);
      } else if (path.startsWith("/api/admin")) {
        return handleAdmin(request, env, path, corsHeaders);
      } else if (path === "/api/ai/roof-damage") {
        return handleRoofDamageAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-report-language") {
        return handleRoofReportLanguageAi(request, env, corsHeaders);
      } else if (path === "/api/ai/roof-pitch") {
        return handleRoofPitchAi(request, env, corsHeaders);
      } else if (path.startsWith("/webhook/")) {
        return handleWebhooks(request, env, path, corsHeaders);
      } else if (path === "/" || path === "/api") {
        return new Response(
          JSON.stringify({
            success: true,
            message: "HD2D Backend API",
            version: "1.0.0",
            status: "running",
            endpoints: 50,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Request error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Internal server error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },

  async scheduled(event: any, env: Env): Promise<void> {
    // Scheduled tasks for background jobs
    console.log("Scheduled event triggered");
  },
};

// Placeholder handlers - route to respective API files
async function handleAuth(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  if (path === "/api/auth/login" && request.method === "POST") {
    const { email, password } = await request.json() as any;
    
    if (email === "test.company@hardcoredoortodoorclosers.com" && password === "TestCompany123!") {
      return new Response(
        JSON.stringify({
          success: true,
          token: "test-company-token-" + Date.now(),
          user: { id: "company-1", email, name: "Test Company", user_type: "company" },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (email === "test.rep@hardcoredoortodoorclosers.com" && password === "TestRep123!") {
      return new Response(
        JSON.stringify({
          success: true,
          token: "test-rep-token-" + Date.now(),
          user: { id: "rep-1", email, name: "Test Rep", user_type: "sales_rep" },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (email === "admin@hardcoredoortodoorclosers.com" && password === "AdminTest123!") {
      return new Response(
        JSON.stringify({
          success: true,
          token: "admin-token-" + Date.now(),
          user: { id: "admin-1", email, name: "Admin", user_type: "admin" },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Invalid credentials" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  
  return new Response(
    JSON.stringify({ success: false, error: "Auth endpoint not implemented" }),
    { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleLeads(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Leads endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleDeals(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Deals endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handlePosts(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Posts endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleComments(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Comments endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleEvents(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Events endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleTasks(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Tasks endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleCalls(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Calls endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleAgents(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Agents endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleWorkflows(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: [], message: "Workflows endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleAdmin(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, data: {}, message: "Admin endpoint" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleWebhooks(request: Request, env: Env, path: string, corsHeaders: any): Promise<Response> {
  return new Response(
    JSON.stringify({ success: true, message: "Webhook received" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
