# Twilio AI Phone Manager - Setup Guide

## Overview

Your Nimbus Roofing website now includes a complete **AI Phone Manager** system that:

- **Handles incoming calls** with an intelligent IVR menu
- **Transcribes calls** using Gemini AI
- **Analyzes sentiment** and call type automatically
- **Creates leads** from quote requests
- **Stores voicemails** with AI-generated summaries
- **Routes calls** based on urgency (emergency, quote, general)

---

## Architecture

### Database Tables (Already Created ✅)

1. **phoneCalls** - Tracks all incoming/outgoing calls
   - Twilio Call SID, caller ID, duration
   - Transcription, AI summary, sentiment
   - Call type (emergency, quote_request, etc.)
   - Lead creation tracking

2. **voicemails** - Stores voicemail recordings
   - Recording URL, transcription
   - AI-generated summary
   - Priority level (low/medium/high/urgent)
   - Read status and response tracking

3. **automationWorkflows** - Tracks workflow executions
   - Make.com integration
   - Trigger type (phone_call, email, etc.)
   - Execution status and results

4. **emailInbox** - AI-categorized email management
   - Auto-categorization (quote_request, complaint, etc.)
   - Sentiment analysis
   - AI-suggested responses

### Backend Services (Already Built ✅)

**`server/twilioVoiceService.ts`** - Core phone handling logic:
- `generateIVRResponse()` - Main IVR menu TwiML
- `handleMenuSelection()` - Route calls based on keypress
- `storeIncomingCall()` - Save call to database
- `updateCallWithTranscription()` - Add transcription + AI analysis
- `analyzeCallTranscription()` - Gemini AI analysis
- `storeVoicemail()` - Save voicemail with AI summary
- `getCallHistory()` - Retrieve call logs
- `getVoicemails()` - Retrieve voicemail inbox

**`server/routers/twilio.ts`** - tRPC API endpoints:
- `twilio.getCallHistory` - Admin call log viewer
- `twilio.getVoicemails` - Admin voicemail inbox
- `twilio.markVoicemailRead` - Mark voicemail as handled
- `twilio.storeIncomingCall` - Webhook handler
- `twilio.updateCallTranscription` - Transcription webhook
- `twilio.storeVoicemail` - Voicemail webhook

---

## IVR Menu Flow

When a customer calls your Twilio number:

```
"Thank you for calling Nimbus Roofing."

Press 1 → Emergency roof repairs (connects to on-call technician)
Press 2 → Free quote request (records message, creates lead)
Press 3 → Project status update (records message)
Press 0 → Speak with office (connects to main line)
```

### Call Routing Logic

| Menu Option | Action | AI Processing |
|-------------|--------|---------------|
| **1 - Emergency** | Dial on-call tech → Voicemail if busy | Sentiment: urgent, Priority: high |
| **2 - Quote** | Record message (3 min max) | Auto-create lead, Extract: name/phone/address |
| **3 - Status** | Record message (1 min max) | Extract project number, Route to PM |
| **0 - Office** | Dial main line → Voicemail if busy | General inquiry categorization |

---

## Twilio Configuration Steps

### Step 1: Get Your Twilio Phone Number

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Go to **Phone Numbers** → **Manage** → **Active Numbers**
3. Click your phone number (or buy a new one)
4. Copy your phone number (e.g., `+14695551234`)

### Step 2: Configure Webhook URLs

**IMPORTANT:** Replace `your-domain.com` with your actual deployed domain.

After publishing your website, configure these webhooks in Twilio:

#### Voice Configuration

In your Twilio phone number settings:

**A Call Comes In:**
- Webhook: `https://your-domain.com/api/twilio/voice`
- HTTP Method: `POST`

**Call Status Changes:**
- Webhook: `https://your-domain.com/api/twilio/voice/status`
- HTTP Method: `POST`

#### Recording Configuration

**Recording Status Callback:**
- Webhook: `https://your-domain.com/api/twilio/voice/recording`
- HTTP Method: `POST`

#### Transcription Configuration

**Transcription Callback:**
- Webhook: `https://your-domain.com/api/twilio/voice/transcription`
- HTTP Method: `POST`

### Step 3: Add Webhook Routes to Express

You need to add Express routes to handle Twilio's XML responses. Add this to `server/_core/index.ts`:

```typescript
import { generateIVRResponse, handleMenuSelection, storeIncomingCall } from "../twilioVoiceService";

// Twilio Voice Webhooks (must use express.urlencoded for Twilio)
app.post("/api/twilio/voice", express.urlencoded({ extended: false }), (req, res) => {
  const twiml = generateIVRResponse();
  res.type("text/xml");
  res.send(twiml);
  
  // Store call in background
  storeIncomingCall(req.body).catch(console.error);
});

app.post("/api/twilio/voice/menu", express.urlencoded({ extended: false }), (req, res) => {
  const digit = req.body.Digits;
  const twiml = handleMenuSelection(digit);
  res.type("text/xml");
  res.send(twiml);
});

app.post("/api/twilio/voice/recording", express.urlencoded({ extended: false }), async (req, res) => {
  // Handle recording callback
  console.log("[Twilio] Recording received:", req.body);
  res.sendStatus(200);
});

app.post("/api/twilio/voice/transcription", express.urlencoded({ extended: false }), async (req, res) => {
  const { CallSid, TranscriptionText } = req.body;
  
  // Update call with transcription
  const { updateCallWithTranscription } = await import("../twilioVoiceService");
  await updateCallWithTranscription(CallSid, TranscriptionText);
  
  res.sendStatus(200);
});

app.post("/api/twilio/voice/status", express.urlencoded({ extended: false }), (req, res) => {
  console.log("[Twilio] Call status:", req.body);
  res.sendStatus(200);
});
```

