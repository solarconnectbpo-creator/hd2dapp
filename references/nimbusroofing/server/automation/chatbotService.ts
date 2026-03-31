import { getDb } from "../db";
import {
  chatbotConversations,
  chatbotKnowledgeBase,
  InsertChatbotConversation,
  InsertChatbotKnowledge,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { eq, desc, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Chatbot Service with Feedback Loop and Semantic Memory
 * 
 * Features:
 * - AI-powered responses using Gemini
 * - Continuous learning from interactions
 * - Semantic memory (remembers successful responses)
 * - Human escalation when confidence is low
 * - Bounce-back system (failed email → SMS fallback)
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface ChatbotResponse {
  message: string;
  confidence: number;
  needsHumanEscalation: boolean;
  suggestedActions?: string[];
}

/**
 * Send message to chatbot and get AI response
 */
export async function sendMessage(
  sessionId: string,
  userMessage: string,
  userId?: number
): Promise<ChatbotResponse> {
  const db = await getDb();
  if (!db) {
    return {
      message: "Sorry, I'm currently unavailable. Please try again later.",
      confidence: 0,
      needsHumanEscalation: true,
    };
  }

  try {
    // 1. Load conversation history
    const history = await loadConversationHistory(sessionId);

    // 2. Search knowledge base for similar questions
    const knowledgeMatch = await searchKnowledgeBase(userMessage);

    // 3. Generate AI response
    const aiResponse = await generateAIResponse(userMessage, history, knowledgeMatch);

    // 4. Save conversation
    await saveConversation(sessionId, userId, userMessage, aiResponse);

    // 5. Learn from interaction if confidence is high
    if (aiResponse.confidence > 80 && !knowledgeMatch) {
      await learnFromInteraction(userMessage, aiResponse.message);
    }

    // 6. Escalate to human if needed
    if (aiResponse.needsHumanEscalation) {
      await escalateToHuman(sessionId, userMessage, userId);
    }

    return aiResponse;

  } catch (error) {
    console.error("[Chatbot] Error processing message:", error);
    return {
      message: "I'm having trouble understanding. Let me connect you with a human agent.",
      confidence: 0,
      needsHumanEscalation: true,
    };
  }
}

/**
 * Load conversation history for context
 */
async function loadConversationHistory(sessionId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const conversations = await db
      .select()
      .from(chatbotConversations)
      .where(eq(chatbotConversations.sessionId, sessionId))
      .orderBy(desc(chatbotConversations.createdAt))
      .limit(1);

    if (conversations.length === 0) return [];

    const messages = JSON.parse(conversations[0].messages);
    return messages.slice(-10); // Last 10 messages for context

  } catch (error) {
    console.error("[Chatbot] Error loading history:", error);
    return [];
  }
}

/**
 * Search knowledge base for similar questions
 */
async function searchKnowledgeBase(question: string): Promise<{
  answer: string;
  confidence: number;
} | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Simple keyword matching (can be enhanced with vector search)
    const keywords = question.toLowerCase().split(" ").filter(w => w.length > 3);
    
    const knowledge = await db
      .select()
      .from(chatbotKnowledgeBase)
      .where(
        and(
          eq(chatbotKnowledgeBase.isActive, true),
          sql`LOWER(${chatbotKnowledgeBase.question}) LIKE ${`%${keywords[0]}%`}`
        )
      )
      .orderBy(desc(chatbotKnowledgeBase.confidence))
      .limit(1);

    if (knowledge.length > 0) {
      const match = knowledge[0];
      
      // Update usage count
      await db.update(chatbotKnowledgeBase)
        .set({ usageCount: match.usageCount + 1 })
        .where(eq(chatbotKnowledgeBase.id, match.id));

      return {
        answer: match.answer,
        confidence: match.confidence,
      };
    }

    return null;

  } catch (error) {
    console.error("[Chatbot] Error searching knowledge base:", error);
    return null;
  }
}

/**
 * Generate AI response using Gemini
 */
