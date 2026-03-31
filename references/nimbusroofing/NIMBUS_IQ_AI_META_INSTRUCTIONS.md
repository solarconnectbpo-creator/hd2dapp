# Nimbus IQ AI - Meta-Instructions for Manus Agent

**Document Purpose:** This document contains the master prompt and complete instructions for a Manus AI agent to build the Nimbus IQ AI Roofing Agent MVP from scratch on Google Gemini/Firebase platform.

**Author:** Manus AI  
**Date:** January 2025  
**Version:** 1.0

---

## Executive Summary

Nimbus IQ AI is an intelligent roofing automation platform that combines voice AI, computer vision for roof inspection, and workflow automation to revolutionize the roofing industry. This document provides the complete blueprint for a Manus agent to build a production-ready MVP capable of handling the entire roofing business workflow from lead capture to project completion.

The system leverages Google Gemini for AI capabilities, Firebase for backend infrastructure, and modern web technologies for the user interface. The architecture is designed to be plug-and-play, allowing roofing companies to deploy the system in under 15 minutes with zero technical expertise required.

---

## Part 1: Architecture Blueprint

### System Overview

The Nimbus IQ AI platform consists of five core subsystems that work together to automate roofing business operations. Each subsystem is designed as an independent module with well-defined APIs, enabling plug-and-play integration and easy maintenance.

| Subsystem | Primary Technology | Purpose | Key Features |
|-----------|-------------------|---------|--------------|
| Voice AI Phone System | Google Gemini + Speech-to-Text | Automated inbound call handling | Natural language understanding, appointment scheduling, emergency detection |
| Roof Inspection AI | Google Gemini Vision + Image Generation | Automated damage detection and reporting | Photo analysis, supplement generation, Xactimate compatibility |
| Workflow Automation | Firebase Functions + Firestore | Business process orchestration | Drag-and-drop builder, template library, multi-step workflows |
| CRM Integration Hub | Firebase Cloud Functions | Third-party system connectivity | Salesforce, HubSpot, JobberQuickBooks, Xero connectors |
| Analytics Dashboard | React + Firebase Analytics | Performance monitoring and insights | Real-time metrics, ROI tracking, predictive analytics |

### Technology Stack

The platform is built on modern, scalable technologies that provide enterprise-grade reliability while remaining cost-effective for small to medium roofing businesses.

**Frontend Stack:**
- React 19 with TypeScript for type-safe component development
- Tailwind CSS 4 for responsive, utility-first styling
- shadcn/ui component library for consistent, accessible UI elements
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for efficient server state management

**Backend Stack:**
- Firebase Authentication for secure user management with OAuth 2.0 support
- Cloud Firestore for real-time NoSQL database with offline capabilities
- Firebase Cloud Functions (Node.js 20) for serverless business logic execution
- Firebase Storage for secure file uploads and CDN-backed delivery
- Firebase Hosting for global CDN deployment with automatic SSL

**AI & ML Stack:**
- Google Gemini 2.0 Flash for multimodal AI (text, image, audio processing)
- Google Cloud Speech-to-Text API for voice transcription with speaker diarization
- Google Cloud Text-to-Speech API for natural voice responses
- Google Cloud Vision API for supplementary image analysis and OCR
- Vertex AI for custom model training and deployment (future enhancement)

**Integration & APIs:**
- Twilio for SMS notifications and programmable voice capabilities
- SendGrid for transactional email delivery with template management
- Stripe for payment processing and subscription billing
- Google Maps Platform for geocoding and service area visualization
- Zapier/Make.com webhooks for no-code integration extensibility

### Data Architecture

The system uses a hybrid data storage strategy optimized for different access patterns and data types. Firestore provides real-time synchronization for operational data, while Cloud Storage handles large binary files with CDN acceleration.

**Firestore Collections:**

