import { getDb } from "./db";
import { userProfiles, chatConversations, chatMessages, aiLearnings } from "../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";

/**
 * Personalization Service
 * 
 * Provides user-specific memory and context for personalized chatbot interactions.
 * Tracks anonymous users via fingerprinting and builds progressive profiles.
 */

export interface UserContext {
  profileId: number;
  fingerprint: string;
  name?: string;
  email?: string;
  phone?: string;
  interests: string[];
  painPoints: string[];
  buyerStage: string;
  totalConversations: number;
  previousConversations: Array<{
    id: number;
    sessionId: string;
    summary: string;
    timestamp: Date;
  }>;
  recentTopics: string[];
}

/**
 * Get or create user profile by fingerprint
 */
export async function getOrCreateUserProfile(fingerprint: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to find existing profile
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.fingerprint, fingerprint))
    .limit(1);

  if (existing.length > 0) {
    // Update last seen
    await db
      .update(userProfiles)
      .set({ lastSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(userProfiles.id, existing[0].id));
    
    return existing[0].id;
  }

  // Create new profile
  const result = await db.insert(userProfiles).values({
    fingerprint,
    interests: JSON.stringify([]),
    painPoints: JSON.stringify([]),
    buyerStage: "awareness",
    totalConversations: 0,
    totalMessages: 0,
    lastSeenAt: new Date(),
    firstSeenAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return result[0].insertId;
}

/**
 * Get comprehensive user context for personalization
 */
export async function getUserContext(fingerprint: string): Promise<UserContext | null> {
  const db = await getDb();
  if (!db) return null;

  // Get user profile
  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.fingerprint, fingerprint))
    .limit(1);

  if (profile.length === 0) {
    return null;
  }

  const user = profile[0];

  // Get recent conversations (last 5)
  const conversations = await db
    .select({
      id: chatConversations.id,
      sessionId: chatConversations.sessionId,
      lastMessageAt: chatConversations.lastMessageAt,
      messages: chatConversations.messages,
    })
    .from(chatConversations)
    .where(eq(chatConversations.sessionId, fingerprint))
    .orderBy(desc(chatConversations.lastMessageAt))
    .limit(5);

  // Build conversation summaries
  const previousConversations = conversations.map(conv => {
    const messages = JSON.parse(conv.messages || "[]");
    const firstUserMessage = messages.find((m: any) => m.role === "user");
    
    return {
      id: conv.id,
      sessionId: conv.sessionId,
      summary: firstUserMessage?.content?.substring(0, 100) || "No summary",
      timestamp: conv.lastMessageAt,
    };
  });

  // Extract recent topics from conversations
  const recentTopics: string[] = [];
  for (const conv of conversations.slice(0, 3)) {
    const messages = JSON.parse(conv.messages || "[]");
    // Simple topic extraction - look for keywords in user messages
    messages
      .filter((m: any) => m.role === "user")
      .forEach((m: any) => {
        const content = m.content.toLowerCase();
        if (content.includes("roof replacement") || content.includes("replace")) recentTopics.push("roof_replacement");
        if (content.includes("repair")) recentTopics.push("roof_repair");
        if (content.includes("storm") || content.includes("hail")) recentTopics.push("storm_damage");
        if (content.includes("insurance") || content.includes("claim")) recentTopics.push("insurance_claims");
        if (content.includes("cost") || content.includes("price") || content.includes("estimate")) recentTopics.push("pricing");
        if (content.includes("emergency") || content.includes("leak")) recentTopics.push("emergency_repair");
      });
  }

  return {
    profileId: user.id,
    fingerprint: user.fingerprint,
    name: user.name || undefined,
    email: user.email || undefined,
    phone: user.phone || undefined,
    interests: JSON.parse(user.interests || "[]"),
    painPoints: JSON.parse(user.painPoints || "[]"),
    buyerStage: user.buyerStage || "awareness",
    totalConversations: user.totalConversations,
    previousConversations,
    recentTopics: Array.from(new Set(recentTopics)), // Remove duplicates
  };
}

/**
 * Update user profile with new information
 */
export async function updateUserProfile(
  profileId: number,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    interests?: string[];
    painPoints?: string[];
    buyerStage?: string;
    preferredContactMethod?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const updateData: any = { updatedAt: new Date() };

  if (updates.name) updateData.name = updates.name;
  if (updates.email) updateData.email = updates.email;
  if (updates.phone) updateData.phone = updates.phone;
  if (updates.interests) updateData.interests = JSON.stringify(updates.interests);
  if (updates.painPoints) updateData.painPoints = JSON.stringify(updates.painPoints);
  if (updates.buyerStage) updateData.buyerStage = updates.buyerStage;
  if (updates.preferredContactMethod) updateData.preferredContactMethod = updates.preferredContactMethod;

  await db
    .update(userProfiles)
    .set(updateData)
    .where(eq(userProfiles.id, profileId));
}

/**
 * Increment conversation counter for user
 */
export async function incrementUserConversations(profileId: number, messageCount: number = 2): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, profileId))
    .limit(1);

  if (profile.length === 0) return;

  await db
    .update(userProfiles)
    .set({
      totalConversations: profile[0].totalConversations + 1,
      totalMessages: profile[0].totalMessages + messageCount,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(userProfiles.id, profileId));
}

/**
 * Build personalized context string for chatbot system prompt
 */
