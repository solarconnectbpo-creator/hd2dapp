import { getDb } from "./db";
import { callbackRequests, callTracking, smsOptIns, leads } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import twilio from "twilio";

/**
 * Caller Features Service
 * 
 * Handles callback requests, call initiation, SMS opt-ins, and call tracking
 * Integrates with Twilio for voice and SMS functionality
 */

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "+12146126696";
const COMPANY_PHONE_NUMBER = "(214) 612-6696";

/**
 * Calculate lead score based on urgency, intent, and context
 */
export function calculateLeadScore(params: {
  urgency?: string;
  requestType: string;
  hasContact: boolean;
  conversationLength: number;
  mentionedKeywords: string[];
}): number {
  let score = 50; // Base score

  // Urgency scoring
  if (params.urgency === "emergency") score += 40;
  else if (params.urgency === "high") score += 30;
  else if (params.urgency === "medium") score += 15;
  else if (params.urgency === "low") score += 5;

  // Request type scoring
  if (params.requestType === "initiate_call") score += 25; // Immediate call = hot lead
  else if (params.requestType === "request_callback") score += 20;
  else if (params.requestType === "opt_in_sms") score += 10;

  // Contact information scoring
  if (params.hasContact) score += 15;

  // Engagement scoring
  if (params.conversationLength > 5) score += 10; // Long conversation = engaged
  if (params.conversationLength > 10) score += 5;

  // Keyword scoring (buying signals)
  const buyingKeywords = ["insurance", "estimate", "schedule", "inspection", "replace", "repair", "cost", "price"];
  const matchedKeywords = params.mentionedKeywords.filter(k => 
    buyingKeywords.some(bk => k.toLowerCase().includes(bk))
  );
  score += matchedKeywords.length * 3;

  return Math.min(score, 100); // Cap at 100
}

/**
 * Request a callback from the customer
 */
