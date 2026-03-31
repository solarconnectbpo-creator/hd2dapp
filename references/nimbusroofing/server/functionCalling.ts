/**
 * Function Calling & API Integration System
 * 
 * This module provides a comprehensive function calling architecture for AI agents,
 * enabling them to interact with external APIs, databases, and services.
 */

import { invokeLLM } from './_core/llm';
import { z } from 'zod';
import { 
  requestCallback, 
  initiateCall, 
  optInSMS, 
  sendInstantSMS,
  calculateLeadScore 
} from './callerFeatures';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

// ============================================================================
// FUNCTION REGISTRY
// ============================================================================

/**
 * Available functions that AI agents can call
 */
export const FUNCTION_REGISTRY: Record<string, FunctionDefinition> = {
  // Weather & Storm Detection
  get_weather_alerts: {
    name: 'get_weather_alerts',
    description: 'Get active weather alerts for a specific location from National Weather Service',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City and state (e.g., "McKinney, TX")',
        },
      },
      required: ['location'],
    },
  },

  // Roof Inspection & Analysis
  analyze_roof_damage: {
    name: 'analyze_roof_damage',
    description: 'Analyze roof photos using Gemini Vision AI to detect damage, measure areas, and estimate repair costs',
    parameters: {
      type: 'object',
      properties: {
        photo_urls: {
          type: 'string',
          description: 'Comma-separated list of roof photo URLs',
        },
        damage_type: {
          type: 'string',
          description: 'Type of damage to analyze',
          enum: ['hail', 'wind', 'leak', 'general'],
        },
      },
      required: ['photo_urls'],
    },
  },

  // Xactimate Integration
  validate_xactimate_estimate: {
    name: 'validate_xactimate_estimate',
    description: 'Validate Xactimate estimate against Texas building codes and flag discrepancies',
    parameters: {
      type: 'object',
      properties: {
        estimate_data: {
          type: 'string',
          description: 'JSON string of Xactimate estimate data',
        },
        location: {
          type: 'string',
          description: 'Property location (city, state)',
        },
      },
      required: ['estimate_data', 'location'],
    },
  },

  // Insurance Supplement Generation
  generate_supplement: {
    name: 'generate_supplement',
    description: 'Generate insurance supplement with line-item justifications based on inspection data',
    parameters: {
      type: 'object',
      properties: {
        inspection_data: {
          type: 'string',
          description: 'JSON string of roof inspection findings',
        },
        adjuster_estimate: {
          type: 'string',
          description: 'Original adjuster estimate amount',
        },
      },
      required: ['inspection_data'],
    },
  },

  // Lead Management
  create_lead: {
    name: 'create_lead',
    description: 'Create a new lead in the database from customer inquiry. IMPORTANT: You MUST collect the customer email address before calling this function. Do NOT call without email.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer name (REQUIRED)',
        },
        email: {
          type: 'string',
          description: 'Customer email address (REQUIRED - must ask for this before creating lead)',
        },
        phone: {
          type: 'string',
          description: 'Customer phone number',
        },
        message: {
          type: 'string',
          description: 'Customer inquiry message',
        },
        urgency: {
          type: 'string',
          description: 'Lead urgency level',
          enum: ['low', 'medium', 'high', 'emergency'],
        },
      },
      required: ['name', 'email', 'message'],
    },
  },

  // Caller Request Features
  request_callback: {
    name: 'request_callback',
    description: 'Schedule a callback request from the customer with preferred time. MUST collect email before scheduling.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer name',
        },
        phone: {
          type: 'string',
          description: 'Customer phone number',
        },
        email: {
          type: 'string',
          description: 'Customer email address (REQUIRED - for sending callback confirmation)',
        },
        preferred_time: {
          type: 'string',
          description: 'When they want to be called',
          enum: ['asap', 'morning', 'afternoon', 'evening', 'tomorrow'],
        },
        reason: {
          type: 'string',
          description: 'What they want to discuss',
        },
        urgency: {
          type: 'string',
          description: 'Urgency level',
          enum: ['low', 'medium', 'high', 'emergency'],
        },
      },
      required: ['name', 'phone', 'email', 'preferred_time', 'reason'],
    },
  },

  initiate_call: {
    name: 'initiate_call',
    description: 'Initiate an immediate call to the customer via Twilio (for emergency situations)',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Customer name',
        },
        phone: {
          type: 'string',
          description: 'Customer phone number to call',
        },
        reason: {
          type: 'string',
          description: 'Reason for immediate call (e.g., "emergency roof leak")',
        },
      },
      required: ['name', 'phone', 'reason'],
    },
  },

  opt_in_sms: {
    name: 'opt_in_sms',
    description: 'Opt the customer in to receive SMS updates and alerts',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Customer phone number',
        },
        name: {
          type: 'string',
          description: 'Customer name',
        },
        email: {
          type: 'string',
          description: 'Customer email (optional)',
        },
        message_types: {
          type: 'string',
          description: 'Comma-separated message types they want to receive',
          enum: ['alerts', 'promotions', 'reminders', 'updates', 'all'],
        },
      },
      required: ['phone', 'name'],
    },
  },

  send_instant_sms: {
    name: 'send_instant_sms',
    description: 'Send an instant SMS message to the customer (for urgent updates or confirmations)',
    parameters: {
      type: 'object',
      properties: {
        phone: {
          type: 'string',
          description: 'Customer phone number',
        },
        message: {
          type: 'string',
          description: 'SMS message content (max 160 characters)',
        },
      },
      required: ['phone', 'message'],
    },
  },

  // SEO Content Generation
  generate_seo_content: {
    name: 'generate_seo_content',
    description: 'Generate SEO-optimized blog content for specific topics and keywords',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'Content topic (e.g., "Hail Damage Roof Repair McKinney TX")',
        },
        keywords: {
          type: 'string',
          description: 'Comma-separated target keywords',
        },
        word_count: {
          type: 'string',
          description: 'Target word count',
          enum: ['500', '1000', '1500', '2000'],
        },
      },
      required: ['topic', 'keywords'],
    },
  },

  // Project Management
  get_project_status: {
    name: 'get_project_status',
    description: 'Get current status and details of a roofing project',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project ID or address',
        },
      },
      required: ['project_id'],
    },
  },

  // Pricing & Estimates
  calculate_roof_estimate: {
    name: 'calculate_roof_estimate',
    description: 'Calculate rough estimate for roof replacement based on square footage and material',
    parameters: {
      type: 'object',
      properties: {
        square_feet: {
          type: 'string',
          description: 'Roof area in square feet',
        },
        material: {
          type: 'string',
          description: 'Roofing material type',
          enum: ['asphalt_shingle', 'metal', 'tile', 'flat_tpo'],
        },
        stories: {
          type: 'string',
          description: 'Number of stories',
          enum: ['1', '2', '3'],
        },
      },
      required: ['square_feet', 'material'],
    },
  },

  // CompanyCam Integration
  sync_companycam_photos: {
    name: 'sync_companycam_photos',
    description: 'Sync roof inspection photos from CompanyCam for a specific project',
    parameters: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'CompanyCam project ID',
        },
      },
      required: ['project_id'],
    },
  },

  // Knowledge Base Search
  search_knowledge_base: {
    name: 'search_knowledge_base',
    description: 'Search Nimbus roofing knowledge base for specific information',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        category: {
          type: 'string',
          description: 'Knowledge category to search',
          enum: ['services', 'materials', 'building_codes', 'insurance', 'general'],
        },
      },
      required: ['query'],
    },
  },
};

