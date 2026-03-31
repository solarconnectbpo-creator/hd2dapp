import twilio from 'twilio';

/**
 * SMS Service for sending urgent lead notifications via Twilio
 * 
 * Required environment variables:
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 * - TWILIO_PHONE_NUMBER: Your Twilio phone number (format: +1XXXXXXXXXX)
 * - OWNER_PHONE_NUMBER: Phone number to receive SMS alerts (format: +1XXXXXXXXXX)
 */

interface LeadData {
  name: string;
  phone: string;
  email?: string;
  serviceType?: string;
  urgency?: string;
  city?: string;
  message?: string;
}

/**
 * Generic SMS sending function
 * @param to - Phone number to send to (format: +1XXXXXXXXXX)
 * @param message - Message body
 * @returns Promise<boolean> - true if sent successfully, false otherwise
 */
export async function sendSms(to: string, message: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    console.warn('[SMS] Twilio credentials not configured. Skipping SMS.');
    return false;
  }

  try {
    const client = twilio(accountSid, authToken);
    await client.messages.create({
      body: message,
      from: twilioPhone,
      to: to,
    });
    console.log(`[SMS] Sent to ${to}`);
    return true;
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error);
    return false;
  }
}

/**
 * Sends an urgent lead notification via SMS
 * @param leadData - The lead information
 * @returns Promise<boolean> - true if sent successfully, false otherwise
 */
export async function sendUrgentLeadSms(leadData: LeadData): Promise<boolean> {
  // Check if Twilio credentials are configured
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
  const ownerPhone = process.env.OWNER_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone || !ownerPhone) {
    console.warn('[SMS] Twilio credentials not configured. Skipping SMS notification.');
    console.warn('[SMS] Please add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and OWNER_PHONE_NUMBER to your environment variables.');
    return false;
  }

  try {
    const client = twilio(accountSid, authToken);

    // Build SMS message
    const urgencyEmoji = leadData.urgency === 'emergency' ? '🚨' : leadData.urgency === 'high' ? '⚠️' : '📋';
    const smsBody = `
${urgencyEmoji} NIMBUS ROOFING LEAD

Name: ${leadData.name}
Phone: ${leadData.phone}
Service: ${leadData.serviceType || 'Not specified'}
Urgency: ${leadData.urgency?.toUpperCase() || 'NORMAL'}
Location: ${leadData.city || 'Not provided'}

${leadData.message ? `Message: ${leadData.message.substring(0, 100)}${leadData.message.length > 100 ? '...' : ''}` : ''}

Reply or call ${leadData.phone} immediately.
    `.trim();

    console.log('[SMS] Sending urgent lead notification...');
    
    const message = await client.messages.create({
      body: smsBody,
      from: twilioPhone,
      to: ownerPhone,
    });

    console.log('[SMS] SMS sent successfully! SID:', message.sid);
    return true;
  } catch (error) {
    console.error('[SMS] Error sending urgent SMS:', error);
    return false;
  }
}

/**
 * Validates if SMS service is properly configured
 * @returns boolean - true if all required credentials are present
 */
export function isSmsConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.OWNER_PHONE_NUMBER
  );
}
