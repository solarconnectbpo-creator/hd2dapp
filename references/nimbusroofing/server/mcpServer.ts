/**
 * Model Context Protocol (MCP) Server
 * Standardizes how LLMs interact with Nimbus IQ AI agents
 * 
 * Three Core Components:
 * 1. Data (resources) - Structured data sources
 * 2. Interactive Templates (prompts) - Reusable prompt templates
 * 3. Actionable Functions (tools) - Executable functions
 */

import { invokeLLM } from "./_core/llm";
import { getFlywheelMetrics } from "./dataFlywheel";
import { validateXactimateEstimate, type XactimateEstimate } from "./xactimateValidator";

/**
 * MCP Resource - Data sources that agents can access
 */
export interface MCPResource {
  id: string;
  name: string;
  description: string;
  type: "database" | "api" | "file" | "realtime";
  schema?: Record<string, any>;
  getData: () => Promise<any>;
}

/**
 * MCP Prompt Template - Reusable prompts for common tasks
 */
export interface MCPPromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
  exampleUsage: string;
}

/**
 * MCP Tool - Executable functions that agents can call
 */
export interface MCPTool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required: boolean;
  }>;
  execute: (params: Record<string, any>) => Promise<any>;
}

/**
 * MCP Server Configuration
 */
export class MCPServer {
  private resources: Map<string, MCPResource> = new Map();
  private promptTemplates: Map<string, MCPPromptTemplate> = new Map();
  private tools: Map<string, MCPTool> = new Map();

  constructor() {
    this.registerDefaultResources();
    this.registerDefaultPromptTemplates();
    this.registerDefaultTools();
  }

  /**
   * Register default data resources
   */
  private registerDefaultResources() {
    // Resource 1: Flywheel Metrics
    this.registerResource({
      id: "flywheel_metrics",
      name: "Data Flywheel Metrics",
      description: "Real-time metrics from the Self-Reinforcing Data Flywheel",
      type: "realtime",
      getData: async () => {
        return await getFlywheelMetrics();
      }
    });

    // Resource 2: Building Codes Database
    this.registerResource({
      id: "building_codes",
      name: "Texas Building Codes",
      description: "Complete Texas building code database for McKinney, Collin County",
      type: "database",
      getData: async () => {
        const { TEXAS_BUILDING_CODES } = await import("./xactimateValidator");
        return TEXAS_BUILDING_CODES;
      }
    });

    // Resource 3: Nimbus Knowledge Base
    this.registerResource({
      id: "knowledge_base",
      name: "Nimbus Knowledge Base",
      description: "Proprietary roofing knowledge including services, cities, keywords",
      type: "database",
      getData: async () => {
        const { NIMBUS_KNOWLEDGE } = await import("./nimbusKnowledgeBase");
        return NIMBUS_KNOWLEDGE;
      }
    });

    // Resource 4: Customer Reviews
    this.registerResource({
      id: "customer_reviews",
      name: "Customer Reviews",
      description: "154 verified Google reviews (4.9 rating)",
      type: "database",
      getData: async () => {
        // In production, fetch from database
        return {
          totalReviews: 154,
          averageRating: 4.9,
          recentReviews: []
        };
      }
    });
  }