// ============================================================================
// FUNCTION EXECUTION ENGINE
// ============================================================================

/**
 * Execute a function call with the given arguments
 */
export async function executeFunction(
  functionCall: FunctionCall
): Promise<FunctionResult> {
  const startTime = Date.now();

  try {
    console.log(`[Function Calling] Executing: ${functionCall.name}`, functionCall.arguments);

    // Route to appropriate handler
    let result: any;

    switch (functionCall.name) {
      case 'get_weather_alerts':
        result = await getWeatherAlerts(functionCall.arguments);
        break;

      case 'analyze_roof_damage':
        result = await analyzeRoofDamage(functionCall.arguments);
        break;

      case 'validate_xactimate_estimate':
        result = await validateXactimateEstimate(functionCall.arguments);
        break;

      case 'generate_supplement':
        result = await generateSupplement(functionCall.arguments);
        break;

      case 'create_lead':
        result = await createLead(functionCall.arguments);
        break;

      case 'request_callback':
        result = await requestCallback(functionCall.arguments);
        break;

      case 'initiate_call':
        result = await initiateCall(functionCall.arguments);
        break;

      case 'opt_in_sms':
        result = await optInSMS(functionCall.arguments);
        break;

      case 'send_instant_sms':
        result = await sendInstantSMS(functionCall.arguments);
        break;

      case 'generate_seo_content':
        result = await generateSEOContent(functionCall.arguments);
        break;

      case 'get_project_status':
        result = await getProjectStatus(functionCall.arguments);
        break;

      case 'calculate_roof_estimate':
        result = await calculateRoofEstimate(functionCall.arguments);
        break;

      case 'sync_companycam_photos':
        result = await syncCompanyCamPhotos(functionCall.arguments);
        break;

      case 'search_knowledge_base':
        result = await searchKnowledgeBase(functionCall.arguments);
        break;

      default:
        throw new Error(`Unknown function: ${functionCall.name}`);
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: result,
      executionTime,
    };
  } catch (error: any) {
    const executionTime = Date.now() - startTime;

    console.error(`[Function Calling] Error executing ${functionCall.name}:`, error);

    return {
      success: false,
      error: error.message || 'Unknown error',
      executionTime,
    };
  }
}