async function generateAIResponse(
  userMessage: string,
  history: ChatMessage[],
  knowledgeMatch: { answer: string; confidence: number } | null
): Promise<ChatbotResponse> {
  try {
    // If high-confidence knowledge base match, use it
    if (knowledgeMatch && knowledgeMatch.confidence > 85) {
      return {
        message: knowledgeMatch.answer,
        confidence: knowledgeMatch.confidence,
        needsHumanEscalation: false,
      };
    }

    // Build conversation context
    const messages: any[] = [
      {
        role: "system",
        content: `You are a helpful roofing assistant for Nimbus Roofing. You help customers with:
- General roofing questions
- Storm damage assessment
- Insurance claim guidance
- Scheduling estimates
- Emergency services

Guidelines:
- Be friendly and professional
- Provide accurate information
- If you don't know something, say so and offer to connect them with a human
- Always include a call-to-action when appropriate
- Keep responses concise (under 150 words)

If the question is about:
- Pricing: Say "I'd be happy to schedule a free estimate. Can I get your phone number?"
- Emergency: Say "This sounds urgent. Our emergency line is (214) 612-6696. Should I have someone call you right away?"
- Complex technical: Offer to connect with a specialist`,
      },
    ];

    // Add conversation history
    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    });

    // Add current message
    messages.push({
      role: "user",
      content: userMessage,
    });

    // Add knowledge base hint if available
    if (knowledgeMatch) {
      messages.push({
        role: "system",
        content: `Relevant information from knowledge base: ${knowledgeMatch.answer}`,
      });
    }

    // Get AI response
    const response = await invokeLLM({ messages });
    const aiMessage = response.choices[0]?.message?.content || "I'm not sure how to help with that.";

    // Calculate confidence based on response characteristics
    const confidence = calculateConfidence(aiMessage, userMessage);

    // Determine if human escalation is needed
    const needsEscalation = 
      confidence < 60 ||
      aiMessage.toLowerCase().includes("i don't know") ||
      aiMessage.toLowerCase().includes("not sure") ||
      userMessage.toLowerCase().includes("speak to human") ||
      userMessage.toLowerCase().includes("talk to person");

    return {
      message: aiMessage,
      confidence,
      needsHumanEscalation: needsEscalation,
    };

  } catch (error) {
    console.error("[Chatbot] Error generating AI response:", error);
    return {
      message: "I'm having trouble right now. Let me connect you with someone who can help.",
      confidence: 0,
      needsHumanEscalation: true,
    };
  }
}

/**
 * Calculate confidence score for AI response
 */
function calculateConfidence(response: string, question: string): number {
  let confidence = 70; // Base confidence

  // Increase confidence if response is detailed
  if (response.length > 100) confidence += 10;
  
  // Decrease if response contains uncertainty phrases
  const uncertaintyPhrases = ["might", "maybe", "not sure", "i don't know", "possibly"];
  uncertaintyPhrases.forEach(phrase => {
    if (response.toLowerCase().includes(phrase)) confidence -= 15;
  });

  // Increase if response includes specific information
  if (response.includes("$") || response.includes("(214)")) confidence += 5;

  // Clamp between 0-100
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Save conversation to database
 */
async function saveConversation(
  sessionId: string,
  userId: number | undefined,
  userMessage: string,
  aiResponse: ChatbotResponse
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Load existing conversation
    const existing = await db
      .select()
      .from(chatbotConversations)
      .where(eq(chatbotConversations.sessionId, sessionId))
      .limit(1);

    const messages: ChatMessage[] = existing.length > 0 
      ? JSON.parse(existing[0].messages)
      : [];

    // Add new messages
    messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });
    messages.push({
      role: "assistant",
      content: aiResponse.message,
      timestamp: new Date(),
    });

    if (existing.length > 0) {
      // Update existing conversation
      await db.update(chatbotConversations)
        .set({
          messages: JSON.stringify(messages),
          escalatedToHuman: aiResponse.needsHumanEscalation,
          escalatedAt: aiResponse.needsHumanEscalation ? new Date() : existing[0].escalatedAt,
          updatedAt: new Date(),
        })
        .where(eq(chatbotConversations.id, existing[0].id));
    } else {
      // Create new conversation
      await db.insert(chatbotConversations).values({
        sessionId,
        userId: userId || null,
        messages: JSON.stringify(messages),
        escalatedToHuman: aiResponse.needsHumanEscalation,
        escalatedAt: aiResponse.needsHumanEscalation ? new Date() : null,
      });
    }

  } catch (error) {
    console.error("[Chatbot] Error saving conversation:", error);
  }
}

/**
 * Learn from successful interaction (add to knowledge base)
 */
