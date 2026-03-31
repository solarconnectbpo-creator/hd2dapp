/**
 * Customer-Facing AI Chatbot with Function Calling
 * 
 * This module provides an intelligent chatbot that can:
 * - Answer roofing questions
 * - Generate instant estimates
 * - Schedule inspections
 * - Capture leads automatically
 * - Use function calling to access real data
 */

import { executeAgentWithFunctions, FUNCTION_REGISTRY } from './functionCalling';
import { invokeLLM } from './_core/llm';
import { storeConversation, extractLearnings, getRecentLearnings } from './semanticMemory';
import { 
  getOrCreateUserProfile, 
  getUserContext, 
  buildPersonalizedContext, 
  incrementUserConversations,
  analyzeAndUpdateProfile 
} from './personalizationService';

// ============================================================================
// CHATBOT SYSTEM PROMPT
// ============================================================================

const CHATBOT_SYSTEM_PROMPT = `You are the Nimbus Roofing AI Assistant, a helpful and knowledgeable chatbot for Nimbus Roofing | built by the Nimbus IQ AI & powered by Google Gemini Partner.

**Your Role:**
- Help customers with roofing questions, estimates, and scheduling
- Provide accurate information about services, pricing, and processes
- Capture lead information when customers are interested
- Be friendly, professional, and conversational

**Company Information:**
- Company: Nimbus Roofing
- Location: McKinney, TX (serving DFW area)
- Phone: (214) 612-6696
- Founded: 2015 by Dustin Moore
- Certifications: Owens Corning Preferred Contractor, GAF Certified
- Specialties: Storm damage restoration, insurance claims, emergency repairs

**Services Offered:**
1. Residential Roofing - Replacement, repair, maintenance
2. Commercial Roofing - TPO, EPDM, flat roofs
3. Storm Damage Restoration - Hail, wind, emergency repairs
4. Insurance Claims Assistance - Full claim support
5. Roof Inspections - Free inspections
6. Roof Maintenance - Preventative care

**Pricing Guidelines:**
- Asphalt shingle: ~$4.50/sqft
- Metal roofing: ~$8.50/sqft
- Tile roofing: ~$12/sqft
- Flat TPO: ~$6.50/sqft
- Average home (2,000 sqft): $9,000-$18,000
- Always mention these are rough estimates and offer free inspection

**Available Functions:**
Use these functions when appropriate:
- calculate_roof_estimate: When customer asks about pricing
- get_weather_alerts: When discussing storm damage or urgency
- create_lead: When customer shows interest (has name + contact info)
- search_knowledge_base: For specific technical questions
- analyze_roof_damage: If customer mentions they have photos

**Lead Capture Strategy (MANDATORY):**
1. Build rapport and answer questions first
2. When customer shows interest, ask for their **name** first
3. Then ask for their **email address** — this is REQUIRED. Say something like: "What's the best email to send your estimate/confirmation to?"
4. Then ask for their **phone number** for scheduling
5. Use create_lead function ONLY after you have at least name + email
6. NEVER skip the email collection step. If the customer resists, explain: "We'll send your inspection confirmation and estimate details to your email — it's the fastest way to get you taken care of."

**Call Conclusion Protocol (NEVER hang up abruptly):**
Before ending any conversation, you MUST:
1. Summarize what was discussed and what the customer needs
2. Confirm the next step (e.g., "Our team will call you within 2 hours" or "You'll receive an email confirmation shortly")
3. Provide a direct contact: "If you need anything before then, call us at (214) 612-6696"
4. Thank them warmly: "Thank you for choosing Nimbus Roofing — we'll take great care of you!"
5. NEVER end a conversation without confirming the customer has no more questions

**Conversation Guidelines:**
- Keep responses concise (2-3 paragraphs max)
- Use bullet points for lists
- Always be helpful and never pushy
- If you don't know something, offer to have a team member call
- Emphasize 24/7 emergency service and same-day response
- Mention free inspections frequently
- For emergencies, urge them to call (214) 612-6696 immediately
- ALWAYS ask for email address before ending any interaction
- NEVER abruptly end a conversation — always provide a warm wrap-up with next steps

**Tone:**
- Friendly and approachable
- Professional but not overly formal
- Confident in expertise
- Empathetic to customer concerns (especially storm damage)

Remember: Your goal is to help customers and generate qualified leads, not just answer questions. Always try to move the conversation toward scheduling a free inspection.`;

