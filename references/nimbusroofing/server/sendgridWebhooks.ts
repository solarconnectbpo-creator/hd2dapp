import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { emailDeliveryLogs, emailEvents, InsertEmailEvent } from "../drizzle/schema";
import { realtimeNotifications } from "./realtimeNotifications";

/**
 * SendGrid Webhook Handler
 * Processes delivery events from SendGrid (delivered, bounce, open, click, etc.)
 * 
 * Webhook URL: POST /webhooks/sendgrid/events
 * 
 * Setup in SendGrid:
 * 1. Go to Settings → Mail Settings → Event Webhook
 * 2. Enable Event Notification
 * 3. Set HTTP Post URL: https://your-domain.com/webhooks/sendgrid/events
 * 4. Select events: Delivered, Bounce, Open, Click, Dropped, Spam Report, Unsubscribe
 * 5. Save
 */

interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  sg_message_id: string;
  sg_event_id: string;
  reason?: string;
  status?: string;
  response?: string;
  url?: string;
  useragent?: string;
  ip?: string;
  category?: string[];
  [key: string]: any;
}

/**
 * Handle SendGrid webhook events
 */
export async function handleSendGridWebhook(req: Request, res: Response) {
  try {
    const events: SendGridEvent[] = req.body;

    if (!Array.isArray(events)) {
      console.error("[SendGrid Webhook] Invalid payload: expected array");
      return res.status(400).json({ error: "Invalid payload" });
    }

    console.log(`[SendGrid Webhook] Received ${events.length} events`);

    const db = await getDb();
    if (!db) {
      console.error("[SendGrid Webhook] Database not available");
      return res.status(500).json({ error: "Database unavailable" });
    }

    // Process each event
    for (const event of events) {
      try {
        await processEvent(event, db);
      } catch (error) {
        console.error(`[SendGrid Webhook] Error processing event ${event.sg_event_id}:`, error);
        // Continue processing other events
      }
    }

    // Send success response
    res.status(200).json({ received: events.length });
  } catch (error) {
    console.error("[SendGrid Webhook] Error handling webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Process a single SendGrid event
 */
async function processEvent(event: SendGridEvent, db: any) {
  const messageId = extractMessageId(event.sg_message_id);
  
  // Find the email log entry
  const emailLogs = await db
    .select()
    .from(emailDeliveryLogs)
    .where(eq(emailDeliveryLogs.messageId, messageId))
    .limit(1);

  if (emailLogs.length === 0) {
    console.warn(`[SendGrid Webhook] Email log not found for message ID: ${messageId}`);
    // Still store the event for debugging
  }

  const emailLogId = emailLogs.length > 0 ? emailLogs[0].id : null;

  // Map SendGrid event to our enum
  const eventType = mapSendGridEvent(event.event);
  if (!eventType) {
    console.warn(`[SendGrid Webhook] Unknown event type: ${event.event}`);
    return;
  }

  // Store the event
  const eventData: InsertEmailEvent = {
    emailLogId: emailLogId || 0, // Use 0 if not found
    messageId,
    event: eventType,
    reason: event.reason || event.response || null,
    url: event.url || null,
    userAgent: event.useragent || null,
    ip: event.ip || null,
    timestamp: new Date(event.timestamp * 1000),
    rawPayload: JSON.stringify(event),
  };

  await db.insert(emailEvents).values(eventData);

  // Update the email log status
  if (emailLogId) {
    await updateEmailLogStatus(emailLogId, event, db);
    
    // Send real-time notification for important events
    if (["bounce", "dropped", "spam_report"].includes(event.event)) {
      realtimeNotifications.broadcast({
        type: "email_event",
        data: {
          messageId,
          event: event.event,
          email: event.email,
          reason: event.reason || event.response,
        },
      });
    }
  }

  console.log(`[SendGrid Webhook] Processed ${event.event} for ${event.email}`);
}

/**
 * Update email log status based on event
 */
async function updateEmailLogStatus(emailLogId: number, event: SendGridEvent, db: any) {
  const timestamp = new Date(event.timestamp * 1000);
  
  switch (event.event) {
    case "delivered":
      await db
        .update(emailDeliveryLogs)
        .set({
          status: "delivered",
          deliveredAt: timestamp,
        })
        .where(eq(emailDeliveryLogs.id, emailLogId));
      break;

    case "bounce":
    case "dropped":
      await db
        .update(emailDeliveryLogs)
        .set({
          status: "bounced",
          bouncedAt: timestamp,
          bounceReason: event.reason || event.response || "Unknown",
        })
        .where(eq(emailDeliveryLogs.id, emailLogId));
      break;

    case "deferred":
      // Deferred is temporary, don't change status
      break;

    case "open":
      await db
        .update(emailDeliveryLogs)
        .set({
          status: "opened",
          openedAt: timestamp,
        })
        .where(eq(emailDeliveryLogs.id, emailLogId));
      break;

    case "click":
      await db
        .update(emailDeliveryLogs)
        .set({
          status: "clicked",
          clickedAt: timestamp,
        })
        .where(eq(emailDeliveryLogs.id, emailLogId));
      break;

    case "spam_report":
    case "unsubscribe":
      // These don't change delivery status but are tracked in events
      break;
  }
}

/**
 * Extract message ID from SendGrid format
 * Format: <messageId>.filter0001.12345.6789ABCD@ismtpd0001p1lon1.sendgrid.net>
 */
function extractMessageId(sgMessageId: string): string {
  // Remove angle brackets if present
  let id = sgMessageId.replace(/[<>]/g, "");
  
  // Extract the first part before .filter
  const parts = id.split(".filter");
  return parts[0];
}

/**
 * Map SendGrid event names to our enum values
 */
function mapSendGridEvent(event: string): "processed" | "delivered" | "bounce" | "dropped" | "deferred" | "open" | "click" | "spam_report" | "unsubscribe" | null {
  const eventMap: Record<string, any> = {
    processed: "processed",
    delivered: "delivered",
    bounce: "bounce",
    dropped: "dropped",
    deferred: "deferred",
    open: "open",
    click: "click",
    spamreport: "spam_report",
    unsubscribe: "unsubscribe",
  };

  return eventMap[event.toLowerCase()] || null;
}

/**
 * Verify SendGrid webhook signature (optional but recommended)
 * Requires SENDGRID_WEBHOOK_VERIFICATION_KEY environment variable
 */
export function verifySendGridSignature(req: Request): boolean {
  const verificationKey = process.env.SENDGRID_WEBHOOK_VERIFICATION_KEY;
  
  if (!verificationKey) {
    // If no key is configured, skip verification (not recommended for production)
    return true;
  }

  const signature = req.headers["x-twilio-email-event-webhook-signature"];
  const timestamp = req.headers["x-twilio-email-event-webhook-timestamp"];

  if (!signature || !timestamp) {
    return false;
  }

  // Implement HMAC SHA256 verification
  // See: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
  
  const crypto = require("crypto");
  const payload = timestamp + JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac("sha256", verificationKey)
    .update(payload)
    .digest("base64");

  return signature === expectedSignature;
}