  /**
   * Register default prompt templates
   */
  private registerDefaultPromptTemplates() {
    // Template 1: Roof Inspection Analysis
    this.registerPromptTemplate({
      id: "roof_inspection_analysis",
      name: "Roof Inspection Analysis",
      description: "Analyze roof photos and generate damage assessment",
      template: `You are SATCALC, the Roof Math Monster - a satellite/drone measurement analyst with 20 years of supplement experience.

TASK: Analyze these roof inspection photos and provide a detailed damage assessment.

PHOTOS: {{photos}}
PROJECT CONTEXT: {{projectContext}}

Your analysis must include:
1. Roof measurements (total squares, pitch, complexity)
2. Damage identification (hail, wind, age-related)
3. Material recommendations
4. Waste factor calculations
5. Line-item breakdown for Xactimate
6. Estimated supplement value

Be aggressive and thorough - insurance adjusters love to lowball. Catch every square foot they try to skip.`,
      variables: ["photos", "projectContext"],
      exampleUsage: "Use this template to analyze uploaded roof photos and generate supplement reports"
    });

    // Template 2: SEO Content Generation
    this.registerPromptTemplate({
      id: "seo_content_generation",
      name: "SEO Content Generation",
      description: "Generate SEO-optimized roofing content",
      template: `You are an SEO content expert specializing in roofing services in McKinney, Texas.

TASK: Generate a comprehensive, SEO-optimized article.

TOPIC: {{topic}}
TARGET KEYWORDS: {{keywords}}
CITY: {{city}}
NIMBUS KNOWLEDGE: {{nimbusKnowledge}}

Requirements:
- 1,500-2,000 words
- Include proprietary Nimbus data (99.7% AR accuracy, $4,200+ supplement value)
- Target keyword density: 1-2%
- Include H2 and H3 headings
- Add FAQ section
- Include clear CTA

Write in a professional, authoritative tone that establishes Nimbus as the local expert.`,
      variables: ["topic", "keywords", "city", "nimbusKnowledge"],
      exampleUsage: "Use this template to generate blog posts and landing pages"
    });

    // Template 3: Customer Service Response
    this.registerPromptTemplate({
      id: "customer_service_response",
      name: "Customer Service Response",
      description: "Generate empathetic, helpful customer service responses",
      template: `You are a Nimbus Roofing customer service representative.

CUSTOMER INQUIRY: {{inquiry}}
CUSTOMER CONTEXT: {{customerContext}}

Generate a helpful, empathetic response that:
1. Acknowledges their concern
2. Provides clear next steps
3. Offers Nimbus's unique value (AI technology, 99.7% accuracy, etc.)
4. Includes a clear CTA (schedule inspection, call, etc.)

Tone: Professional, warm, solution-oriented`,
      variables: ["inquiry", "customerContext"],
      exampleUsage: "Use this template for email and chat responses"
    });

    // Template 4: Insurance Supplement Generation
    this.registerPromptTemplate({
      id: "insurance_supplement",
      name: "Insurance Supplement Generation",
      description: "Generate aggressive insurance supplement with line-item justifications",
      template: `You are SATCALC, the supplement ninja. Generate an insurance supplement that maximizes claim value.

INSPECTION DATA: {{inspectionData}}
ADJUSTER ESTIMATE: {{adjusterEstimate}}
BUILDING CODES: {{buildingCodes}}

Your supplement must include:
1. Line-by-line comparison (adjuster vs. actual)
2. Code compliance justifications
3. Waste factor calculations with explanations
4. Hidden damage items the adjuster missed
5. Total additional value with breakdown

Be aggressive but justified. Every line item needs a code reference or measurement backing it up.`,
      variables: ["inspectionData", "adjusterEstimate", "buildingCodes"],
      exampleUsage: "Use this template to generate insurance supplements"
    });
  }