// ============================================================================
// CONVERSATION HISTORY MANAGEMENT
// ============================================================================

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  functionCalls?: any[];
}

interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  leadCaptured: boolean;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  createdAt: Date;
  lastActivity: Date;
}

// In-memory session storage (in production, use Redis or database)
const chatSessions = new Map<string, ChatSession>();

/**
 * Get or create a chat session
 */
export function getChatSession(sessionId: string): ChatSession {
  if (!chatSessions.has(sessionId)) {
    chatSessions.set(sessionId, {
      sessionId,
      messages: [],
      leadCaptured: false,
      createdAt: new Date(),
      lastActivity: new Date(),
    });
  }

  const session = chatSessions.get(sessionId)!;
  session.lastActivity = new Date();
  return session;
}

/**
 * Add message to session history
 */
export function addMessageToSession(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  functionCalls?: any[]
): void {
  const session = getChatSession(sessionId);
  session.messages.push({
    role,
    content,
    timestamp: new Date(),
    functionCalls,
  });

  // Keep only last 20 messages to prevent context overflow
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }
}

/**
 * Clean up old sessions (run periodically)
 */
export function cleanupOldSessions(): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const [sessionId, session] of chatSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      chatSessions.delete(sessionId);
    }
  }
}

// ============================================================================
// CHATBOT RESPONSE GENERATION
// ============================================================================

/**
 * Generate chatbot response with function calling
 */
export async function generateChatbotResponse(
  sessionId: string,
  userMessage: string,
  userFingerprint?: string
): Promise<{
  response: string;
  functionCalls: any[];
  leadCaptured: boolean;
  suggestedActions?: string[];
}> {
  const session = getChatSession(sessionId);

  // Add user message to history
  addMessageToSession(sessionId, 'user', userMessage);

  // Build conversation context
  const conversationHistory = session.messages
    .slice(-10) // Last 10 messages for context
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

  // PERSONALIZATION: Get user-specific context
  let personalizedContext = '';
  let userProfileId: number | null = null;
  
  if (userFingerprint) {
    try {
      userProfileId = await getOrCreateUserProfile(userFingerprint);
      const userContext = await getUserContext(userFingerprint);
      
      if (userContext) {
        personalizedContext = buildPersonalizedContext(userContext);
      }
    } catch (error) {
      console.error('[Chatbot] Personalization error:', error);
      // Continue without personalization if it fails
    }
  }

  // SEMANTIC MEMORY: Get recent learnings to enhance context
  const recentLearnings = await getRecentLearnings(20);
  const learningsContext = recentLearnings.length > 0
    ? `\n\n**Recent Customer Insights:**\n${recentLearnings.map(l => `- ${l.question ? l.question + ': ' + l.answer : l.answer}`).join('\n')}`
    : '';

  // Enhance system prompt with learnings AND personalization
  const enhancedSystemPrompt = CHATBOT_SYSTEM_PROMPT + learningsContext + personalizedContext;

  // Determine which functions to make available based on context
  const availableFunctions = determineAvailableFunctions(userMessage, session);

  // Generate response with function calling
  const result = await executeAgentWithFunctions(
    userMessage,
    enhancedSystemPrompt,
    availableFunctions
  );

  // Check if lead was captured and extract customer info
  let leadCaptured = session.leadCaptured;
  for (const fc of result.function_calls) {
    if (fc.name === 'create_lead') {
      leadCaptured = true;
      session.leadCaptured = true;
      // Track customer info in session
      if (!session.customerInfo) session.customerInfo = {};
      if (fc.arguments.name) session.customerInfo.name = fc.arguments.name;
      if (fc.arguments.email) session.customerInfo.email = fc.arguments.email;
      if (fc.arguments.phone) session.customerInfo.phone = fc.arguments.phone;
    }
    if (fc.name === 'request_callback') {
      if (!session.customerInfo) session.customerInfo = {};
      if (fc.arguments.email) session.customerInfo.email = fc.arguments.email;
      if (fc.arguments.name) session.customerInfo.name = fc.arguments.name;
      if (fc.arguments.phone) session.customerInfo.phone = fc.arguments.phone;
    }
  }

  // Add assistant response to history
  addMessageToSession(sessionId, 'assistant', result.response, result.function_calls);

  // SEMANTIC MEMORY: Store conversation and extract learnings
  try {
    // Store the conversation
    const conversationId = await storeConversation(
      sessionId,
      userMessage,
      result.response,
      result.function_calls
    );

    // Extract learnings from this conversation (async, non-blocking)
    if (conversationId) {
      extractLearnings(conversationId, session.messages).catch(err => {
        console.error('[Chatbot] Failed to extract learnings:', err);
      });
    }
  } catch (error) {
    console.error('[Chatbot] Semantic memory error:', error);
    // Don't fail the response if semantic memory fails
  }

  // PERSONALIZATION: Update user profile after conversation
  if (userProfileId) {
    try {
      // Increment conversation counter
      await incrementUserConversations(userProfileId, 2); // user + assistant messages
      
      // Analyze conversation and update profile (async, non-blocking)
      analyzeAndUpdateProfile(userProfileId, userMessage, result.response).catch(err => {
        console.error('[Chatbot] Failed to update user profile:', err);
      });
    } catch (error) {
      console.error('[Chatbot] Profile update error:', error);
      // Don't fail the response if profile update fails
    }
  }

  // LEAD SCORING: Calculate lead score based on conversation
  if (leadCaptured || result.function_calls.some(fc => ['request_callback', 'initiate_call'].includes(fc.name))) {
    try {
      const { calculateLeadScore } = await import('./callerFeatures');
      
      // Determine urgency from message and function calls
      let urgency = 'low';
      if (result.function_calls.some(fc => fc.name === 'initiate_call')) urgency = 'emergency';
      else if (userMessage.toLowerCase().includes('urgent') || userMessage.toLowerCase().includes('emergency')) urgency = 'high';
      else if (userMessage.toLowerCase().includes('soon') || userMessage.toLowerCase().includes('schedule')) urgency = 'medium';
      
      // Extract keywords from conversation
      const keywords = userMessage.toLowerCase().split(/\s+/);
      
      // Calculate lead score
      const leadScore = calculateLeadScore({
        urgency,
        requestType: result.function_calls[0]?.name || 'create_lead',
        hasContact: result.function_calls.some(fc => fc.arguments.phone || fc.arguments.email),
        conversationLength: session.messages.length,
        mentionedKeywords: keywords,
      });
      
      console.log(`[Chatbot] Lead score calculated: ${leadScore}/100 (urgency: ${urgency})`);
      
      // TODO: Update lead record with score in database
    } catch (error) {
      console.error('[Chatbot] Lead scoring error:', error);
    }
  }

  // Generate suggested actions for UI
  const suggestedActions = generateSuggestedActions(userMessage, result.response, session);

  return {
    response: result.response,
    functionCalls: result.function_calls,
    leadCaptured,
    suggestedActions,
  };
}