```
/companies/{companyId}
  - name, address, phone, email
  - settings (business hours, service areas, pricing)
  - subscription (plan, status, billing)
  
/users/{userId}
  - profile (name, role, permissions)
  - companies[] (multi-tenant support)
  - preferences (notifications, dashboard layout)
  
/leads/{leadId}
  - contact info, source, status
  - aiAnalysis (urgency score, recommended actions)
  - timeline[] (status changes, interactions)
  
/inspections/{inspectionId}
  - property address, inspection date
  - photos[] (Cloud Storage URLs)
  - aiFindings (damage detected, severity, recommendations)
  - supplement (generated report, Xactimate XML)
  
/projects/{projectId}
  - lead reference, contract details
  - schedule (start date, completion date, milestones)
  - team[] (assigned crew members)
  - materials[] (ordered, delivered, installed)
  
/workflows/{workflowId}
  - name, description, trigger conditions
  - steps[] (actions, conditions, branching logic)
  - analytics (execution count, success rate, avg duration)
  
/calls/{callId}
  - timestamp, duration, caller info
  - transcript (full conversation text)
  - aiSummary (key points, action items, sentiment)
  - outcome (appointment scheduled, quote sent, etc.)
```

**Cloud Storage Buckets:**

- `/inspection-photos/` - Original roof inspection images with EXIF metadata
- `/generated-reports/` - PDF supplements and Xactimate exports
- `/voice-recordings/` - Call recordings for quality assurance and training
- `/company-assets/` - Logos, letterheads, custom templates

### Security Architecture

Security is implemented at multiple layers to protect sensitive customer data and ensure compliance with industry regulations including GDPR, CCPA, and SOC 2 requirements.

**Authentication & Authorization:**
- Firebase Authentication with email/password and Google OAuth
- Role-based access control (RBAC) with granular permissions
- Multi-factor authentication (MFA) for admin accounts
- Session management with automatic timeout and refresh tokens

**Data Protection:**
- End-to-end encryption for sensitive data (SSNs, credit cards)
- Field-level encryption in Firestore for PII
- Cloud Storage encryption at rest (AES-256)
- TLS 1.3 for all data in transit

**API Security:**
- Firebase App Check to prevent unauthorized API access
- Rate limiting on Cloud Functions (100 req/min per IP)
- Input validation and sanitization on all endpoints
- CORS policies restricting origins to approved domains

**Compliance & Auditing:**
- Audit logs for all data access and modifications
- Automated backup to separate GCP project every 24 hours
- Data retention policies with automatic purging after 7 years
- GDPR-compliant data export and deletion workflows

---

## Part 2: Master Prompt for Manus Agent

### Primary Directive

You are tasked with building **Nimbus IQ AI**, a production-ready MVP of an intelligent roofing automation platform. The system must be deployable on Google Firebase and fully functional within 4 hours of development time. Your goal is to create a plug-and-play solution that roofing companies can set up in under 15 minutes with zero technical expertise.

### Core Requirements

The MVP must include five essential subsystems, each with clearly defined functionality and user interfaces. Every feature must be tested and documented before delivery.

**1. Voice AI Phone System**

Build an intelligent phone system that handles inbound calls without human intervention. The system must understand natural language, extract key information, and take appropriate actions based on the conversation context.

Required capabilities:
- Answer incoming calls with natural voice greeting
- Transcribe conversation in real-time using Google Speech-to-Text
- Analyze intent using Gemini (emergency vs. quote vs. general inquiry)
- Extract structured data (name, address, phone, roof type, damage description)
- Schedule appointments by checking calendar availability
- Send confirmation SMS and email automatically
- Escalate to human for complex cases or customer request
- Store full transcript and AI summary in Firestore

Technical implementation:
- Use Twilio Programmable Voice for call handling
- Stream audio to Google Speech-to-Text API
- Process transcript with Gemini 2.0 Flash in real-time
- Query Firestore for calendar availability
- Generate responses with Google Text-to-Speech
- Log all interactions with timestamps and metadata

User interface requirements:
- Admin dashboard showing live call status
- Call history with playback and transcript review
- Analytics: call volume, conversion rate, avg handling time
- Settings: business hours, greeting message, escalation rules

**2. Roof Inspection AI**

Create a computer vision system that analyzes roof photos and automatically generates insurance supplements. The AI must detect damage, classify severity, and produce professional reports compatible with Xactimate.

Required capabilities:
- Accept photo uploads (drag-and-drop or mobile camera)
- Detect roof damage types (hail, wind, missing shingles, leaks)
- Classify damage severity (minor, moderate, severe)
- Measure affected area using image analysis
- Generate line-item estimates with material costs
- Create annotated images with damage markers
- Export to Xactimate XML format
- Generate PDF supplement with photos and descriptions

