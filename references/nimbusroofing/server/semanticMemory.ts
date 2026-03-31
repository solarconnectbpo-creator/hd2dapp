import { getDb } from "./db";
import { chatMessages, aiLearnings, aiFeedback, chatConversations } from "../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

/**
 * Semantic Memory Service
 * 
 * Provides AI learning capabilities through conversation analysis,
 * pattern recognition, and continuous knowledge extraction.
 */

interface Message {
  role: "user" | "assistant" | "system" | "function";
  content: string;
  functionName?: string;
  functionArgs?: string;
  functionResult?: string;
}

interface ConversationAnalysis {
  sentiment: string;
  intent: string;
  topics: string[];
  painPoints: string[];
  questions: string[];
  satisfactionScore: number;
  leadPotential: number;
}

/**
 * Store a complete conversation with user and assistant messages
 */
export async function storeConversation(
  sessionId: string,
  userMessage: string,
  assistantResponse: string,
  functionCalls?: any[]
): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[Semantic Memory] Database not available");
      return null;
    }

    // Create conversation record
    const conversationResult = await db.insert(chatConversations).values({
      sessionId,
      leadId: null, // Will be set if lead is captured
      messages: JSON.stringify([]), // Will store messages as JSON
      status: "active",
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const conversationId = conversationResult[0].insertId;

    // Store user message
    await storeChatMessage(conversationId, {
      role: "user",
      content: userMessage,
    });

    // Store assistant message with function calls
    await storeChatMessage(conversationId, {
      role: "assistant",
      content: assistantResponse,
      functionName: functionCalls && functionCalls.length > 0 ? functionCalls[0].name : undefined,
      functionArgs: functionCalls && functionCalls.length > 0 ? JSON.stringify(functionCalls[0].arguments) : undefined,
      functionResult: functionCalls && functionCalls.length > 0 ? JSON.stringify(functionCalls[0].result) : undefined,
    });

    return conversationId;
  } catch (error) {
    console.error("[Semantic Memory] Error storing conversation:", error);
    return null;
  }
}

/**
 * Store a chat message with semantic analysis
 */
export async function storeChatMessage(
  conversationId: number,
  message: Message
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Analyze message for sentiment and intent
  const analysis = await analyzeMessage(message.content, message.role);

  const result = await db.insert(chatMessages).values({
    conversationId,
    role: message.role,
    content: message.content,
    functionName: message.functionName,
    functionArgs: message.functionArgs,
    functionResult: message.functionResult,
    tokens: estimateTokens(message.content),
    sentiment: analysis.sentiment,
    intent: analysis.intent,
    createdAt: new Date(),
  });

  return result[0].insertId;
}

/**
 * Analyze a message for sentiment and intent using AI
 */