/**
 * Determine which functions should be available based on context
 */
function determineAvailableFunctions(userMessage: string, session: ChatSession): string[] {
  const message = userMessage.toLowerCase();
  const functions: string[] = [];

  // Always available
  functions.push('search_knowledge_base');

  // Pricing/estimate related
  if (
    message.includes('cost') ||
    message.includes('price') ||
    message.includes('estimate') ||
    message.includes('how much')
  ) {
    functions.push('calculate_roof_estimate');
  }

  // Storm/weather related
  if (
    message.includes('storm') ||
    message.includes('hail') ||
    message.includes('wind') ||
    message.includes('damage') ||
    message.includes('weather')
  ) {
    functions.push('get_weather_alerts');
  }

  // Photo analysis
  if (
    message.includes('photo') ||
    message.includes('picture') ||
    message.includes('image') ||
    message.includes('look at')
  ) {
    functions.push('analyze_roof_damage');
  }

  // Lead capture (only if not already captured)
  if (!session.leadCaptured) {
    functions.push('create_lead');
  }

  // Callback requests - always available
  functions.push('request_callback');

  // Emergency call initiation
  if (
    message.includes('emergency') ||
    message.includes('urgent') ||
    message.includes('leak') ||
    message.includes('call me') ||
    message.includes('talk to someone')
  ) {
    functions.push('initiate_call');
  }

  // SMS opt-in
  if (
    message.includes('text') ||
    message.includes('sms') ||
    message.includes('alert') ||
    message.includes('notify') ||
    message.includes('update')
  ) {
    functions.push('opt_in_sms');
    functions.push('send_instant_sms');
  }

  return functions;
}

/**
 * Generate suggested quick actions for the UI
 */