  /**
   * Register default tools
   */
  private registerDefaultTools() {
    // Tool 1: Validate Xactimate Estimate
    this.registerTool({
      id: "validate_xactimate",
      name: "Validate Xactimate Estimate",
      description: "Cross-check Xactimate XML against Texas building codes",
      parameters: {
        estimate: {
          type: "object",
          description: "Xactimate estimate object",
          required: true
        }
      },
      execute: async (params) => {
        const estimate = params.estimate as XactimateEstimate;
        return await validateXactimateEstimate(estimate);
      }
    });

    // Tool 2: Generate SEO Content
    this.registerTool({
      id: "generate_seo_content",
      name: "Generate SEO Content",
      description: "Generate SEO-optimized roofing content using Gemini",
      parameters: {
        topic: {
          type: "string",
          description: "Content topic",
          required: true
        },
        keywords: {
          type: "array",
          description: "Target keywords",
          required: true
        },
        city: {
          type: "string",
          description: "Target city",
          required: false
        }
      },
      execute: async (params) => {
        const template = this.getPromptTemplate("seo_content_generation");
        if (!template) throw new Error("Template not found");

        const nimbusKnowledge = await this.getResource("knowledge_base");
        
        const prompt = template.template
          .replace("{{topic}}", params.topic as string)
          .replace("{{keywords}}", (params.keywords as string[]).join(", "))
          .replace("{{city}}", (params.city as string) || "McKinney")
          .replace("{{nimbusKnowledge}}", JSON.stringify(nimbusKnowledge, null, 2));

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are an SEO content expert." },
            { role: "user", content: prompt }
          ]
        });

        return response.choices[0].message.content;
      }
    });

    // Tool 3: Analyze Roof Photos
    this.registerTool({
      id: "analyze_roof_photos",
      name: "Analyze Roof Photos",
      description: "Use Gemini Vision to analyze roof inspection photos",
      parameters: {
        photoUrls: {
          type: "array",
          description: "Array of photo URLs",
          required: true
        },
        projectContext: {
          type: "object",
          description: "Project context (address, customer, etc.)",
          required: false
        }
      },
      execute: async (params) => {
        const template = this.getPromptTemplate("roof_inspection_analysis");
        if (!template) throw new Error("Template not found");

        const photoUrls = params.photoUrls as string[];
        const projectContext = params.projectContext || {};

        const prompt = template.template
          .replace("{{photos}}", photoUrls.join(", "))
          .replace("{{projectContext}}", JSON.stringify(projectContext, null, 2));

        // In production, this would use Gemini Vision API with actual images
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are SATCALC, the Roof Math Monster." },
            { role: "user", content: prompt }
          ]
        });

        return response.choices[0].message.content;
      }
    });

    // Tool 4: Get Flywheel Metrics
    this.registerTool({
      id: "get_flywheel_metrics",
      name: "Get Flywheel Metrics",
      description: "Retrieve current Data Flywheel metrics",
      parameters: {},
      execute: async () => {
        return await getFlywheelMetrics();
      }
    });
  }

  /**
   * Register a new resource
   */
  registerResource(resource: MCPResource) {
    this.resources.set(resource.id, resource);
  }

  /**
   * Register a new prompt template
   */
  registerPromptTemplate(template: MCPPromptTemplate) {
    this.promptTemplates.set(template.id, template);
  }

  /**
   * Register a new tool
   */
  registerTool(tool: MCPTool) {
    this.tools.set(tool.id, tool);
  }

  /**
   * Get a resource by ID
   */
  async getResource(id: string): Promise<any> {
    const resource = this.resources.get(id);
    if (!resource) {
      throw new Error(`Resource not found: ${id}`);
    }
    return await resource.getData();
  }

  /**
   * Get a prompt template by ID
   */
  getPromptTemplate(id: string): MCPPromptTemplate | undefined {
    return this.promptTemplates.get(id);
  }

  /**
   * Execute a tool by ID
   */
  async executeTool(id: string, params: Record<string, any>): Promise<any> {
    const tool = this.tools.get(id);
    if (!tool) {
      throw new Error(`Tool not found: ${id}`);
    }
    return await tool.execute(params);
  }

  /**
   * List all available resources
   */
  listResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  /**
   * List all available prompt templates
   */
  listPromptTemplates(): MCPPromptTemplate[] {
    return Array.from(this.promptTemplates.values());
  }

  /**
   * List all available tools
   */
  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }
}

/**
 * Global MCP Server instance
 */
export const mcpServer = new MCPServer();

/**
 * Agent Registry - Maps agents to their primary MCP components
 */
export const AGENT_REGISTRY = {
  "insurance_claims_agent": {
    name: "Insurance Claims Agent",
    description: "Analyzes roof damage and generates aggressive insurance supplements",
    primaryComponents: {
      data: ["building_codes", "knowledge_base"],
      templates: ["roof_inspection_analysis", "insurance_supplement"],
      tools: ["analyze_roof_photos", "validate_xactimate"]
    }
  },
  "customer_service_agent": {
    name: "Customer Service Agent",
    description: "Handles customer inquiries with empathy and expertise",
    primaryComponents: {
      data: ["knowledge_base", "customer_reviews"],
      templates: ["customer_service_response"],
      tools: ["get_flywheel_metrics"]
    }
  },
  "seo_content_agent": {
    name: "SEO Content Agent",
    description: "Generates SEO-optimized content using proprietary data",
    primaryComponents: {
      data: ["knowledge_base", "flywheel_metrics"],
      templates: ["seo_content_generation"],
      tools: ["generate_seo_content"]
    }
  },
  "satcalc_agent": {
    name: "SATCALC (Roof Math Monster)",
    description: "Aggressive supplement generation with satellite/drone analysis",
    primaryComponents: {
      data: ["building_codes"],
      templates: ["roof_inspection_analysis", "insurance_supplement"],
      tools: ["analyze_roof_photos", "validate_xactimate"]
    }
  }
};
