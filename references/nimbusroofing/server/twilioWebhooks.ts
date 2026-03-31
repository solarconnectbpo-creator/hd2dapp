import type { Express, Request, Response } from "express";
import { getDb } from "./db";
import { callTracking } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Twilio Webhook Handlers
 * 
 * Receives status updates from Twilio for calls and SMS
 */

/**
 * Setup Twilio webhook routes
 */
export function setupTwilioWebhooks(app: Express) {
  console.log("[Twilio Webhooks] Setting up routes...");

  /**
   * Call status webhook
   * Receives updates when call status changes (initiated, ringing, answered, completed, etc.)
   */
  app.post("/webhooks/twilio/call-status", async (req: Request, res: Response) => {
    try {
      const {
        CallSid,
        CallStatus,
        CallDuration,
        RecordingUrl,
        RecordingSid,
        TranscriptionText,
        From,
        To,
        Direction,
      } = req.body;

      console.log(`[Twilio Webhook] Call status update: ${CallSid} - ${CallStatus}`);

      const db = await getDb();
      if (!db) {
        console.error("[Twilio Webhook] Database not available");
        return res.status(500).send("Database error");
      }

      // Find existing call tracking record
      const existingCalls = await db
        .select()
        .from(callTracking)
        .where(eq(callTracking.callSid, CallSid))
        .limit(1);

      if (existingCalls.length > 0) {
        // Update existing record
        const updateData: any = {
          status: CallStatus,
          updatedAt: new Date(),
        };

        if (CallDuration) updateData.duration = parseInt(CallDuration);
        if (RecordingUrl) updateData.recordingUrl = RecordingUrl;
        if (RecordingSid) updateData.recordingSid = RecordingSid;
        if (TranscriptionText) updateData.transcription = TranscriptionText;

        // Set completion time if call ended
        if (["completed", "failed", "busy", "no-answer", "canceled"].includes(CallStatus)) {
          updateData.completedAt = new Date();
          
          // Determine outcome
          if (CallStatus === "completed") {
            updateData.outcome = "answered";
          } else if (CallStatus === "no-answer") {
            updateData.outcome = "no_answer";
          } else if (CallStatus === "busy") {
            updateData.outcome = "busy";
          } else {
            updateData.outcome = "failed";
          }
        }

        await db
          .update(callTracking)
          .set(updateData)
          .where(eq(callTracking.callSid, CallSid));

        console.log(`[Twilio Webhook] Updated call tracking for ${CallSid}`);
      } else {
        // Create new record if it doesn't exist (shouldn't happen normally)
        await db.insert(callTracking).values({
          callSid: CallSid,
          direction: Direction || "outbound",
          fromNumber: From || "",
          toNumber: To || "",
          status: CallStatus,
          duration: CallDuration ? parseInt(CallDuration) : null,
          recordingUrl: RecordingUrl || null,
          transcription: TranscriptionText || null,
          outcome: CallStatus === "completed" ? "connected" : null,
          createdAt: new Date(),
        });

        console.log(`[Twilio Webhook] Created new call tracking for ${CallSid}`);
      }

      // Respond with TwiML (required by Twilio)
      res.type("text/xml");
      res.send("<Response></Response>");
    } catch (error) {
      console.error("[Twilio Webhook] Call status error:", error);
      res.status(500).send("Internal server error");
    }
  });

  /**
   * SMS status webhook
   * Receives updates when SMS status changes (queued, sent, delivered, failed, etc.)
   */
  app.post("/webhooks/twilio/sms-status", async (req: Request, res: Response) => {
    try {
      const {
        MessageSid,
        MessageStatus,
        From,
        To,
        Body,
        ErrorCode,
        ErrorMessage,
      } = req.body;

      console.log(`[Twilio Webhook] SMS status update: ${MessageSid} - ${MessageStatus}`);

      // TODO: Update SMS tracking in database (if we add SMS tracking table)
      // For now, just log the status
      
      if (ErrorCode) {
        console.error(`[Twilio Webhook] SMS error ${ErrorCode}: ${ErrorMessage}`);
      }

      // Respond with empty response (required by Twilio)
      res.status(200).send("OK");
    } catch (error) {
      console.error("[Twilio Webhook] SMS status error:", error);
      res.status(500).send("Internal server error");
    }
  });

  /**
   * Recording status webhook
   * Receives updates when call recording is available
   */
  app.post("/webhooks/twilio/recording-status", async (req: Request, res: Response) => {
    try {
      const {
        CallSid,
        RecordingSid,
        RecordingUrl,
        RecordingStatus,
        RecordingDuration,
      } = req.body;

      console.log(`[Twilio Webhook] Recording status update: ${RecordingSid} - ${RecordingStatus}`);

      if (RecordingStatus === "completed") {
        const db = await getDb();
        if (!db) {
          console.error("[Twilio Webhook] Database not available");
          return res.status(500).send("Database error");
        }

        // Update call tracking with recording info
        await db
          .update(callTracking)
          .set({
            recordingUrl: RecordingUrl,
          })
          .where(eq(callTracking.callSid, CallSid));

        console.log(`[Twilio Webhook] Updated recording for call ${CallSid}`);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("[Twilio Webhook] Recording status error:", error);
      res.status(500).send("Internal server error");
    }
  });

  /**
   * Transcription callback webhook
   * Receives call transcriptions from Twilio
   */
  app.post("/webhooks/twilio/transcription", async (req: Request, res: Response) => {
    try {
      const {
        CallSid,
        TranscriptionText,
        TranscriptionStatus,
      } = req.body;

      console.log(`[Twilio Webhook] Transcription update: ${CallSid} - ${TranscriptionStatus}`);

      if (TranscriptionStatus === "completed" && TranscriptionText) {
        const db = await getDb();
        if (!db) {
          console.error("[Twilio Webhook] Database not available");
          return res.status(500).send("Database error");
        }

        // Update call tracking with transcription
        await db
          .update(callTracking)
          .set({
            transcription: TranscriptionText,
          })
          .where(eq(callTracking.callSid, CallSid));

        console.log(`[Twilio Webhook] Updated transcription for call ${CallSid}`);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("[Twilio Webhook] Transcription error:", error);
      res.status(500).send("Internal server error");
    }
  });

  console.log("[Twilio Webhooks] Routes registered:");
  console.log("  POST /webhooks/twilio/call-status");
  console.log("  POST /webhooks/twilio/sms-status");
  console.log("  POST /webhooks/twilio/recording-status");
  console.log("  POST /webhooks/twilio/transcription");
}