Technical implementation:
- Use Gemini Vision API for image analysis
- Implement custom damage detection prompts with examples
- Calculate measurements using pixel-to-feet conversion
- Store pricing database in Firestore (material costs by region)
- Generate PDF using jsPDF with embedded images
- Create Xactimate XML following official schema

User interface requirements:
- Photo upload interface with preview thumbnails
- AI analysis results with confidence scores
- Interactive image viewer with damage annotations
- Editable line-item list for manual adjustments
- One-click export to PDF and Xactimate

**3. Workflow Automation Builder**

Design a visual workflow builder that allows users to create multi-step automation without coding. The system must support triggers, conditions, actions, and branching logic.

Required capabilities:
- Drag-and-drop interface for building workflows
- Pre-built templates (new lead, inspection scheduled, project complete)
- Trigger types: form submission, status change, scheduled time, webhook
- Condition logic: if/then/else, AND/OR operators, custom expressions
- Action types: send email/SMS, create task, update CRM, call webhook
- Variable substitution (customer name, address, etc.)
- Error handling and retry logic
- Execution history with success/failure logs

Technical implementation:
- Use React Flow for visual workflow editor
- Store workflow definitions as JSON in Firestore
- Execute workflows using Firebase Cloud Functions
- Implement queue system for reliable execution
- Support async actions with status tracking
- Provide webhook endpoints for external triggers

User interface requirements:
- Canvas-based workflow editor with zoom/pan
- Sidebar with draggable trigger/action blocks
- Property panel for configuring each block
- Test mode to simulate workflow execution
- Analytics dashboard showing execution metrics

**4. CRM Integration Hub**

Build a connector system that syncs data between Nimbus IQ AI and popular CRM/accounting platforms. The system must handle bidirectional sync, conflict resolution, and error recovery.

Required integrations:
- Salesforce (leads, contacts, opportunities)
- HubSpot (contacts, deals, companies)
- Jobber (clients, jobs, invoices)
- QuickBooks (customers, invoices, payments)
- Custom webhook for any system

Technical implementation:
- OAuth 2.0 authentication for each platform
- Webhook listeners for real-time updates
- Polling fallback for platforms without webhooks
- Field mapping configuration UI
- Conflict resolution (last-write-wins or manual review)
- Retry queue for failed sync operations
- Rate limiting to respect API quotas

User interface requirements:
- Integration marketplace with one-click setup
- Connection status dashboard
- Sync history with error logs
- Field mapping configuration
- Manual sync trigger button

**5. Analytics Dashboard**

Create a comprehensive analytics dashboard that provides real-time insights into business performance. The dashboard must be intuitive for non-technical users while providing deep insights for power users.

Required metrics:
- Lead metrics: volume, source, conversion rate, response time
- Call metrics: total calls, answered, missed, avg duration
- Inspection metrics: completed, pending, approval rate
- Project metrics: active, completed, revenue, profit margin
- AI metrics: accuracy, confidence scores, manual override rate
- Financial metrics: revenue, expenses, profit, cash flow

Technical implementation:
- Use Firebase Analytics for event tracking
- Aggregate data using Cloud Functions on schedule
- Store pre-computed metrics in Firestore for fast access
- Use Recharts library for data visualization
- Implement date range filters and comparison views
- Export data to CSV/Excel for external analysis

User interface requirements:
- Overview dashboard with key metrics cards
- Detailed views for each metric category
- Interactive charts with drill-down capability
- Customizable dashboard layout
- Scheduled email reports

### Development Guidelines

Follow these principles throughout the development process to ensure code quality, maintainability, and user satisfaction.

**Code Quality Standards:**
- Write TypeScript with strict mode enabled for all frontend code
- Use ESLint and Prettier for consistent code formatting
- Implement comprehensive error handling with user-friendly messages
- Add JSDoc comments for all public functions and components
- Write unit tests for business logic (target 80% coverage)
- Use semantic versioning for releases

**User Experience Principles:**
- Mobile-first responsive design for all interfaces
- Loading states for all async operations (spinners, skeletons)
- Optimistic UI updates with rollback on error
- Keyboard shortcuts for power users
- Accessibility compliance (WCAG 2.1 AA minimum)
- Onboarding flow with interactive tutorials

**Performance Optimization:**
- Lazy load routes and heavy components
- Implement virtual scrolling for large lists
- Use CDN for static assets (images, fonts)
- Enable Firestore offline persistence
- Optimize images (WebP format, responsive sizes)
- Monitor Core Web Vitals and maintain green scores