export async function requestCallback(params: {
  name: string;
  phone: string;
  email?: string;
  preferred_time: string;
  reason: string;
  urgency?: string;
  conversationContext?: string;
  userProfileId?: number;
  leadId?: number;
}): Promise<{ success: boolean; callbackId?: number; message: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Determine scheduled time based on preference
    const scheduledFor = calculateScheduledTime(params.preferred_time);

    // Calculate urgency if not provided
    const urgency = params.urgency || determineUrgency(params.reason);

    // Insert callback request
    const result = await db.insert(callbackRequests).values({
      name: params.name,
      phone: params.phone,
      email: params.email || null,
      preferredTime: params.preferred_time,
      preferredDate: new Date(scheduledFor),
      requestReason: params.reason,
      urgency: urgency as any,
      conversationContext: params.conversationContext || null,
      status: "pending",
      scheduledFor: new Date(scheduledFor),
      userProfileId: params.userProfileId || null,
      leadId: params.leadId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const callbackId = result[0].insertId;

    // Send confirmation SMS if phone is provided
    if (params.phone) {
      try {
        await sendSMS(
          params.phone,
          `Hi ${params.name}! We received your callback request. We'll call you ${formatTimePreference(params.preferred_time)}. If urgent, call us at ${COMPANY_PHONE_NUMBER}. - Nimbus Roofing`
        );
      } catch (smsError) {
        console.error("[Callback] Failed to send confirmation SMS:", smsError);
        // Don't fail the callback request if SMS fails
      }
    }

    // Create or update lead
    if (!params.leadId) {
      await createLeadFromCallback(params, callbackId);
    }

    return {
      success: true,
      callbackId,
      message: `Great! I've scheduled a callback for ${formatTimePreference(params.preferred_time)}. You'll receive a confirmation text shortly. Is there anything else I can help you with?`,
    };
  } catch (error) {
    console.error("[Callback] Error creating callback request:", error);
    return {
      success: false,
      message: `I apologize, but I encountered an error scheduling your callback. Please call us directly at ${COMPANY_PHONE_NUMBER} or try again.`,
    };
  }
}

/**
 * Initiate an immediate call to the customer
 */
export async function initiateCall(params: {
  name: string;
  phone: string;
  reason: string;
  conversationContext?: string;
  userProfileId?: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create callback request with ASAP urgency
    const callbackResult = await db.insert(callbackRequests).values({
      name: params.name,
      phone: params.phone,
      preferredTime: "asap",
      requestReason: params.reason,
      urgency: "emergency",
      conversationContext: params.conversationContext || null,
      status: "pending",
      scheduledFor: new Date(),
      userProfileId: params.userProfileId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const callbackId = callbackResult[0].insertId;

    // Initiate Twilio call (this will connect customer to sales team)
    try {
      const call = await twilioClient.calls.create({
        to: params.phone,
        from: TWILIO_PHONE_NUMBER,
        url: `${process.env.VITE_FRONTEND_FORGE_API_URL}/twilio/connect-call`, // TwiML endpoint
        statusCallback: `${process.env.VITE_FRONTEND_FORGE_API_URL}/twilio/call-status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      });

      // Track the call
      await db.insert(callTracking).values({
        callSid: call.sid,
        direction: "outbound",
        fromNumber: TWILIO_PHONE_NUMBER,
        toNumber: params.phone,
        status: "initiated",
        callbackRequestId: callbackId,
        source: "chatbot",
        startedAt: new Date(),
        createdAt: new Date(),
      });

      // Send SMS notification
      await sendSMS(
        params.phone,
        `Hi ${params.name}! We're calling you now regarding: ${params.reason}. Please answer! - Nimbus Roofing`
      );

      return {
        success: true,
        message: `Perfect! I'm connecting you with our team right now. You should receive a call within the next 30 seconds. Please keep your phone nearby!`,
      };
    } catch (twilioError) {
      console.error("[Call] Twilio call initiation failed:", twilioError);
      
      // Fallback: Send urgent SMS
      await sendSMS(
        params.phone,
        `Hi ${params.name}! We received your URGENT request: "${params.reason}". We'll call you within 5 minutes. If immediate assistance needed, call ${COMPANY_PHONE_NUMBER}. - Nimbus Roofing`
      );

      return {
        success: true,
        message: `I've flagged your request as urgent and notified our team via text. They'll call you within 5 minutes. If you need immediate assistance, please call us at ${COMPANY_PHONE_NUMBER}.`,
      };
    }
  } catch (error) {
    console.error("[Call] Error initiating call:", error);
    return {
      success: false,
      message: `I apologize for the technical issue. Please call us directly at ${COMPANY_PHONE_NUMBER} for immediate assistance.`,
    };
  }
}

/**
 * Opt customer in to SMS updates
 */
export async function optInSMS(params: {
  phone: string;
  name: string;
  email?: string;
  message_types?: string;
  userProfileId?: number;
  leadId?: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Parse message types
    const messageTypes = params.message_types 
      ? params.message_types.split(',').map(t => t.trim())
      : ['alerts', 'updates'];

    // Check if already opted in
    const existing = await db
      .select()
      .from(smsOptIns)
      .where(eq(smsOptIns.phone, params.phone))
      .limit(1);

    if (existing.length > 0) {
      // Update existing opt-in
      await db
        .update(smsOptIns)
        .set({
          optedIn: true,
          messageTypes: JSON.stringify(messageTypes),
          optInDate: new Date(),
          optOutDate: null,
          updatedAt: new Date(),
        })
        .where(eq(smsOptIns.phone, params.phone));

      return {
        success: true,
        message: `Perfect! You're already subscribed to SMS updates. I've updated your preferences to receive: ${messageTypes.join(', ')}. Reply STOP anytime to unsubscribe.`,
      };
    }

    // Create new opt-in
    await db.insert(smsOptIns).values({
      phone: params.phone,
      name: params.name,
      email: params.email || null,
      optedIn: true,
      optInSource: "chatbot",
      messageTypes: JSON.stringify(messageTypes),
      frequency: "all",
      userProfileId: params.userProfileId || null,
      leadId: params.leadId || null,
      optInDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Send welcome SMS
    await sendSMS(
      params.phone,
      `Hi ${params.name}! You're now subscribed to Nimbus Roofing SMS updates (${messageTypes.join(', ')}). We'll keep you informed about storm alerts, special offers, and important updates. Reply STOP to opt out anytime.`
    );

    return {
      success: true,
      message: `Excellent! You're now subscribed to SMS updates for: ${messageTypes.join(', ')}. You'll receive a confirmation text shortly. You can unsubscribe anytime by replying STOP.`,
    };
  } catch (error) {
    console.error("[SMS] Error opting in:", error);
    return {
      success: false,
      message: `I apologize, but I encountered an error setting up SMS notifications. Please try again or contact us at ${COMPANY_PHONE_NUMBER}.`,
    };
  }
}

/**
 * Send instant SMS to customer
 */
export async function sendInstantSMS(params: {
  phone: string;
  message: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    await sendSMS(params.phone, params.message);
    return {
      success: true,
      message: `SMS sent successfully to ${params.phone}!`,
    };
  } catch (error) {
    console.error("[SMS] Error sending instant SMS:", error);
    return {
      success: false,
      message: `Failed to send SMS. Please try again.`,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send SMS via Twilio
 */
async function sendSMS(to: string, message: string): Promise<void> {
  try {
    await twilioClient.messages.create({
      to,
      from: TWILIO_PHONE_NUMBER,
      body: message,
    });
    console.log(`[SMS] Sent to ${to}: ${message}`);
  } catch (error) {
    console.error(`[SMS] Failed to send to ${to}:`, error);
    throw error;
  }
}

/**
 * Calculate scheduled time based on preference
 */
function calculateScheduledTime(preference: string): Date {
  const now = new Date();
  const scheduled = new Date();

  switch (preference) {
    case "asap":
      scheduled.setMinutes(now.getMinutes() + 5);
      break;
    case "morning":
      scheduled.setHours(9, 0, 0, 0);
      if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);
      break;
    case "afternoon":
      scheduled.setHours(14, 0, 0, 0);
      if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);
      break;
    case "evening":
      scheduled.setHours(18, 0, 0, 0);
      if (scheduled <= now) scheduled.setDate(scheduled.getDate() + 1);
      break;
    case "tomorrow":
      scheduled.setDate(now.getDate() + 1);
      scheduled.setHours(9, 0, 0, 0);
      break;
    default:
      scheduled.setMinutes(now.getMinutes() + 30);
  }

  return scheduled;
}

/**
 * Format time preference for human-readable message
 */
function formatTimePreference(preference: string): string {
  switch (preference) {
    case "asap":
      return "within the next 5-10 minutes";
    case "morning":
      return "tomorrow morning (9-11 AM)";
    case "afternoon":
      return "this afternoon (2-4 PM)";
    case "evening":
      return "this evening (6-8 PM)";
    case "tomorrow":
      return "tomorrow morning";
    default:
      return "soon";
  }
}

/**
 * Determine urgency from reason text
 */
function determineUrgency(reason: string): string {
  const lowerReason = reason.toLowerCase();
  
  if (lowerReason.includes("emergency") || lowerReason.includes("leak") || lowerReason.includes("urgent")) {
    return "emergency";
  }
  if (lowerReason.includes("storm") || lowerReason.includes("damage") || lowerReason.includes("hail")) {
    return "high";
  }
  if (lowerReason.includes("estimate") || lowerReason.includes("inspection") || lowerReason.includes("quote")) {
    return "medium";
  }
  return "low";
}

/**
 * Create lead from callback request
 */
async function createLeadFromCallback(
  params: {
    name: string;
    phone: string;
    email?: string;
    reason: string;
    urgency?: string;
  },
  callbackId: number
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(leads).values({
      name: params.name,
      email: params.email || null,
      phone: params.phone,
      message: `Callback requested: ${params.reason}`,
      source: "chatbot_callback",
      urgency: (params.urgency || "medium") as any,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("[Lead] Error creating lead from callback:", error);
  }
}