function generateSuggestedActions(
  userMessage: string,
  botResponse: string,
  session: ChatSession
): string[] {
  const suggestions: string[] = [];
  const message = userMessage.toLowerCase();

  // EMERGENCY PATH - Highest priority
  if (
    message.includes('emergency') ||
    message.includes('urgent') ||
    message.includes('leak')
  ) {
    suggestions.push('🚨 Call me NOW');
    suggestions.push('📅 Schedule callback ASAP');
    suggestions.push('📱 Text me updates');
    return suggestions;
  }

  // HIGH INTENT PATH - Ready to convert
  if (
    message.includes('schedule') ||
    message.includes('inspection') ||
    message.includes('estimate') ||
    message.includes('quote')
  ) {
    suggestions.push('📅 Schedule free inspection');
    suggestions.push('📞 Request callback');
    suggestions.push('💬 Get instant estimate');
    return suggestions;
  }

  // STORM DAMAGE PATH
  if (
    message.includes('storm') ||
    message.includes('hail') ||
    message.includes('wind') ||
    message.includes('damage')
  ) {
    suggestions.push('🌩️ Check weather alerts');
    suggestions.push('📸 Analyze damage photos');
    suggestions.push('📞 Request emergency callback');
    return suggestions;
  }

  // PRICING PATH
  if (
    message.includes('cost') ||
    message.includes('price') ||
    message.includes('how much')
  ) {
    suggestions.push('💰 Get quick estimate');
    suggestions.push('📞 Speak with pricing expert');
    suggestions.push('📧 Email me a quote');
    return suggestions;
  }

  // DEFAULT PATH - General engagement
  if (!session.leadCaptured) {
    if (!session.customerInfo?.email) {
      suggestions.push('📧 Share my email for updates');
    }
    suggestions.push('📅 Schedule free inspection');
    suggestions.push('📞 Request callback');
  } else {
    suggestions.push('❓ I have another question');
    suggestions.push('📞 Call (214) 612-6696');
    suggestions.push('👍 That\'s all, thank you!');
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}

// ============================================================================
// CHATBOT GREETING & QUICK REPLIES
// ============================================================================

/**
 * Generate initial greeting message
 */
export function getChatbotGreeting(): {
  message: string;
  quickReplies: string[];
} {
  return {
    message: `👋 Hi! I'm the Nimbus Roofing AI Assistant. I'm here to help with:

• Roof inspections & estimates
• Storm damage assessment
• Insurance claims assistance
• Emergency repairs (24/7)

What can I help you with today?`,
    quickReplies: [
      'I need a roof inspection',
      'How much does a new roof cost?',
      'I have storm damage',
      'Tell me about your services',
    ],
  };
}

/**
 * Get quick reply suggestions based on conversation state
 */
export function getQuickReplies(session: ChatSession): string[] {
  if (session.messages.length === 0) {
    return [
      'I need a roof inspection',
      'How much does a new roof cost?',
      'I have storm damage',
      'Tell me about your services',
    ];
  }

  const lastMessage = session.messages[session.messages.length - 1];
  
  if (lastMessage.role === 'assistant') {
    const content = lastMessage.content.toLowerCase();

    // If bot mentioned pricing
    if (content.includes('estimate') || content.includes('price')) {
      return [
        'Schedule free inspection',
        'What about insurance coverage?',
        'How long does installation take?',
      ];
    }

    // If bot mentioned storm damage
    if (content.includes('storm') || content.includes('hail')) {
      return [
        'Can you check my roof photos?',
        'Help with insurance claim',
        'Schedule emergency inspection',
      ];
    }

    // If bot mentioned services
    if (content.includes('service')) {
      return [
        'Get a quote',
        'What certifications do you have?',
        'Do you offer warranties?',
      ];
    }
  }

  // Default suggestions
  return [
    'Schedule inspection',
    'Get pricing estimate',
    'Ask about insurance',
  ];
}

// ============================================================================
// CHATBOT ANALYTICS
// ============================================================================

interface ChatbotAnalytics {
  totalSessions: number;
  totalMessages: number;
  leadsGenerated: number;
  averageMessagesPerSession: number;
  commonQuestions: string[];
}

/**
 * Get chatbot analytics
 */
export function getChatbotAnalytics(): ChatbotAnalytics {
  const sessions = Array.from(chatSessions.values());
  
  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);
  const leadsGenerated = sessions.filter(s => s.leadCaptured).length;
  
  return {
    totalSessions,
    totalMessages,
    leadsGenerated,
    averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
    commonQuestions: [], // TODO: Implement question analysis
  };
}

// ============================================================================
// CLEANUP TASK
// ============================================================================

// Clean up old sessions every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);