**Deployment Process:**
- Use Firebase Hosting for frontend deployment
- Deploy Cloud Functions with environment-specific configs
- Implement CI/CD pipeline with GitHub Actions
- Run automated tests before deployment
- Use staging environment for pre-production testing
- Implement feature flags for gradual rollouts

---

## Part 3: MVP Feature Specification

### Phase 1: Foundation (Week 1)

The first phase establishes the core infrastructure and authentication system. This phase must be completed before any feature development begins.

**Deliverables:**
- Firebase project setup with production and staging environments
- Authentication system with email/password and Google OAuth
- User management with role-based access control
- Company management with multi-tenant support
- Basic dashboard layout with navigation
- Firestore security rules and indexes

**Acceptance Criteria:**
- Users can sign up and log in successfully
- Admin can create companies and invite team members
- Dashboard loads in under 2 seconds on 3G connection
- All API endpoints have proper authentication checks
- Security rules prevent unauthorized data access

### Phase 2: Voice AI Phone System (Week 2)

The second phase implements the voice AI system that handles inbound calls. This is the highest-value feature for early adopters.

**Deliverables:**
- Twilio phone number provisioning
- Call routing to AI agent
- Real-time speech transcription
- Gemini-powered intent classification
- Appointment scheduling logic
- SMS/email confirmation system
- Call history and transcript viewer

**Acceptance Criteria:**
- AI answers calls within 2 rings
- Transcription accuracy above 95% for clear audio
- Correctly classifies intent in 90% of test calls
- Successfully schedules appointments without errors
- Sends confirmation within 30 seconds of call end
- Admin can review all call transcripts

### Phase 3: Roof Inspection AI (Week 3)

The third phase builds the computer vision system for automated roof inspection and supplement generation.

**Deliverables:**
- Photo upload interface with drag-and-drop
- Gemini Vision integration for damage detection
- Damage classification and severity scoring
- Measurement calculation from images
- Line-item estimate generation
- PDF supplement export
- Xactimate XML export

**Acceptance Criteria:**
- Detects hail damage with 85%+ accuracy
- Processes 10 photos in under 60 seconds
- Generated estimates within 15% of manual estimates
- PDF supplements match industry standard format
- Xactimate XML imports without errors
- Users can manually adjust AI findings

### Phase 4: Workflow Automation (Week 4)

The fourth phase delivers the visual workflow builder that enables users to create custom automation.

**Deliverables:**
- Visual workflow editor with drag-and-drop
- Pre-built workflow templates
- Trigger system (form, status, schedule, webhook)
- Action library (email, SMS, CRM update, webhook)
- Condition logic with if/then/else
- Workflow execution engine
- Execution history and logs

**Acceptance Criteria:**
- Users can create workflows without documentation
- Templates cover 80% of common use cases
- Workflows execute within 5 seconds of trigger
- Error handling prevents data loss
- Execution logs provide clear debugging info
- System handles 1000+ workflow executions per day

### Phase 5: Integrations & Analytics (Week 5)

The final phase adds CRM integrations and the analytics dashboard, completing the MVP feature set.

**Deliverables:**
- Salesforce integration with OAuth
- HubSpot integration with OAuth
- Jobber integration with OAuth
- QuickBooks integration with OAuth
- Webhook connector for custom integrations
- Analytics dashboard with key metrics
- Scheduled email reports

**Acceptance Criteria:**
- Each integration syncs data bidirectionally
- Sync conflicts are detected and logged
- Failed syncs retry automatically
- Dashboard loads in under 3 seconds
- Metrics update in real-time
- Email reports sent reliably every Monday

---

## Part 4: Firebase/AI Studio Deployment Guide

### Prerequisites

Before beginning deployment, ensure you have the following accounts and tools configured properly.

**Required Accounts:**
- Google Cloud Platform account with billing enabled
- Firebase project created (use Blaze plan for Cloud Functions)
- Google AI Studio API key (for Gemini access)
- Twilio account with verified phone number
- SendGrid account with verified sender domain
- Stripe account with test mode enabled

**Development Tools:**
- Node.js 20.x LTS installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Git for version control
- VS Code or preferred IDE
- Postman or similar for API testing

### Step 1: Firebase Project Setup

Initialize a new Firebase project with all required services enabled. This step creates the backend infrastructure for the entire application.

