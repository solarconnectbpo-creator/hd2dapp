import sgMail from "@sendgrid/mail";

/**
 * SendGrid Email Service for Nimbus Roofing
 * Handles transactional emails with proper SPF/DKIM authentication
 * 
 * Required environment variable:
 * - SENDGRID_API_KEY: Your SendGrid API key
 */

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("[Email] SENDGRID_API_KEY not configured. Email sending disabled.");
}

// Email configuration
const FROM_EMAIL = "notifications@nimbusroofing.com"; // Must match SPF/DKIM domain
const FROM_NAME = "Nimbus Roofing";
const REPLY_TO = "info@nimbusroofing.com";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn("[Email] SendGrid not configured. Skipping email.");
    return false;
  }

  try {
    const msg = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      replyTo: options.replyTo || REPLY_TO,
      subject: options.subject,
      text: options.text || stripHtml(options.html),
      html: options.html,
      // Required for Gmail compliance
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
      // One-click unsubscribe (Gmail requirement)
      mailSettings: {
        bypassListManagement: { enable: false },
      },
    };

    await sgMail.send(msg);
    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error: any) {
    console.error("[Email] Error sending email:", error.response?.body || error.message);
    return false;
  }
}

/**
 * Send callback confirmation email
 */
export async function sendCallbackConfirmation(data: {
  name: string;
  email: string;
  phone: string;
  preferredTime?: string;
  requestedDate?: string;
}): Promise<boolean> {
  const subject = "Callback Request Confirmed - Nimbus Roofing";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Nimbus Roofing</h1>
    <p style="color: #e0e7ff; margin: 10px 0 0 0;">McKinney's Trusted Roofing Experts</p>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1e40af; margin-top: 0;">Callback Request Confirmed!</h2>
    
    <p>Hi ${data.name},</p>
    
    <p>Thank you for requesting a callback from Nimbus Roofing. We've received your request and will contact you shortly.</p>
    
    <div style="background: white; padding: 20px; border-left: 4px solid #3b82f6; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #1e40af;">Your Request Details:</h3>
      <p style="margin: 5px 0;"><strong>Phone:</strong> ${data.phone}</p>
      ${data.preferredTime ? `<p style="margin: 5px 0;"><strong>Preferred Time:</strong> ${data.preferredTime}</p>` : ''}
      ${data.requestedDate ? `<p style="margin: 5px 0;"><strong>Requested Date:</strong> ${data.requestedDate}</p>` : ''}
    </div>
    
    <p><strong>What happens next?</strong></p>
    <ul style="padding-left: 20px;">
      <li>Our team will review your request</li>
      <li>We'll call you at ${data.phone} within 24 hours</li>
      <li>We'll discuss your roofing needs and schedule an inspection if needed</li>
    </ul>
    
    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0;"><strong>🚨 Emergency?</strong> Call us now: <a href="tel:+12146126696" style="color: #dc2626; text-decoration: none; font-weight: bold;">(214) 612-6696</a></p>
    </div>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>Nimbus Roofing Team</strong></p>
    
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #64748b; text-align: center;">
      Nimbus Roofing | McKinney, TX<br>
      Phone: (214) 612-6696 | Email: info@nimbusroofing.com<br>
      <a href="https://nimbusroofing.com" style="color: #3b82f6; text-decoration: none;">www.nimbusroofing.com</a>
    </p>
    
    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 20px;">
      <a href="{{unsubscribe}}" style="color: #94a3b8;">Unsubscribe</a> from callback notifications
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.email,
    subject,
    html,
  });
}

/**
 * Send lead notification email to owner
 */
export async function sendLeadNotification(data: {
  name: string;
  email: string;
  phone: string;
  serviceType?: string;
  urgency?: string;
  message?: string;
  source?: string;
}): Promise<boolean> {
  const ownerEmail = process.env.OWNER_EMAIL || "info@nimbusroofing.com";
  const urgencyEmoji = data.urgency === 'emergency' ? '🚨' : data.urgency === 'high' ? '⚠️' : '📋';
  
  const subject = `${urgencyEmoji} New Lead: ${data.name} - ${data.serviceType || 'General Inquiry'}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${data.urgency === 'emergency' ? '#dc2626' : data.urgency === 'high' ? '#f59e0b' : '#3b82f6'}; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${urgencyEmoji} New Lead Alert</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #1e40af; margin-top: 0;">Lead Information</h2>
    
    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Name:</strong> ${data.name}</p>
      <p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${data.phone}" style="color: #3b82f6;">${data.phone}</a></p>
      <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color: #3b82f6;">${data.email}</a></p>
      ${data.serviceType ? `<p style="margin: 5px 0;"><strong>Service Type:</strong> ${data.serviceType}</p>` : ''}
      ${data.urgency ? `<p style="margin: 5px 0;"><strong>Urgency:</strong> <span style="color: ${data.urgency === 'emergency' ? '#dc2626' : data.urgency === 'high' ? '#f59e0b' : '#3b82f6'}; font-weight: bold;">${data.urgency.toUpperCase()}</span></p>` : ''}
      ${data.source ? `<p style="margin: 5px 0;"><strong>Source:</strong> ${data.source}</p>` : ''}
    </div>
    
    ${data.message ? `
    <div style="background: white; padding: 20px; border-left: 4px solid #3b82f6; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #1e40af;">Message:</h3>
      <p style="margin: 0;">${data.message}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="tel:${data.phone}" style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">📞 Call Now</a>
    </div>
    
    <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 30px;">
      This lead was generated via ${data.source || 'website'} at ${new Date().toLocaleString()}
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: ownerEmail,
    subject,
    html,
  });
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