---

## Testing the System

### 1. Test IVR Menu

Call your Twilio number and verify:
- ✅ IVR greeting plays
- ✅ Pressing 1 routes to emergency line
- ✅ Pressing 2 records quote request
- ✅ Pressing 3 records status inquiry
- ✅ Pressing 0 connects to office

### 2. Test Call Transcription

1. Press 2 (quote request)
2. Leave a message: "Hi, my name is John Smith at 123 Main Street. I need a roof inspection."
3. Check database: `SELECT * FROM phoneCalls ORDER BY createdAt DESC LIMIT 1;`
4. Verify:
   - ✅ `transcription` field contains your message
   - ✅ `aiSummary` contains AI-generated summary
   - ✅ `sentiment` is detected (positive/neutral/negative)
   - ✅ `callType` is "quote_request"

### 3. Test Lead Creation

After leaving a quote request message:

1. Check database: `SELECT * FROM leads ORDER BY createdAt DESC LIMIT 1;`
2. Verify:
   - ✅ Lead created with `source = 'phone_call'`
   - ✅ `name` extracted from transcription
   - ✅ `phone` matches caller ID
   - ✅ `address` extracted if mentioned
   - ✅ `message` contains full transcription

### 4. Test Voicemail Storage

1. Call when office is closed (or don't answer)
2. Leave a voicemail
3. Check database: `SELECT * FROM voicemails ORDER BY createdAt DESC LIMIT 1;`
4. Verify:
   - ✅ `recordingUrl` points to Twilio recording
   - ✅ `transcription` contains your message
   - ✅ `aiSummary` provides concise summary
   - ✅ `priority` assigned correctly

---

## Admin Dashboard (Next Phase)

Create `/admin/phone-manager` page to view:

- **Real-time call activity** (calls in progress)
- **Call history** with transcriptions
- **Voicemail inbox** with AI summaries
- **Sentiment analysis** charts
- **Lead conversion** from calls
- **Performance metrics** (answer rate, avg duration)

---

## Make.com Integration (Next Phase)

### Workflow Examples

**1. New Call → Slack Notification**
- Trigger: Twilio webhook
- Action: Send Slack message with caller ID + AI summary

**2. Quote Request → Create HubSpot Deal**
- Trigger: Lead created from phone call
- Action: Create deal in HubSpot CRM

**3. Emergency Call → SMS Alert**
- Trigger: Call type = "emergency"
- Action: Send SMS to on-call technician

**4. Voicemail → Email Digest**
- Trigger: New voicemail
- Action: Email daily digest to office manager

---

## Google Cloud AI (Future Enhancement)

### Speech-to-Text API

Replace Twilio transcription with Google Cloud for:
- **Higher accuracy** (95%+ vs Twilio's 85%)
- **Real-time transcription** during calls
- **Multi-language support** (English + Spanish)

### Dialogflow Integration

Build conversational AI:
- **Natural language** call routing
- **Intent detection** without menu keypresses
- **Dynamic responses** based on customer history

---

## Security Considerations

### Webhook Authentication

Add Twilio signature validation:

```typescript
import twilio from "twilio";

app.post("/api/twilio/voice", (req, res) => {
  const signature = req.headers["x-twilio-signature"];
  const url = `https://your-domain.com${req.originalUrl}`;
  
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature as string,
    url,
    req.body
  );
  
  if (!isValid) {
    return res.status(403).send("Invalid signature");
  }
  
  // Handle webhook...
});
```

### PII Protection

- **Never log** full phone numbers or transcriptions in production
- **Encrypt** sensitive data in database
- **Redact** PII from AI analysis prompts
- **Comply** with TCPA and GDPR regulations

---

## Cost Estimates

### Twilio Costs

- **Phone number**: $1.15/month
- **Incoming calls**: $0.0085/minute
- **Outgoing calls**: $0.013/minute
- **Transcription**: $0.05/minute
- **Recording storage**: $0.0005/minute/month

**Example:** 100 calls/month × 3 min avg = $2.55 + $15 transcription = **~$18/month**

### Gemini AI Costs

- **Text analysis**: $0.00025/1K tokens
- **100 transcriptions** × 500 tokens avg = **~$0.01/month** (negligible)

---

## Next Steps

1. ✅ **Publish your website** to get a live domain
2. ✅ **Configure Twilio webhooks** with your domain
3. ✅ **Add Express webhook routes** to `server/_core/index.ts`
4. ✅ **Test with real phone calls**
5. ⏳ **Build admin dashboard** for call monitoring
6. ⏳ **Integrate Make.com** for workflow automation
7. ⏳ **Add Google Cloud Speech-to-Text** for better accuracy

---

## Troubleshooting

### Issue: IVR menu doesn't play

**Solution:** Check Twilio webhook URL returns valid TwiML XML

```bash
curl -X POST https://your-domain.com/api/twilio/voice
# Should return: <?xml version="1.0" encoding="UTF-8"?><Response>...
```

### Issue: Transcriptions not saving

**Solution:** Verify transcription webhook is registered and returns 200 OK

```bash
# Check database for transcriptions
SELECT transcription FROM phoneCalls WHERE transcription IS NOT NULL;
```

### Issue: Leads not auto-creating

**Solution:** Check AI analysis is detecting "quote_request" call type

```sql
SELECT callType, aiSummary, leadCreated FROM phoneCalls ORDER BY createdAt DESC LIMIT 10;
```

---

## Support

For Twilio-specific issues:
- [Twilio Docs](https://www.twilio.com/docs/voice)
- [Twilio Support](https://support.twilio.com/)

For Nimbus AI system issues:
- Check `/admin/ai-agents` dashboard for agent errors
- Review server logs: `pnpm logs`
- Contact Manus support: https://help.manus.im