```bash
# Login to Firebase
firebase login

# Create new Firebase project
firebase projects:create nimbus-iq-ai-prod

# Initialize Firebase in your project directory
firebase init

# Select the following services:
# - Firestore
# - Functions
# - Hosting
# - Storage
# - Emulators (for local testing)

# Set up Firestore indexes
firebase deploy --only firestore:indexes

# Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

**Firestore Security Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isCompanyMember(companyId) {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/companies/$(companyId)/members/$(request.auth.uid));
    }
    
    function hasRole(companyId, role) {
      return isCompanyMember(companyId) &&
             get(/databases/$(database)/documents/companies/$(companyId)/members/$(request.auth.uid)).data.role == role;
    }
    
    // Company access
    match /companies/{companyId} {
      allow read: if isCompanyMember(companyId);
      allow write: if hasRole(companyId, 'admin');
      
      match /members/{userId} {
        allow read: if isCompanyMember(companyId);
        allow write: if hasRole(companyId, 'admin');
      }
    }
    
    // User profiles
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }
    
    // Leads
    match /leads/{leadId} {
      allow read: if isCompanyMember(resource.data.companyId);
      allow create: if isAuthenticated();
      allow update, delete: if isCompanyMember(resource.data.companyId);
    }
    
    // Inspections
    match /inspections/{inspectionId} {
      allow read, write: if isCompanyMember(resource.data.companyId);
    }
    
    // Projects
    match /projects/{projectId} {
      allow read, write: if isCompanyMember(resource.data.companyId);
    }
    
    // Workflows
    match /workflows/{workflowId} {
      allow read: if isCompanyMember(resource.data.companyId);
      allow write: if hasRole(resource.data.companyId, 'admin');
    }
    
    // Calls
    match /calls/{callId} {
      allow read: if isCompanyMember(resource.data.companyId);
      allow create: if true; // Allow Twilio webhook to create
      allow update, delete: if isCompanyMember(resource.data.companyId);
    }
  }
}
```

### Step 2: Environment Configuration

Set up environment variables for all external services. These secrets must never be committed to version control.

```bash
# Set Firebase Functions environment variables
firebase functions:config:set \
  gemini.api_key="YOUR_GEMINI_API_KEY" \
  twilio.account_sid="YOUR_TWILIO_ACCOUNT_SID" \
  twilio.auth_token="YOUR_TWILIO_AUTH_TOKEN" \
  twilio.phone_number="+1234567890" \
  sendgrid.api_key="YOUR_SENDGRID_API_KEY" \
  sendgrid.from_email="noreply@nimbusiq.ai" \
  stripe.secret_key="YOUR_STRIPE_SECRET_KEY" \
  stripe.webhook_secret="YOUR_STRIPE_WEBHOOK_SECRET"

# Create .env file for frontend (not committed to git)
cat > .env.local << EOF
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=nimbus-iq-ai-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nimbus-iq-ai-prod
VITE_FIREBASE_STORAGE_BUCKET=nimbus-iq-ai-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_GEMINI_API_KEY=your_gemini_api_key
EOF
```

### Step 3: Deploy Cloud Functions

Deploy the backend Cloud Functions that power the AI features and integrations.

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:handleIncomingCall
firebase deploy --only functions:analyzeRoofPhotos
firebase deploy --only functions:executeWorkflow
```

**Key Cloud Functions:**

```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import twilio from 'twilio';

admin.initializeApp();
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);

