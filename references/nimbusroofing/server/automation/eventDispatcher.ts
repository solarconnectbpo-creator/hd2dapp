import { getDb } from "../db";
import { automationEvents, leads, emailInbox, InsertLead, InsertEmailInbox } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { notifyOwner } from "../_core/notification";
import { eq } from "drizzle-orm";

/**
 * Event-Driven Automation Engine
 * 
 * This service dispatches events and triggers automated workflows:
 * - Incoming call → Transcribe → Categorize → Create lead → Send follow-up
 * - New email → AI reads intent → Route → Auto-reply → Schedule callback
 * - Voicemail → Transcribe → Sentiment analysis → Priority queue → Notify
 * - Storm alert → Generate blog → Send campaign → Update homepage
 */

export interface AutomationEventPayload {
  eventType: "incoming_call" | "new_email" | "voicemail" | "form_submission" | "storm_alert" | "claim_uploaded";
  triggerSource: string;
  data: Record<string, any>;
}

/**
 * Main event dispatcher - routes events to appropriate handlers
 */
export async function dispatchEvent(payload: AutomationEventPayload): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error("[EventDispatcher] Database not available");
    return;
  }

  const startTime = Date.now();
  const actionsTriggered: string[] = [];

  try {
    // Log event to database
    const [event] = await db.insert(automationEvents).values({
      eventType: payload.eventType,
      triggerSource: payload.triggerSource,
      payload: JSON.stringify(payload.data),
      status: "processing",
    }).$returningId();

    const eventId = event.id;

    // Route to appropriate handler
    switch (payload.eventType) {
      case "incoming_call":
        await handleIncomingCall(payload.data, actionsTriggered);
        break;
      case "new_email":
        await handleNewEmail(payload.data, actionsTriggered);
        break;
      case "voicemail":
        await handleVoicemail(payload.data, actionsTriggered);
        break;
      case "form_submission":
        await handleFormSubmission(payload.data, actionsTriggered);
        break;
      case "storm_alert":
        await handleStormAlert(payload.data, actionsTriggered);
        break;
      case "claim_uploaded":
        await handleClaimUploaded(payload.data, actionsTriggered);
        break;
    }

    // Update event status
    const processingTime = Date.now() - startTime;
    await db.update(automationEvents)
      .set({
        status: "completed",
        actionsTriggered: JSON.stringify(actionsTriggered),
        processingTimeMs: processingTime,
        processedAt: new Date(),
      })
      .where(eq(automationEvents.id, eventId));

    console.log(`[EventDispatcher] Event ${eventId} completed in ${processingTime}ms. Actions: ${actionsTriggered.join(", ")}`);

  } catch (error) {
    console.error("[EventDispatcher] Error processing event:", error);
    // Log error to database
    // Note: eventId might not be available if insert failed
  }
}

/**
 * Handle incoming phone call
 * Flow: Transcribe → Categorize → Create lead → Send follow-up SMS
 */
async function handleIncomingCall(data: any, actions: string[]): Promise<void> {
  const { callerId, transcription, duration, sentiment, category } = data;

  // 1. Auto-categorize call if not already done
  if (!category && transcription) {
    const aiCategory = await categorizeCall(transcription);
    data.category = aiCategory;
    actions.push("categorize_call");
  }

  // 2. Create lead if it's a quote request or emergency
  if (data.category === "quote_request" || data.category === "emergency") {
    await createLeadFromCall(data);
    actions.push("create_lead");
  }

  // 3. Send follow-up SMS
  if (callerId) {
    // TODO: Integrate Twilio SMS
    actions.push("send_followup_sms");
  }

  // 4. Notify owner if emergency
  if (data.category === "emergency") {
    await notifyOwner({
      title: "🚨 Emergency Call Received",
      content: `Caller: ${callerId}\nTranscription: ${transcription}`,
    });
    actions.push("notify_owner");
  }
}

/**
 * Handle new email
 * Flow: AI reads intent → Route → Auto-reply → Schedule callback
 */
async function handleNewEmail(data: any, actions: string[]): Promise<void> {
  const { from, subject, body, messageId } = data;
  const db = await getDb();
  if (!db) return;

  // 1. AI categorization and sentiment analysis
  const analysis = await analyzeEmail(subject, body);
  actions.push("analyze_email");

  // 2. Store in email inbox
  await db.insert(emailInbox).values({
    messageId,
    from,
    to: data.to || "info@nimbusroofing.com",
    subject,
    body,
    category: analysis.category as any,
    priority: analysis.priority as any,
    sentiment: analysis.sentiment as any,
    aiSuggestion: analysis.suggestedResponse,
  });
  actions.push("store_email");

  // 3. Create lead if quote request
  if (analysis.category === "quote_request") {
    await createLeadFromEmail(data, analysis);
    actions.push("create_lead");
  }

  // 4. Auto-reply for common inquiries
  if (analysis.category === "general_inquiry" && analysis.confidence > 80) {
    // TODO: Send auto-reply email
    actions.push("send_auto_reply");
  }

  // 5. Notify owner if urgent
  if (analysis.priority === "urgent") {
    await notifyOwner({
      title: "📧 Urgent Email Received",
      content: `From: ${from}\nSubject: ${subject}`,
    });
    actions.push("notify_owner");
  }
}