// ============================================================================
// FUNCTION IMPLEMENTATIONS
// ============================================================================

async function getWeatherAlerts(args: { location: string }) {
  // Import weather service
  const { checkForStormAlerts } = await import('./weatherMonitoringService');
  
  const alerts = await checkForStormAlerts();
  
  return {
    location: args.location,
    alerts: alerts.filter((alert: any) => 
      alert.areaDesc?.includes('Collin') || alert.areaDesc?.includes('McKinney')
    ),
    timestamp: new Date().toISOString(),
  };
}

async function analyzeRoofDamage(args: { photo_urls: string; damage_type?: string }) {
  const photoUrls = args.photo_urls.split(',').map(url => url.trim());
  
  // Use Gemini Vision for photo analysis
  const prompt = `Analyze these roof inspection photos for ${args.damage_type || 'general'} damage. 
  
  Provide a detailed assessment including:
  1. Damage severity (minor, moderate, severe)
  2. Affected areas and square footage estimates
  3. Specific damage types identified
  4. Recommended repairs
  5. Estimated repair cost range
  
  Be specific and technical in your analysis.`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...photoUrls.map(url => ({
            type: 'image_url' as const,
            image_url: { url, detail: 'high' as const },
          })),
        ],
      },
    ],
  });

  return {
    analysis: response.choices[0].message.content,
    photos_analyzed: photoUrls.length,
    damage_type: args.damage_type || 'general',
  };
}

async function validateXactimateEstimate(args: { estimate_data: string; location: string }) {
  const { validateEstimate } = await import('./xactimateValidator');
  
  const estimateData = JSON.parse(args.estimate_data);
  const validation = await validateEstimate(estimateData, args.location);
  
  return validation;
}

async function generateSupplement(args: { inspection_data: string; adjuster_estimate?: string }) {
  const inspectionData = JSON.parse(args.inspection_data);
  
  const prompt = `Generate a detailed insurance supplement based on this roof inspection data:

${JSON.stringify(inspectionData, null, 2)}

${args.adjuster_estimate ? `Original adjuster estimate: $${args.adjuster_estimate}` : ''}

Create a line-item supplement with:
1. Each additional item needed
2. Xactimate line code
3. Quantity and unit
4. Unit price
5. Justification referencing building codes or industry standards

Be aggressive but justified. Focus on items the adjuster likely missed.`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are SATCALC, an expert insurance supplement generator. Be aggressive but justified.' },
      { role: 'user', content: prompt },
    ],
  });

  return {
    supplement: response.choices[0].message.content,
    original_estimate: args.adjuster_estimate,
  };
}

async function createLead(args: { name: string; email?: string; phone?: string; message: string; urgency?: string }) {
  const { getDb } = await import('./db');
  const { leads } = await import('../drizzle/schema');
  
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(leads).values({
    name: args.name,
    email: args.email || null,
    phone: args.phone || null,
    message: args.message,
    urgency: (args.urgency as any) || 'medium',
    source: 'AI Agent',
    status: 'new',
  });

  return {
    lead_id: (result as any).insertId,
    name: args.name,
    urgency: args.urgency || 'medium',
    created_at: new Date().toISOString(),
  };
}

async function generateSEOContent(args: { topic: string; keywords: string; word_count?: string }) {
  const { NimbusSEOAgentPro } = await import('./seoAgentPro');
  
  const keywords = args.keywords.split(',').map(k => k.trim());
  const wordCount = parseInt(args.word_count || '1500');
  
  const agent = new NimbusSEOAgentPro();
  const content = await agent.generateContent({
    topic: args.topic,
    keywords,
    targetWordCount: wordCount,
  });
  
  return content;
}

async function getProjectStatus(args: { project_id: string }) {
  const { getDb } = await import('./db');
  const { projects } = await import('../drizzle/schema');
  const { eq, or, like } = await import('drizzle-orm');
  
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Try to find project by ID or address
  const project = await db
    .select()
    .from(projects)
    .where(
      or(
        eq(projects.id, parseInt(args.project_id) || 0),
        like(projects.address, `%${args.project_id}%`)
      )
    )
    .limit(1);

  if (project.length === 0) {
    return { found: false, message: 'Project not found' };
  }

  return {
    found: true,
    project: project[0],
  };
}