// Handle incoming phone calls
export const handleIncomingCall = functions.https.onRequest(async (req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  
  // Greet caller
  twiml.say('Thank you for calling Nimbus Roofing. Please describe your roofing needs.');
  
  // Start recording and transcription
  twiml.record({
    transcribe: true,
    transcribeCallback: '/transcribeCallback',
    maxLength: 300,
    playBeep: false
  });
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Process transcription and respond with AI
export const transcribeCallback = functions.https.onRequest(async (req, res) => {
  const transcript = req.body.TranscriptionText;
  const callSid = req.body.CallSid;
  
  // Analyze intent with Gemini
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const prompt = `Analyze this customer call transcript and extract:
1. Customer intent (emergency, quote, general inquiry)
2. Urgency level (high, medium, low)
3. Key information (name, address, roof type, damage description)
4. Recommended next action

Transcript: "${transcript}"

Respond in JSON format.`;

  const result = await model.generateContent(prompt);
  const analysis = JSON.parse(result.response.text());
  
  // Store in Firestore
  await db.collection('calls').doc(callSid).set({
    transcript,
    analysis,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Generate response
  const twiml = new twilio.twiml.VoiceResponse();
  
  if (analysis.intent === 'emergency') {
    twiml.say('I understand this is urgent. I am connecting you to our emergency team now.');
    twiml.dial(functions.config().company.emergency_phone);
  } else {
    twiml.say(`Thank you for providing that information. I will have someone contact you within 24 hours to schedule an inspection.`);
  }
  
  res.type('text/xml');
  res.send(twiml.toString());
});

// Analyze roof photos with Gemini Vision
export const analyzeRoofPhotos = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { inspectionId, photoUrls } = data;
  
  // Get inspection details
  const inspection = await db.collection('inspections').doc(inspectionId).get();
  if (!inspection.exists) {
    throw new functions.https.HttpsError('not-found', 'Inspection not found');
  }
  
  // Analyze each photo with Gemini Vision
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const findings = [];
  
  for (const photoUrl of photoUrls) {
    const prompt = `Analyze this roof photo and identify:
1. Damage type (hail, wind, missing shingles, leak, wear)
2. Severity (minor, moderate, severe)
3. Affected area (estimate square footage)
4. Recommended repair action
5. Confidence score (0-100)

Respond in JSON format.`;

    const imagePart = {
      inlineData: {
        data: await fetchImageAsBase64(photoUrl),
        mimeType: 'image/jpeg'
      }
    };
    
    const result = await model.generateContent([prompt, imagePart]);
    const finding = JSON.parse(result.response.text());
    findings.push({ photoUrl, ...finding });
  }
  
  // Update inspection with findings
  await db.collection('inspections').doc(inspectionId).update({
    aiFindings: findings,
    analyzedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true, findings };
});

// Execute workflow
export const executeWorkflow = functions.firestore
  .document('workflows/{workflowId}/executions/{executionId}')
  .onCreate(async (snap, context) => {
    const execution = snap.data();
    const workflowId = context.params.workflowId;
    
    // Get workflow definition
    const workflow = await db.collection('workflows').doc(workflowId).get();
    if (!workflow.exists) {
      throw new Error('Workflow not found');
    }
    
    const definition = workflow.data();
    
    // Execute each step
    for (const step of definition.steps) {
      try {
        await executeStep(step, execution.context);
      } catch (error) {
        // Log error and continue or stop based on error handling config
        await snap.ref.update({
          status: 'failed',
          error: error.message,
          failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
    }
    
    // Mark as completed
    await snap.ref.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

async function executeStep(step: any, context: any) {
  switch (step.type) {
    case 'sendEmail':
      // Send email via SendGrid
      break;
    case 'sendSMS':
      // Send SMS via Twilio
      break;
    case 'updateCRM':
      // Update CRM via integration
      break;
    case 'callWebhook':
      // Call external webhook
      break;
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
```

### Step 4: Deploy Frontend

Build and deploy the React frontend to Firebase Hosting.

```bash
# Navigate to project root
cd ..

# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Your app is now live at:
# https://nimbus-iq-ai-prod.web.app
```

### Step 5: Configure Custom Domain

Set up a custom domain for professional branding.

```bash
# Add custom domain in Firebase Console
# Or use CLI:
firebase hosting:channel:deploy production --only nimbusiq.ai

# Follow instructions to add DNS records:
# A record: @ -> 151.101.1.195
# A record: @ -> 151.101.65.195
# TXT record: @ -> firebase=nimbus-iq-ai-prod
```

### Step 6: Testing & Validation

Run comprehensive tests to ensure all systems are functioning correctly.

**Automated Tests:**
```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e
```

**Manual Testing Checklist:**
- [ ] User can sign up and log in
- [ ] Voice AI answers test call and transcribes correctly
- [ ] Roof photo analysis detects damage accurately
- [ ] Workflow executes all steps without errors
- [ ] CRM integration syncs data bidirectionally
- [ ] Analytics dashboard displays correct metrics
- [ ] Mobile interface is fully responsive
- [ ] All forms validate input properly
- [ ] Error messages are user-friendly
- [ ] Loading states appear for async operations

### Step 7: Monitoring & Maintenance

Set up monitoring to track system health and performance.

**Firebase Monitoring:**
- Enable Crashlytics for error tracking
- Set up Performance Monitoring for page load times
- Configure alerting for Cloud Functions failures
- Monitor Firestore read/write quotas

**External Monitoring:**
- Set up UptimeRobot for uptime monitoring
- Configure Sentry for detailed error tracking
- Use Google Analytics for user behavior insights
- Set up LogRocket for session replay

**Maintenance Schedule:**
- Daily: Review error logs and fix critical issues
- Weekly: Analyze performance metrics and optimize bottlenecks
- Monthly: Update dependencies and security patches
- Quarterly: Review and optimize Cloud Functions costs

---

## Part 5: Success Criteria & Validation

### MVP Launch Checklist

Before launching the MVP to customers, verify that all core functionality meets the following criteria.

**Functional Requirements:**
- [ ] All five subsystems are fully implemented
- [ ] User can complete end-to-end workflow without errors
- [ ] AI accuracy meets minimum thresholds (95% transcription, 85% damage detection)
- [ ] System handles 100 concurrent users without performance degradation
- [ ] All integrations sync data correctly
- [ ] Mobile experience is fully functional

**Non-Functional Requirements:**
- [ ] Page load time under 3 seconds on 3G
- [ ] API response time under 500ms for 95th percentile
- [ ] Uptime above 99.5% over 30-day period
- [ ] Security audit passes with no critical vulnerabilities
- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] Documentation complete for all features

**Business Requirements:**
- [ ] Onboarding flow takes under 15 minutes
- [ ] Users can complete first task without support
- [ ] Customer support response time under 2 hours
- [ ] Pricing model validated with 10+ beta customers
- [ ] ROI calculator shows positive return within 6 months

### Performance Benchmarks

The system must meet these performance targets to ensure a smooth user experience.

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Homepage load time | < 2 seconds | Lighthouse CI |
| Dashboard load time | < 3 seconds | Lighthouse CI |
| Voice AI response time | < 2 seconds | Custom monitoring |
| Photo analysis time | < 10 seconds per photo | Custom monitoring |
| Workflow execution time | < 5 seconds | Firebase Performance |
| API error rate | < 0.1% | Firebase Crashlytics |
| Firestore read operations | < 1M per day | Firebase Console |
| Cloud Functions invocations | < 100K per day | Firebase Console |
| Storage bandwidth | < 100 GB per month | Firebase Console |

### Cost Optimization

Monitor and optimize costs to maintain profitability while scaling.

**Firebase Costs (estimated for 100 active companies):**
- Firestore: $50/month (1M reads, 500K writes)
- Cloud Functions: $100/month (100K invocations)
- Storage: $20/month (100 GB)
- Hosting: $0 (within free tier)
- **Total Firebase: $170/month**

**Third-Party Services:**
- Twilio: $200/month (1000 minutes)
- SendGrid: $15/month (40K emails)
- Google Cloud APIs: $100/month (Gemini, Speech, Vision)
- Stripe: 2.9% + $0.30 per transaction
- **Total Third-Party: $315/month + transaction fees**

**Target Pricing:**
- Starter: $99/month (1 user, 100 calls, 50 inspections)
- Professional: $299/month (5 users, 500 calls, 200 inspections)
- Enterprise: $799/month (unlimited users, calls, inspections)

**Break-Even Analysis:**
- Fixed costs: $485/month
- Break-even: 5 Starter customers or 2 Professional customers
- Target: 50 customers by month 6 ($14,950 MRR, $485 costs = $14,465 profit)

---

## Conclusion

This document provides the complete blueprint for building Nimbus IQ AI from scratch. A Manus agent following these instructions should be able to deliver a production-ready MVP within 5 weeks of development time.

The system is designed to be modular, scalable, and cost-effective, enabling roofing companies to automate their operations without significant upfront investment. The plug-and-play architecture ensures that non-technical users can deploy and configure the system in under 15 minutes.

**Next Steps:**
1. Review this document with stakeholders to validate requirements
2. Assign a Manus agent to begin Phase 1 development
3. Set up weekly check-ins to review progress and adjust priorities
4. Plan beta launch with 10 pilot customers after Phase 5 completion
5. Iterate based on customer feedback and usage analytics

**Contact:**
For questions or clarifications, contact the Nimbus IQ AI product team at dustin@nimbusroofing.com.

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** Manus AI  
**License:** Proprietary - Nimbus Roofing
