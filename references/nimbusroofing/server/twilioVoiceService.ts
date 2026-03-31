/**
 * Twilio Voice Service
 * Handles incoming calls, IVR, call routing, and transcription
 */

import { getDb } from "./db";
import { phoneCalls, voicemails, leads } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";

export interface TwilioCallWebhook {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
  CallerName?: string;
  RecordingUrl?: string;
  TranscriptionText?: string;
  Duration?: string;
}

/**
 * Generate TwiML response for incoming calls
 */
export function generateIVRResponse(callType?: string): string {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL || "https://api.manus.im";

  // Main IVR menu
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${baseUrl}/api/twilio/voice/menu" numDigits="1" timeout="10">
    <Say voice="Polly.Joanna">
      Thank you for calling Nimbus Roofing. 
      For emergency roof repairs, press 1. 
      For a free quote, press 2. 
      For project status updates, press 3. 
      To speak with our office, press 0.
    </Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't receive your selection. Please call back.</Say>
  <Hangup/>
</Response>`;

  return twiml;
}

/**
 * Handle IVR menu selection
 */
export function handleMenuSelection(digit: string): string {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL || "https://api.manus.im";

  switch (digit) {
    case "1": // Emergency
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    This is an emergency line. We will connect you to our on-call technician immediately. 
    Please stay on the line.
  </Say>
  <Dial timeout="30" record="record-from-answer" recordingStatusCallback="${baseUrl}/api/twilio/voice/recording">
    +14695551234
  </Dial>
  <Say voice="Polly.Joanna">Our technician is unavailable. Please leave a message after the beep.</Say>
  <Record maxLength="120" transcribe="true" transcribeCallback="${baseUrl}/api/twilio/voice/transcription"/>
  <Hangup/>
</Response>`;

    case "2": // Quote request
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Great! We'd love to provide you with a free quote. 
    Please leave your name, phone number, address, and a brief description of your roofing needs after the beep.
  </Say>
  <Record maxLength="180" transcribe="true" transcribeCallback="${baseUrl}/api/twilio/voice/transcription"/>
  <Say voice="Polly.Joanna">Thank you! We'll review your request and call you back within 24 hours.</Say>
  <Hangup/>
</Response>`;

    case "3": // Project status
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    To check your project status, please leave your name and project number after the beep.
  </Say>
  <Record maxLength="60" transcribe="true" transcribeCallback="${baseUrl}/api/twilio/voice/transcription"/>
  <Say voice="Polly.Joanna">Thank you! We'll look up your project and call you back shortly.</Say>
  <Hangup/>
</Response>`;

    case "0": // Office
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Connecting you to our office. Please hold.
  </Say>
  <Dial timeout="30" record="record-from-answer" recordingStatusCallback="${baseUrl}/api/twilio/voice/recording">
    +14695551234
  </Dial>
  <Say voice="Polly.Joanna">Our office is currently unavailable. Please leave a message after the beep.</Say>
  <Record maxLength="120" transcribe="true" transcribeCallback="${baseUrl}/api/twilio/voice/transcription"/>
  <Hangup/>
</Response>`;

    default:
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Invalid selection. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }
}

/**
 * Store incoming call in database
 */
export async function storeIncomingCall(webhookData: TwilioCallWebhook) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const callData = {
    twilioCallSid: webhookData.CallSid,
    callerId: webhookData.From,
    callerName: webhookData.CallerName,
    direction: "inbound" as const,
    status: webhookData.CallStatus as any,
    duration: webhookData.Duration ? parseInt(webhookData.Duration) : null,
    recordingUrl: webhookData.RecordingUrl,
    transcription: webhookData.TranscriptionText,
  };

  const result = await db.insert(phoneCalls).values(callData);
  // @ts-ignore
  return result[0].insertId;
}

/**
 * Update call with transcription and AI analysis
 */
export async function updateCallWithTranscription(
  callSid: string,
  transcription: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate AI summary and sentiment
  const aiAnalysis = await analyzeCallTranscription(transcription);

  // Update call record
  await db
    .update(phoneCalls)
    .set({
      transcription,
      aiSummary: aiAnalysis.summary,
      sentiment: aiAnalysis.sentiment,
      callType: aiAnalysis.callType,
    })
    .where(eq(phoneCalls.twilioCallSid, callSid));

  // Auto-create lead if it's a quote request
  if (aiAnalysis.callType === "quote_request" && aiAnalysis.shouldCreateLead) {
    const calls = await db
      .select()
      .from(phoneCalls)
      .where(eq(phoneCalls.twilioCallSid, callSid))
      .limit(1);

    if (calls.length > 0) {
      const call = calls[0];
      await createLeadFromCall(call.id, call.callerId, transcription, aiAnalysis);
    }
  }

  return aiAnalysis;
}

/**
 * Analyze call transcription using AI
 */
async function analyzeCallTranscription(transcription: string) {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an AI assistant analyzing roofing company phone calls. 
Analyze the transcription and extract:
1. Call type (emergency, quote_request, general_inquiry, complaint, project_status)
2. Sentiment (positive, neutral, negative)
3. Summary (1-2 sentences)
4. Whether a lead should be created
5. Extracted customer info (name, phone, address if mentioned)

Respond in JSON format.`,
      },
      {
        role: "user",
        content: `Analyze this call transcription:\n\n${transcription}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "call_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            callType: {
              type: "string",
              enum: [
                "emergency",
                "quote_request",
                "general_inquiry",
                "complaint",
                "project_status",
              ],
            },
            sentiment: {
              type: "string",
              enum: ["positive", "neutral", "negative"],
            },
            summary: { type: "string" },
            shouldCreateLead: { type: "boolean" },
            customerInfo: {
              type: "object",
              properties: {
                name: { type: "string" },
                phone: { type: "string" },
                address: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
          },
          required: ["callType", "sentiment", "summary", "shouldCreateLead"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const analysis = JSON.parse(typeof content === 'string' ? content : "{}");
  return analysis;
}

/**
 * Create lead from phone call
 */
async function createLeadFromCall(
  callId: number,
  callerId: string,
  transcription: string,
  aiAnalysis: any
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const leadData = {
    name: aiAnalysis.customerInfo?.name || "Phone Inquiry",
    email: "", // Email not collected from phone calls
    phone: aiAnalysis.customerInfo?.phone || callerId,
    address: aiAnalysis.customerInfo?.address,
    message: `Call transcription: ${transcription}`,
    source: "phone_call",
    urgency: aiAnalysis.callType === "emergency" ? ("emergency" as const) : ("medium" as const),
    status: "new" as const,
  };

  const result = await db.insert(leads).values(leadData);
  // @ts-ignore
  const leadId = result[0].insertId;

  // Update call record with lead ID
  await db
    .update(phoneCalls)
    .set({ leadCreated: true, leadId })
    .where(eq(phoneCalls.id, callId));

  return leadId;
}

/**
 * Store voicemail
 */
export async function storeVoicemail(
  callSid: string,
  recordingUrl: string,
  transcription: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get call info
  const calls = await db
    .select()
    .from(phoneCalls)
    .where(eq(phoneCalls.twilioCallSid, callSid))
    .limit(1);

  if (calls.length === 0) {
    throw new Error("Call not found");
  }

  const call = calls[0];

  // Generate AI summary
  const aiAnalysis = await analyzeCallTranscription(transcription);

  // Determine priority
  let priority: "low" | "medium" | "high" | "urgent" = "medium";
  if (aiAnalysis.callType === "emergency") priority = "urgent";
  else if (aiAnalysis.callType === "complaint") priority = "high";
  else if (aiAnalysis.callType === "quote_request") priority = "high";

  // Store voicemail
  await db.insert(voicemails).values({
    phoneCallId: call.id,
    callerId: call.callerId,
    callerName: call.callerName,
    recordingUrl,
    transcription,
    aiSummary: aiAnalysis.summary,
    priority,
    sentiment: aiAnalysis.sentiment,
  });

  return aiAnalysis;
}

/**
 * Get call history
 */
export async function getCallHistory(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];

  const calls = await db
    .select()
    .from(phoneCalls)
    .orderBy(phoneCalls.createdAt)
    .limit(limit);

  return calls;
}

/**
 * Get voicemails
 */
export async function getVoicemails(unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(voicemails);

  if (unreadOnly) {
    query = query.where(eq(voicemails.isRead, false)) as any;
  }

  const vms = await query.orderBy(voicemails.createdAt).limit(100);

  return vms;
}

/**
 * Mark voicemail as read
 */
export async function markVoicemailRead(voicemailId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(voicemails)
    .set({
      isRead: true,
      respondedAt: new Date(),
      respondedBy: userId,
    })
    .where(eq(voicemails.id, voicemailId));
}