async function calculateRoofEstimate(args: { square_feet: string; material: string; stories?: string }) {
  const sqft = parseInt(args.square_feet);
  const stories = parseInt(args.stories || '1');
  
  // Base pricing per square foot
  const materialPricing: Record<string, number> = {
    asphalt_shingle: 4.50,
    metal: 8.50,
    tile: 12.00,
    flat_tpo: 6.50,
  };
  
  const basePrice = materialPricing[args.material] || 5.00;
  
  // Story multiplier
  const storyMultiplier = 1 + ((stories - 1) * 0.15);
  
  // Calculate estimate
  const materialCost = sqft * basePrice * storyMultiplier;
  const laborCost = materialCost * 0.60;
  const total = materialCost + laborCost;
  
  return {
    square_feet: sqft,
    material: args.material,
    stories,
    material_cost: Math.round(materialCost),
    labor_cost: Math.round(laborCost),
    total_estimate: Math.round(total),
    price_per_sqft: basePrice,
    note: 'This is a rough estimate. Actual pricing may vary based on roof complexity, accessibility, and current material costs.',
  };
}

async function syncCompanyCamPhotos(args: { project_id: string }) {
  // Placeholder for CompanyCam API integration
  // User needs to provide CompanyCam API token
  
  return {
    success: false,
    message: 'CompanyCam API integration requires API token. Please provide credentials.',
    project_id: args.project_id,
  };
}

async function searchKnowledgeBase(args: { query: string; category?: string }) {
  const { NIMBUS_KNOWLEDGE } = await import('./nimbusKnowledgeBase');
  
  const query = args.query.toLowerCase();
  const results: any[] = [];
  
  // Search services
  if (!args.category || args.category === 'services') {
    // Services are in keywordStrategy.serviceModifiers
    NIMBUS_KNOWLEDGE.keywordStrategy.serviceModifiers.forEach((service: string) => {
      if (service.toLowerCase().includes(query)) {
        results.push({ type: 'service', name: service });
      }
    });
  }
  
  // Search cities
  if (!args.category || args.category === 'general') {
    // Cities are in keywordStrategy.geographicModifiers
    NIMBUS_KNOWLEDGE.keywordStrategy.geographicModifiers.forEach((city: string) => {
      if (city.toLowerCase().includes(query)) {
        results.push({ type: 'city', name: city });
      }
    });
  }
  
  return {
    query: args.query,
    category: args.category || 'all',
    results_count: results.length,
    results: results.slice(0, 10), // Limit to top 10
  };
}

// ============================================================================
// AI AGENT WITH FUNCTION CALLING
// ============================================================================

/**
 * Execute an AI agent conversation with function calling enabled
 */
export async function executeAgentWithFunctions(
  userMessage: string,
  systemPrompt?: string,
  availableFunctions?: string[]
): Promise<{
  response: string;
  function_calls: FunctionCall[];
  function_results: FunctionResult[];
}> {
  // Filter functions if specified
  const functions = availableFunctions
    ? Object.values(FUNCTION_REGISTRY).filter(f => availableFunctions.includes(f.name))
    : Object.values(FUNCTION_REGISTRY);

  // First LLM call with function definitions
  const initialResponse = await invokeLLM({
    messages: [
      {
        role: 'system',
        content: systemPrompt || 'You are a helpful AI assistant for Nimbus Roofing. Use available functions to help customers.',
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
    tools: functions.map(f => ({
      type: 'function' as const,
      function: f,
    })),
    tool_choice: 'auto',
  });

  const functionCalls: FunctionCall[] = [];
  const functionResults: FunctionResult[] = [];

  // Check if LLM wants to call functions
  const message = initialResponse.choices[0].message;
  
  if (message.tool_calls && message.tool_calls.length > 0) {
    // Execute each function call
    for (const toolCall of message.tool_calls) {
      const functionCall: FunctionCall = {
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      };
      
      functionCalls.push(functionCall);
      
      const result = await executeFunction(functionCall);
      functionResults.push(result);
    }

    // Second LLM call with function results
    const finalResponse = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful AI assistant for Nimbus Roofing.',
        },
        {
          role: 'user',
          content: userMessage,
        },
        {
          role: 'assistant',
          content: message.content || '',
        } as any,
        ...message.tool_calls.map((toolCall, idx) => ({
          role: 'tool' as const,
          content: JSON.stringify(functionResults[idx]),
          tool_call_id: toolCall.id,
        })),
      ],
    });

    return {
      response: typeof finalResponse.choices[0].message.content === 'string' 
        ? finalResponse.choices[0].message.content 
        : JSON.stringify(finalResponse.choices[0].message.content) || '',
      function_calls: functionCalls,
      function_results: functionResults,
    };
  }

  // No function calls needed
  return {
    response: typeof message.content === 'string' ? message.content : JSON.stringify(message.content) || '',
    function_calls: [],
    function_results: [],
  };
}
