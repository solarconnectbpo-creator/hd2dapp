import { invokeLLM } from "./_core/llm";

/**
 * AI-Powered Auto-Responder System
 * Intelligently responds to customer inquiries based on context and business knowledge
 */

interface LeadData {
  name: string;
  email: string;
  phone?: string;
  serviceType: string;
  urgency: string;
  location?: string;
  message: string;
}

interface AutoResponderResult {
  subject: string;
  body: string;
  category: "emergency" | "quote_request" | "general_inquiry" | "inspection_request";
  priority: "high" | "medium" | "low";
  suggestedActions: string[];
}

const BUSINESS_CONTEXT = `
You are an AI assistant for Nimbus Roofing, a professional roofing company in McKinney, Texas.

COMPANY INFORMATION:
- Founded: 2015
- Founder: Dustin Moore (Texas All Lines Adjuster License #2820344)
- Phone: (214) 612-6696
- Service Areas: McKinney, Plano, Frisco, Allen, Prosper, and surrounding DFW areas
- Certifications: Owens Corning Preferred Contractor, NTRCA Member
- Specialties: Residential roofing, commercial roofing, storm damage restoration, insurance claims assistance

SERVICES:
1. Residential Roofing - New installations, replacements, architectural shingles
2. Commercial Roofing - TPO, EPDM, and flat roof solutions
3. Storm Damage Restoration - Hail damage, wind damage, emergency repairs
4. Insurance Claims Assistance - Documentation, adjuster meetings, claim support
5. Roof Inspections - Free inspections, identify issues before they become problems
6. Emergency Repairs - 24/7 emergency service available

MATERIALS:
- Owens Corning Duration shingles (Class 3 impact resistant)
- Limited Lifetime Warranty
- 130 MPH wind resistance
- Multiple color options

RESPONSE GUIDELINES:
- Be professional, friendly, and helpful
- Emphasize our certifications and experience (since 2015)
- Offer free inspections for all inquiries
- For emergencies, emphasize 24/7 availability
- For insurance claims, mention our adjuster license and expertise
- Always include contact information: (214) 612-6696
- Mention we serve McKinney and surrounding DFW areas
`;

export async function generateAutoResponse(lead: LeadData): Promise<AutoResponderResult> {
  try {
    const prompt = `${BUSINESS_CONTEXT}

CUSTOMER INQUIRY:
Name: ${lead.name}
Email: ${lead.email}
Phone: ${lead.phone || "Not provided"}
Service Type: ${lead.serviceType}
Urgency: ${lead.urgency}
Location: ${lead.location || "Not specified"}
Message: ${lead.message}

TASK:
Generate a professional, personalized auto-response email for this customer inquiry.

REQUIREMENTS:
1. Categorize the inquiry (emergency, quote_request, general_inquiry, inspection_request)
2. Determine priority level (high, medium, low)
3. Write a warm, professional email response that:
   - Thanks them for contacting us
   - Acknowledges their specific concern
   - Provides relevant information about our services
   - Offers next steps (free inspection, emergency service, etc.)
   - Includes our contact information
   - Sets expectations for follow-up
4. Suggest 2-3 internal actions for the team

Return your response in this exact JSON format:
{
  "subject": "Email subject line",
  "body": "Full email body with proper formatting",
  "category": "emergency|quote_request|general_inquiry|inspection_request",
  "priority": "high|medium|low",
  "suggestedActions": ["Action 1", "Action 2", "Action 3"]
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a professional customer service AI for Nimbus Roofing. Always respond in valid JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "auto_response",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
              category: { 
                type: "string",
                enum: ["emergency", "quote_request", "general_inquiry", "inspection_request"]
              },
              priority: { 
                type: "string",
                enum: ["high", "medium", "low"]
              },
              suggestedActions: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ["subject", "body", "category", "priority", "suggestedActions"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error("No valid response from AI");
    }

    const result = JSON.parse(content) as AutoResponderResult;
    return result;

  } catch (error) {
    console.error("[AI Auto-Responder] Error generating response:", error);
    
    // Fallback response if AI fails
    return {
      subject: `Thank you for contacting Nimbus Roofing, ${lead.name}`,
      body: `Dear ${lead.name},

Thank you for reaching out to Nimbus Roofing. We've received your inquiry about ${lead.serviceType} and will respond shortly.

Our team is reviewing your request and will contact you within 24 hours to discuss your roofing needs.

For urgent matters, please call us directly at (214) 612-6696.

Best regards,
Nimbus Roofing Team
McKinney's Trusted Roofing Experts Since 2015`,
      category: "general_inquiry",
      priority: lead.urgency === "emergency" ? "high" : "medium",
      suggestedActions: [
        "Review customer inquiry",
        "Schedule follow-up call",
        "Prepare service quote"
      ]
    };
  }
}

/**
 * Send auto-response email to customer
 */
export async function sendAutoResponse(
  customerEmail: string,
  response: AutoResponderResult
): Promise<boolean> {
  try {
    // In a real implementation, this would integrate with an email service
    // For now, we'll log it and return success
    console.log("[AI Auto-Responder] Sending email to:", customerEmail);
    console.log("[AI Auto-Responder] Subject:", response.subject);
    console.log("[AI Auto-Responder] Category:", response.category);
    console.log("[AI Auto-Responder] Priority:", response.priority);
    
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // await emailService.send({
    //   to: customerEmail,
    //   from: "info@nimbusroofing.com",
    //   subject: response.subject,
    //   html: response.body.replace(/\n/g, "<br>")
    // });
    
    return true;
  } catch (error) {
    console.error("[AI Auto-Responder] Error sending email:", error);
    return false;
  }
}