async function analyzeMessage(
  messageContent: string,
  role: string
): Promise<{ sentiment: string; intent: string }> {
  // Only analyze user messages
  if (role !== "user") {
    return { sentiment: "neutral", intent: "response" };
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Analyze this customer message and return JSON with:
- sentiment: positive, negative, neutral, frustrated, satisfied, urgent
- intent: pricing_inquiry, emergency_request, general_info, complaint, compliment, scheduling, insurance_question, warranty_question, material_question

Be concise and accurate.`,
        },
        {
          role: "user",
          content: `Message: "${messageContent}"`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "message_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sentiment: { type: "string" },
              intent: { type: "string" },
            },
            required: ["sentiment", "intent"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    return analysis;
  } catch (error) {
    console.error("[Semantic Memory] Error analyzing message:", error);
    return { sentiment: "neutral", intent: "general_info" };
  }
}

/**
 * Analyze entire conversation for learnings
 */
export async function analyzeConversation(
  conversationId: number
): Promise<ConversationAnalysis> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all messages in conversation
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(chatMessages.createdAt);

  if (messages.length === 0) {
    return {
      sentiment: "neutral",
      intent: "unknown",
      topics: [],
      painPoints: [],
      questions: [],
      satisfactionScore: 50,
      leadPotential: 50,
    };
  }

  // Build conversation transcript
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Analyze this customer conversation and extract insights. Return JSON with:
- sentiment: overall emotional tone (positive, negative, neutral, frustrated, satisfied)
- intent: primary customer intent (pricing_inquiry, emergency_request, general_info, etc.)
- topics: array of main topics discussed (max 5)
- painPoints: array of customer pain points or concerns mentioned
- questions: array of key questions the customer asked
- satisfactionScore: 0-100 score of customer satisfaction
- leadPotential: 0-100 score of likelihood to convert to customer

Be thorough but concise.`,
        },
        {
          role: "user",
          content: `Conversation:\n\n${transcript}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "conversation_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sentiment: { type: "string" },
              intent: { type: "string" },
              topics: { type: "array", items: { type: "string" } },
              painPoints: { type: "array", items: { type: "string" } },
              questions: { type: "array", items: { type: "string" } },
              satisfactionScore: { type: "integer" },
              leadPotential: { type: "integer" },
            },
            required: [
              "sentiment",
              "intent",
              "topics",
              "painPoints",
              "questions",
              "satisfactionScore",
              "leadPotential",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));
    return analysis;
  } catch (error) {
    console.error("[Semantic Memory] Error analyzing conversation:", error);
    return {
      sentiment: "neutral",
      intent: "unknown",
      topics: [],
      painPoints: [],
      questions: [],
      satisfactionScore: 50,
      leadPotential: 50,
    };
  }
}

/**
 * Extract learnings from a conversation
 */
export async function extractLearnings(conversationId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const analysis = await analyzeConversation(conversationId);

  // Extract FAQ learnings from questions
  for (const question of analysis.questions) {
    // Check if this question pattern already exists
    const existing = await db
      .select()
      .from(aiLearnings)
      .where(
        and(
          eq(aiLearnings.learningType, "faq"),
          sql`LOWER(${aiLearnings.question}) = LOWER(${question})`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Increment frequency
      await db
        .update(aiLearnings)
        .set({
          frequency: existing[0].frequency + 1,
          lastSeen: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiLearnings.id, existing[0].id));
    } else {
      // Create new learning
      await db.insert(aiLearnings).values({
        conversationId,
        learningType: "faq",
        category: categorizeQuestion(question),
        question,
        answer: null, // Will be filled by admin or AI
        context: JSON.stringify(analysis.topics),
        confidence: 70,
        frequency: 1,
        lastSeen: new Date(),
        isValidated: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // Extract pain points
  for (const painPoint of analysis.painPoints) {
    await db.insert(aiLearnings).values({
      conversationId,
      learningType: "pain_point",
      category: "customer_experience",
      question: null,
      answer: painPoint,
      context: JSON.stringify({ sentiment: analysis.sentiment }),
      confidence: 80,
      frequency: 1,
      lastSeen: new Date(),
      isValidated: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Record successful or failed response based on satisfaction
  const responseType =
    analysis.satisfactionScore >= 70 ? "successful_response" : "failed_response";

  await db.insert(aiLearnings).values({
    conversationId,
    learningType: responseType,
    category: analysis.intent,
    question: null,
    answer: null,
    context: JSON.stringify({
      satisfactionScore: analysis.satisfactionScore,
      leadPotential: analysis.leadPotential,
      topics: analysis.topics,
    }),
    confidence: analysis.satisfactionScore,
    frequency: 1,
    lastSeen: new Date(),
    isValidated: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

/**
 * Categorize a question into a topic
 */
function categorizeQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase();

  if (
    lowerQuestion.includes("price") ||
    lowerQuestion.includes("cost") ||
    lowerQuestion.includes("$")
  ) {
    return "pricing";
  }
  if (
    lowerQuestion.includes("insurance") ||
    lowerQuestion.includes("claim") ||
    lowerQuestion.includes("adjuster")
  ) {
    return "insurance";
  }
  if (
    lowerQuestion.includes("warranty") ||
    lowerQuestion.includes("guarantee")
  ) {
    return "warranty";
  }
  if (
    lowerQuestion.includes("material") ||
    lowerQuestion.includes("shingle") ||
    lowerQuestion.includes("owens corning")
  ) {
    return "materials";
  }
  if (
    lowerQuestion.includes("storm") ||
    lowerQuestion.includes("hail") ||
    lowerQuestion.includes("wind") ||
    lowerQuestion.includes("damage")
  ) {
    return "storm_damage";
  }
  if (
    lowerQuestion.includes("emergency") ||
    lowerQuestion.includes("leak") ||
    lowerQuestion.includes("urgent")
  ) {
    return "emergency";
  }

  return "general";
}

/**
 * Get recent learnings for AI context
 */
export async function getRecentLearnings(limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const learnings = await db
    .select()
    .from(aiLearnings)
    .where(and(eq(aiLearnings.isActive, true), gte(aiLearnings.confidence, 60)))
    .orderBy(desc(aiLearnings.frequency), desc(aiLearnings.lastSeen))
    .limit(limit);

  return learnings;
}

/**
 * Record feedback on an AI response
 */
export async function recordFeedback(
  conversationId: number,
  messageId: number,
  feedbackType: "thumbs_up" | "thumbs_down" | "correction" | "clarification" | "conversion" | "abandonment",
  userComment?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(aiFeedback).values({
    conversationId,
    messageId,
    feedbackType,
    userComment: userComment || null,
    systemAnalysis: null,
    improvementSuggestion: null,
    wasImplemented: false,
    createdAt: new Date(),
  });

  // If negative feedback, analyze what went wrong
  if (feedbackType === "thumbs_down" || feedbackType === "abandonment") {
    await analyzeNegativeFeedback(conversationId, messageId, userComment);
  }
}

/**
 * Analyze negative feedback to improve responses
 */
async function analyzeNegativeFeedback(
  conversationId: number,
  messageId: number,
  userComment?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get the message that received negative feedback
  const message = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, messageId))
    .limit(1);

  if (message.length === 0) return;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Analyze why this AI response received negative feedback and suggest improvements. Return JSON with:
- systemAnalysis: brief analysis of what went wrong
- improvementSuggestion: specific suggestion to improve the response`,
        },
        {
          role: "user",
          content: `AI Response: "${message[0].content}"
User Comment: "${userComment || "No comment provided"}"`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "feedback_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              systemAnalysis: { type: "string" },
              improvementSuggestion: { type: "string" },
            },
            required: ["systemAnalysis", "improvementSuggestion"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const analysis = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

    // Update feedback record with analysis
    await db
      .update(aiFeedback)
      .set({
        systemAnalysis: analysis.systemAnalysis,
        improvementSuggestion: analysis.improvementSuggestion,
      })
      .where(
        and(
          eq(aiFeedback.conversationId, conversationId),
          eq(aiFeedback.messageId, messageId)
        )
      );
  } catch (error) {
    console.error("[Semantic Memory] Error analyzing negative feedback:", error);
  }
}

/**
 * Estimate token count for a message
 */
function estimateTokens(content: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(content.length / 4);
}

/**
 * Get conversation context for AI (recent learnings + conversation history)
 */
export async function getConversationContext(
  conversationId: number
): Promise<string> {
  const db = await getDb();
  if (!db) return "";

  // Get recent messages
  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(10);

  // Get relevant learnings
  const learnings = await getRecentLearnings(20);

  let context = "## Recent Learnings:\n\n";
  for (const learning of learnings.slice(0, 10)) {
    if (learning.question && learning.answer) {
      context += `Q: ${learning.question}\nA: ${learning.answer}\n(Confidence: ${learning.confidence}%, Frequency: ${learning.frequency})\n\n`;
    }
  }

  context += "\n## Conversation History:\n\n";
  for (const msg of messages.reverse()) {
    context += `${msg.role.toUpperCase()}: ${msg.content}\n`;
  }

  return context;
}