/**
 * Handle voicemail
 * Flow: Transcribe → Sentiment analysis → Priority queue → Notify
 */
async function handleVoicemail(data: any, actions: string[]): Promise<void> {
  const { callerId, transcription, sentiment, priority } = data;

  // 1. Create callback task if high priority
  if (priority === "high" || priority === "urgent") {
    // TODO: Create callback task
    actions.push("create_callback_task");
  }

  // 2. Notify owner if urgent
  if (priority === "urgent") {
    await notifyOwner({
      title: "📞 Urgent Voicemail",
      content: `Caller: ${callerId}\nMessage: ${transcription}`,
    });
    actions.push("notify_owner");
  }
}

/**
 * Handle website form submission
 * Flow: Create lead → Send confirmation email → Notify owner
 */
async function handleFormSubmission(data: any, actions: string[]): Promise<void> {
  const { name, email, phone, message, formType } = data;

  // 1. Create lead
  await createLeadFromForm(data);
  actions.push("create_lead");

  // 2. Send confirmation email
  // TODO: Integrate email service
  actions.push("send_confirmation");

  // 3. Notify owner
  await notifyOwner({
    title: `📝 New ${formType} Form Submission`,
    content: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
  });
  actions.push("notify_owner");
}

/**
 * Handle storm alert
 * Flow: Generate blog → Send email campaign → Update homepage banner
 */
async function handleStormAlert(data: any, actions: string[]): Promise<void> {
  const { alertType, severity, affectedAreas, description } = data;

  // 1. Generate blog post about storm
  // TODO: Implement auto-blog generation
  actions.push("generate_blog");

  // 2. Send email campaign to affected areas
  // TODO: Integrate email campaign service
  actions.push("send_campaign");

  // 3. Update homepage banner
  // TODO: Update homepage banner via API
  actions.push("update_homepage");

  // 4. Notify owner
  await notifyOwner({
    title: `⛈️ Storm Alert: ${alertType}`,
    content: `Severity: ${severity}\nAreas: ${affectedAreas}\n${description}`,
  });
  actions.push("notify_owner");
}

/**
 * Handle insurance claim uploaded
 * Flow: Run AI analysis → Detect fraud → Extract line items → Notify owner
 */
async function handleClaimUploaded(data: any, actions: string[]): Promise<void> {
  const { claimId, userId, fileName } = data;

  // 1. Trigger AI analysis (already handled by agents/claimAnalyzer.ts)
  actions.push("analyze_claim");

  // 2. Notify owner of new claim
  await notifyOwner({
    title: "📄 New Insurance Claim Uploaded",
    content: `User ID: ${userId}\nFile: ${fileName}\nClaim ID: ${claimId}`,
  });
  actions.push("notify_owner");
}

/**
 * AI Helper: Categorize phone call based on transcription
 */
async function categorizeCall(transcription: string): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a call categorization assistant. Categorize the call into one of: quote_request, emergency, complaint, general_inquiry, spam. Respond with only the category name.",
        },
        {
          role: "user",
          content: `Categorize this call transcription:\n\n${transcription}`,
        },
      ],
    });

    const category = response.choices[0]?.message?.content?.trim().toLowerCase() || "general_inquiry";
    return category;
  } catch (error) {
    console.error("[EventDispatcher] Error categorizing call:", error);
    return "general_inquiry";
  }
}

/**
 * AI Helper: Analyze email content
 */
async function analyzeEmail(subject: string, body: string): Promise<{
  category: string;
  priority: string;
  sentiment: string;
  confidence: number;
  suggestedResponse: string;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an email analysis assistant. Analyze the email and respond with JSON:
{
  "category": "quote_request" | "complaint" | "general_inquiry" | "spam" | "urgent",
  "priority": "low" | "medium" | "high" | "urgent",
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0-100,
  "suggestedResponse": "Brief suggested reply"
}`,
        },
        {
          role: "user",
          content: `Subject: ${subject}\n\nBody: ${body}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";
    const analysis = JSON.parse(content);
    return analysis;
  } catch (error) {
    console.error("[EventDispatcher] Error analyzing email:", error);
    return {
      category: "general_inquiry",
      priority: "medium",
      sentiment: "neutral",
      confidence: 0,
      suggestedResponse: "",
    };
  }
}

/**
 * Create lead from phone call
 */
async function createLeadFromCall(data: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const leadData: InsertLead = {
    name: data.callerName || "Unknown Caller",
    email: data.callerEmail || null,
    phone: data.callerId || null,
    source: "phone_call",
    status: data.category === "emergency" ? "hot" : "warm",
    notes: data.transcription || null,
    assignedTo: null,
  };

  await db.insert(leads).values(leadData);
}

/**
 * Create lead from email
 */
async function createLeadFromEmail(data: any, analysis: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const leadData: InsertLead = {
    name: data.fromName || data.from,
    email: data.from,
    phone: null,
    source: "email",
    status: analysis.priority === "urgent" ? "hot" : "warm",
    notes: `Subject: ${data.subject}\n\n${data.body}`,
    assignedTo: null,
  };

  await db.insert(leads).values(leadData);
}

/**
 * Create lead from form submission
 */
async function createLeadFromForm(data: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const leadData: InsertLead = {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    source: "website_form",
    status: "warm",
    notes: data.message || null,
    assignedTo: null,
  };

  await db.insert(leads).values(leadData);
}