async function learnFromInteraction(question: string, answer: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(chatbotKnowledgeBase).values({
      question,
      answer,
      category: "learned",
      confidence: 75, // Start with medium confidence
      usageCount: 1,
      successRate: 100,
      source: "learned",
      isActive: true,
    });

    console.log("[Chatbot] Learned new Q&A pair");

  } catch (error) {
    console.error("[Chatbot] Error learning from interaction:", error);
  }
}

/**
 * Escalate conversation to human agent
 */
async function escalateToHuman(
  sessionId: string,
  userMessage: string,
  userId?: number
): Promise<void> {
  console.log(`[Chatbot] Escalating session ${sessionId} to human`);

  // Notify owner
  await notifyOwner({
    title: "💬 Chatbot Escalation Required",
    content: `Session: ${sessionId}\nUser ID: ${userId || "Anonymous"}\nMessage: ${userMessage}`,
  });

  // TODO: Create task in task management system
  // TODO: Send notification to available agents
}

/**
 * Record feedback on chatbot response
 */
export async function recordFeedback(
  sessionId: string,
  feedback: "positive" | "negative" | "neutral",
  comment?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(chatbotConversations)
      .set({
        feedback,
        feedbackComment: comment || null,
        resolved: feedback === "positive",
        updatedAt: new Date(),
      })
      .where(eq(chatbotConversations.sessionId, sessionId));

    // Update knowledge base success rates
    // TODO: Implement knowledge base feedback learning

    console.log(`[Chatbot] Recorded ${feedback} feedback for session ${sessionId}`);

  } catch (error) {
    console.error("[Chatbot] Error recording feedback:", error);
  }
}

/**
 * Get chatbot analytics
 */
export async function getChatbotAnalytics() {
  const db = await getDb();
  if (!db) return null;

  try {
    const totalConversations = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatbotConversations);

    const escalated = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatbotConversations)
      .where(eq(chatbotConversations.escalatedToHuman, true));

    const resolved = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatbotConversations)
      .where(eq(chatbotConversations.resolved, true));

    const knowledgeBaseSize = await db
      .select({ count: sql<number>`count(*)` })
      .from(chatbotKnowledgeBase)
      .where(eq(chatbotKnowledgeBase.isActive, true));

    return {
      totalConversations: totalConversations[0]?.count || 0,
      escalationRate: escalated[0]?.count || 0,
      resolutionRate: resolved[0]?.count || 0,
      knowledgeBaseSize: knowledgeBaseSize[0]?.count || 0,
    };

  } catch (error) {
    console.error("[Chatbot] Error getting analytics:", error);
    return null;
  }
}

/**
 * Initialize knowledge base with common Q&A
 */
export async function initializeKnowledgeBase(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const commonQA = [
    {
      question: "What are your business hours?",
      answer: "We're available 24/7 for emergency services! For regular inquiries, our office hours are Monday-Friday 8am-6pm, Saturday 9am-4pm. You can always reach our emergency line at (214) 612-6696.",
      category: "business_info",
    },
    {
      question: "Do you offer free estimates?",
      answer: "Yes! We provide free, no-obligation estimates for all roofing projects. I can schedule one for you right now. What's your address and preferred time?",
      category: "pricing",
    },
    {
      question: "Do you work with insurance companies?",
      answer: "Absolutely! We work directly with insurance companies and can help you navigate the entire claims process. We'll inspect your roof, document damage, and work with your adjuster to ensure you get fair coverage.",
      category: "insurance",
    },
    {
      question: "How long does a roof replacement take?",
      answer: "Most residential roof replacements take 1-3 days, depending on the size and complexity. We'll provide a detailed timeline during your free estimate. Weather can sometimes cause delays, but we'll keep you updated throughout the process.",
      category: "services",
    },
    {
      question: "What areas do you serve?",
      answer: "We serve the Dallas-Fort Worth metroplex, including Collin County, Denton County, and Dallas County. If you're unsure if we cover your area, just let me know your zip code!",
      category: "service_area",
    },
  ];

  try {
    for (const qa of commonQA) {
      await db.insert(chatbotKnowledgeBase).values({
        question: qa.question,
        answer: qa.answer,
        category: qa.category,
        confidence: 95,
        usageCount: 0,
        successRate: 100,
        source: "manual",
        isActive: true,
      });
    }

    console.log("[Chatbot] Knowledge base initialized with common Q&A");

  } catch (error) {
    console.error("[Chatbot] Error initializing knowledge base:", error);
  }
}