export function buildPersonalizedContext(userContext: UserContext): string {
  let context = "\n\n**PERSONALIZED USER CONTEXT:**\n\n";

  // Returning user
  if (userContext.totalConversations > 0) {
    context += `🔄 **Returning Customer** (${userContext.totalConversations} previous conversations)\n`;
    
    if (userContext.name) {
      context += `Name: ${userContext.name}\n`;
    }
    
    if (userContext.email || userContext.phone) {
      context += `Contact: ${userContext.email || userContext.phone}\n`;
    }
  } else {
    context += `👋 **New Visitor** (First conversation)\n`;
  }

  // Buyer stage
  context += `\nBuyer Stage: ${userContext.buyerStage.toUpperCase()}\n`;
  
  if (userContext.buyerStage === "awareness") {
    context += `→ Focus on education and building trust\n`;
  } else if (userContext.buyerStage === "consideration") {
    context += `→ Provide detailed comparisons and options\n`;
  } else if (userContext.buyerStage === "decision") {
    context += `→ Address final concerns and encourage action\n`;
  } else if (userContext.buyerStage === "customer") {
    context += `→ Provide post-sale support and upsell opportunities\n`;
  }

  // Recent topics
  if (userContext.recentTopics.length > 0) {
    context += `\n**Recent Topics Discussed:**\n`;
    userContext.recentTopics.forEach(topic => {
      context += `- ${topic.replace(/_/g, " ").toUpperCase()}\n`;
    });
  }

  // Interests
  if (userContext.interests.length > 0) {
    context += `\n**Known Interests:**\n`;
    userContext.interests.forEach(interest => {
      context += `- ${interest}\n`;
    });
  }

  // Pain points
  if (userContext.painPoints.length > 0) {
    context += `\n**Known Pain Points/Concerns:**\n`;
    userContext.painPoints.forEach(pain => {
      context += `- ${pain}\n`;
    });
  }

  // Previous conversation summaries
  if (userContext.previousConversations.length > 0) {
    context += `\n**Previous Conversation Summaries:**\n`;
    userContext.previousConversations.slice(0, 3).forEach((conv, idx) => {
      const timeAgo = getTimeAgo(conv.timestamp);
      context += `${idx + 1}. ${timeAgo}: "${conv.summary}..."\n`;
    });
  }

  context += `\n**PERSONALIZATION INSTRUCTIONS:**\n`;
  context += `- Reference previous conversations naturally when relevant\n`;
  context += `- Don't ask for information you already have (name, contact, etc.)\n`;
  context += `- Tailor your response depth to their buyer stage\n`;
  context += `- Acknowledge their return if they're a returning visitor\n`;
  context += `- Address their known pain points proactively\n`;

  return context;
}

/**
 * Helper: Get human-readable time ago
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

/**
 * Analyze conversation and update user profile progressively
 */
export async function analyzeAndUpdateProfile(
  profileId: number,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get current profile
  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, profileId))
    .limit(1);

  if (profile.length === 0) return;

  const user = profile[0];
  const currentInterests = JSON.parse(user.interests || "[]");
  const currentPainPoints = JSON.parse(user.painPoints || "[]");
  let buyerStage = user.buyerStage;

  // Extract interests from user message
  const newInterests: string[] = [];
  const message = userMessage.toLowerCase();
  
  if (message.includes("metal roof") || message.includes("metal roofing")) newInterests.push("metal_roofing");
  if (message.includes("tile") || message.includes("clay")) newInterests.push("tile_roofing");
  if (message.includes("flat roof")) newInterests.push("flat_roofing");
  if (message.includes("warranty") || message.includes("guarantee")) newInterests.push("warranties");
  if (message.includes("energy efficient") || message.includes("cool roof")) newInterests.push("energy_efficiency");
  if (message.includes("hoa") || message.includes("neighborhood")) newInterests.push("hoa_compliance");

  // Extract pain points
  const newPainPoints: string[] = [];
  
  if (message.includes("leak") || message.includes("leaking")) newPainPoints.push("roof_leaks");
  if (message.includes("expensive") || message.includes("afford") || message.includes("budget")) newPainPoints.push("cost_concerns");
  if (message.includes("insurance") && message.includes("denied")) newPainPoints.push("insurance_denial");
  if (message.includes("emergency") || message.includes("urgent")) newPainPoints.push("urgent_need");
  if (message.includes("trust") || message.includes("scam") || message.includes("reliable")) newPainPoints.push("trust_concerns");
  if (message.includes("how long") || message.includes("timeline")) newPainPoints.push("timeline_concerns");

  // Update buyer stage based on conversation signals
  if (message.includes("schedule") || message.includes("inspection") || message.includes("when can")) {
    buyerStage = "decision";
  } else if (message.includes("compare") || message.includes("vs") || message.includes("better") || message.includes("estimate")) {
    buyerStage = "consideration";
  } else if (buyerStage === "awareness" && currentInterests.length > 2) {
    buyerStage = "consideration"; // Moved to consideration after showing interest
  }

  // Merge new data with existing
  const updatedInterests = Array.from(new Set([...currentInterests, ...newInterests]));
  const updatedPainPoints = Array.from(new Set([...currentPainPoints, ...newPainPoints]));

  // Update profile
  await updateUserProfile(profileId, {
    interests: updatedInterests,
    painPoints: updatedPainPoints,
    buyerStage: buyerStage || "awareness",
  });
}
