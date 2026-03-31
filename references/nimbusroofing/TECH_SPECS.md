# Nimbus Roofing Technical Specifications

**Version:** 1.0.0  
**Last Updated:** January 8, 2026  
**Author:** Manus AI

---

## Executive Summary

Nimbus Roofing represents a next-generation roofing services platform powered by artificial intelligence and advanced automation. The system integrates Google Gemini AI for intelligent customer interactions, Twilio for omnichannel communication, and a comprehensive suite of automation tools for SEO, lead management, and predictive analytics. Built on a modern full-stack architecture with React, TypeScript, and MySQL, the platform delivers personalized customer experiences while automating complex business workflows.

---

## System Architecture

### Technology Stack

The platform is built on a modern, scalable technology stack designed for performance, maintainability, and developer productivity.

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19.2.0 | User interface and component library |
| **UI Framework** | Tailwind CSS | 4.x | Utility-first styling system |
| **Backend** | Node.js + Express | 22.13.0 | Server runtime and API framework |
| **API Layer** | tRPC | Latest | Type-safe API with end-to-end TypeScript |
| **Database** | MySQL | 8.0+ | Relational data storage |
| **ORM** | Drizzle ORM | Latest | Type-safe database queries |
| **AI Engine** | Google Gemini | 2.0 Flash | Conversational AI and content generation |
| **Communication** | Twilio | Latest | SMS and voice call integration |
| **Package Manager** | pnpm | 10.4.1 | Fast, disk-efficient dependency management |

### Database Schema

The platform utilizes **26 database tables** organized into functional domains, supporting comprehensive data management across all business operations.

#### Core Business Tables

- **leads** (15 columns) - Customer lead capture and tracking with source attribution, urgency levels, and status management
- **callbackRequests** (22 columns) - Scheduled callback management with time preferences, urgency classification, and Twilio integration
- **callTracking** (17 columns) - Complete call history with recordings, transcriptions, duration tracking, and outcome classification
- **smsOptIns** (14 columns) - SMS subscription management with message type preferences and frequency controls

#### AI & Learning Systems

- **chatConversations** (11 columns) - Conversation session tracking with user fingerprinting and satisfaction scoring
- **chatMessages** (11 columns) - Individual message storage with sentiment analysis and intent classification
- **aiLearnings** (16 columns) - Extracted knowledge from conversations including FAQs, objections, and pain points
- **aiFeedback** (10 columns) - Response quality tracking with user ratings and improvement suggestions
- **knowledgeBase** (15 columns) - Continuously updated knowledge entries with confidence scoring and validation status
- **userProfiles** (15 columns) - Progressive profiling with buyer journey stage tracking and interest categorization

#### Content & SEO

- **blogPosts** (17 columns) - Content management with SEO optimization, auto-publishing, and performance tracking
- **seoKeywords** (17 columns) - Keyword research and tracking with search volume, difficulty, and ranking data
- **contentTemplates** (14 columns) - Reusable content templates for automated generation
- **backlinks** (11 columns) - Backlink portfolio management with Domain Authority tracking via Moz API

#### Weather & Automation

- **weatherAlerts** (15 columns) - Real-time weather monitoring with storm tracking and hail prediction
- **stormHistory** (19 columns) - Historical storm data for predictive analytics and pattern recognition

#### API Management

- **apiKeys** (14 columns) - External API key management with permissions, rate limiting, and expiration
- **apiRequestLogs** (12 columns) - Comprehensive API request logging for monitoring and debugging

---

## Public REST API

### Overview

The Nimbus Roofing Public API provides secure, rate-limited access for external integrations. All endpoints require API key authentication via the `X-API-Key` header and support JSON request/response formats.

### Base URL

```
https://your-domain.com/api/v1
```

### Authentication

API keys are generated through the admin dashboard and must be included in all requests:

```http
X-API-Key: nmb_your_64_character_api_key_here
```

### Rate Limiting

Default rate limit is **1,000 requests per hour** per API key. Rate limit headers are included in all responses:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1704758400
```

### Endpoints

#### Health Check

**GET** `/api/v1/health`

Returns API health status. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-08T15:30:00.000Z",
  "version": "1.0.0"
}
```

#### Create Lead

**POST** `/api/v1/leads`

Submit a new customer lead to the system. Requires `leads:create` permission.

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+14695551234",
  "email": "john@example.com",
  "serviceType": "Residential Roof Replacement",
  "urgency": "high",
  "message": "Need estimate for storm damage repair",
  "address": "123 Main St",
  "city": "McKinney",
  "zipCode": "75070"
}
```

**Required Fields:**
- `name` (string) - Customer full name
- `phone` (string) - Contact phone number

**Optional Fields:**
- `email` (string) - Customer email address
- `serviceType` (string) - Type of roofing service requested
- `urgency` (enum) - `low`, `medium`, `high`, or `emergency`
- `message` (string) - Additional details or questions
- `address` (string) - Property address
- `city` (string) - City name
- `zipCode` (string) - ZIP code

**Response (201 Created):**
```json
{
  "success": true,
  "leadId": 1234,
  "message": "Lead created successfully"
}
```

**Error Responses:**

| Status Code | Error | Description |
|------------|-------|-------------|
| 400 | Validation failed | Missing required fields (name, phone) |
| 401 | Invalid API key | API key is missing, invalid, or expired |
| 403 | Permission denied | API key lacks `leads:create` permission |
| 429 | Rate limit exceeded | Too many requests in the current hour |
| 500 | Internal server error | Server-side error occurred |

#### Get API Key Info

**GET** `/api/v1/key-info`

Returns information about the authenticated API key.

**Response:**
```json
{
  "name": "Website Contact Form",
  "permissions": ["leads:create"],
  "rateLimit": 1000
}
```

---

## Twilio Webhook Endpoints

### Overview

Twilio webhooks provide real-time status updates for calls and SMS messages. These endpoints are automatically configured when setting up Twilio integration.

### Webhook URLs

| Webhook Type | URL | Purpose |
|-------------|-----|---------|
| Call Status | `/webhooks/twilio/call-status` | Receives call status updates (ringing, answered, completed) |
| SMS Status | `/webhooks/twilio/sms-status` | Receives SMS delivery status (sent, delivered, failed) |
| Recording Status | `/webhooks/twilio/recording-status` | Notifies when call recordings are available |
| Transcription | `/webhooks/twilio/transcription` | Receives call transcriptions |

### Call Status Webhook

**POST** `/webhooks/twilio/call-status`

Receives updates when call status changes throughout the call lifecycle.

**Request Parameters:**
- `CallSid` - Unique call identifier
- `CallStatus` - Current status (`queued`, `ringing`, `in-progress`, `completed`, `busy`, `failed`, `no-answer`)
- `CallDuration` - Duration in seconds (available when completed)
- `RecordingUrl` - URL to call recording (if enabled)
- `RecordingSid` - Recording identifier
- `TranscriptionText` - Call transcription (if enabled)
- `From` - Caller phone number
- `To` - Recipient phone number
- `Direction` - `inbound` or `outbound`

**Response:**
```xml
<Response></Response>
```

### SMS Status Webhook

**POST** `/webhooks/twilio/sms-status`

Receives updates when SMS message status changes.

**Request Parameters:**
- `MessageSid` - Unique message identifier
- `MessageStatus` - Current status (`queued`, `sent`, `delivered`, `failed`, `undelivered`)
- `From` - Sender phone number
- `To` - Recipient phone number
- `Body` - Message content
- `ErrorCode` - Error code (if failed)
- `ErrorMessage` - Error description (if failed)

---

## AI Chatbot System

### Architecture

The AI chatbot is powered by **Google Gemini 2.0 Flash** with function calling capabilities, enabling intelligent customer interactions with access to 15+ specialized functions.

### Core Capabilities

The chatbot system integrates multiple AI-powered features to deliver comprehensive customer service:

**Conversational Intelligence:**
- Natural language understanding with context retention across multi-turn conversations
- Sentiment analysis for detecting customer satisfaction and frustration
- Intent classification for routing to appropriate functions
- Personalized responses based on user history and preferences

**Semantic Memory:**
- Automatic conversation storage with user fingerprinting for cross-session continuity
- Learning extraction from interactions to build FAQ database
- Knowledge base management with confidence scoring and validation
- Progressive profiling to track buyer journey stage (awareness → consideration → decision)

**Function Calling:**
The chatbot can execute 15 specialized functions to handle customer requests:

| Function | Purpose | Integration |
|----------|---------|-------------|
| `get_weather_alerts` | Real-time storm and hail alerts | National Weather Service API |
| `analyze_roof_damage` | AI-powered damage assessment from photos | Google Gemini Vision |
| `calculate_roof_estimate` | Instant pricing estimates | Internal pricing engine |
| `check_insurance_coverage` | Insurance claim guidance | Knowledge base |
| `get_warranty_info` | Warranty details and coverage | Database |
| `schedule_inspection` | Book free roof inspection | Calendar integration |
| `create_lead` | Capture customer information | Lead management system |
| `request_callback` | Schedule callback with time preferences | Callback management |
| `initiate_call` | Emergency call initiation | Twilio voice API |
| `opt_in_sms` | SMS subscription with preferences | SMS management |
| `send_instant_sms` | Immediate SMS confirmation | Twilio SMS API |
| `get_project_photos` | Show completed projects | Project database |
| `check_certifications` | Display credentials and certifications | Certifications database |
| `get_service_areas` | Coverage area information | Geographic database |
| `get_financing_options` | Payment and financing details | Knowledge base |

### Personalization System

The chatbot implements advanced personalization through browser fingerprinting and progressive profiling:

**User Identification:**
- Browser fingerprinting for anonymous user tracking across sessions
- Optional email/phone linking for authenticated experiences
- Session continuity with conversation history retrieval

**Progressive Profiling:**
- Automatic extraction of user interests from conversation topics
- Pain point identification (cost concerns, timing urgency, quality expectations)
- Buyer journey stage tracking (awareness, consideration, decision, post-purchase)
- Preference learning (communication channels, service types, scheduling preferences)

**Context Enhancement:**
- Recent learnings loaded before each response to improve accuracy
- User's previous conversations used as context for personalized recommendations
- Adaptive tone and complexity based on user's technical understanding

### Lead Scoring

The system automatically calculates lead scores (0-100) based on multiple factors:

**Scoring Components:**

| Factor | Weight | Description |
|--------|--------|-------------|
| Urgency | +5 to +40 | Emergency (+40), High (+30), Medium (+15), Low (+5) |
| Request Type | +10 to +25 | Immediate call (+25), Callback (+20), SMS opt-in (+10) |
| Contact Provided | +15 | Phone and/or email captured |
| Engagement | +1 per message | Conversation length indicates interest |
| Buying Signals | +5 each | Keywords: insurance, estimate, schedule, inspection, warranty |

**Lead Routing:**
- Scores 80-100: Immediate notification + urgent SMS to owner
- Scores 60-79: High priority queue + email notification
- Scores 40-59: Standard queue + daily digest
- Scores 0-39: Low priority + weekly review

---

## SEO & Content Automation

### SEO Agent Pro

The platform includes an advanced SEO automation system powered by AI content generation and keyword research.

**Content Generation:**
- Batch generation of city-specific landing pages (77 DFW cities)
- Automatic blog post creation with SEO optimization
- Meta description and title tag generation
- Internal linking suggestions
- Image alt text optimization

**Keyword Research:**
- Automated keyword discovery using search volume data
- Competitor keyword analysis
- Long-tail keyword identification
- Keyword difficulty scoring
- Search intent classification (informational, commercial, transactional)

**Sitemap Management:**
- Automatic sitemap.xml generation and updates
- Google Search Console ping for faster indexing
- Priority and change frequency optimization
- Mobile-first indexing compliance

### Backlink Monitoring

Integration with **Moz API** provides Domain Authority tracking and link quality analysis:

**Features:**
- Automatic DA score refresh for all backlinks
- Broken link detection with status code monitoring
- Link quality classification (true backlinks vs. opportunities)
- Historical DA tracking for trend analysis
- Competitor backlink discovery

---

## Weather Monitoring & Predictive Analytics

### Real-Time Weather Alerts

The platform monitors weather conditions across the Dallas-Fort Worth service area using the **National Weather Service API**.

**Alert Types:**
- Severe thunderstorm warnings
- Hail storm alerts (size tracking)
- High wind warnings
- Tornado watches and warnings
- Flash flood warnings

**Automated Actions:**
- Instant notifications to owner when alerts are detected
- Automatic blog post generation about storm preparation
- SMS campaigns to customers in affected ZIP codes
- Social media content creation for timely engagement

### Storm History & Prediction

The system maintains a comprehensive database of historical storm events for predictive analytics:

**Data Collected:**
- Storm date, time, and duration
- Hail size and wind speed
- Affected geographic areas
- Damage reports and insurance claims
- Seasonal patterns and trends

**Predictive Capabilities:**
- Seasonal storm likelihood forecasting
- Geographic risk assessment by ZIP code
- Proactive customer outreach before storm season
- Inventory planning for high-demand periods

---

## Communication Infrastructure

### Twilio Integration

The platform leverages **Twilio** for omnichannel customer communication with full tracking and analytics.

**Voice Capabilities:**
- Outbound call initiation from dashboard
- Inbound call routing and IVR
- Call recording with automatic transcription
- Call duration and outcome tracking
- Voicemail detection and transcription

**SMS Capabilities:**
- Automated SMS confirmations for callback requests
- Bulk SMS campaigns with personalization
- Two-way SMS conversations
- Delivery status tracking
- Opt-in/opt-out management with compliance

**Call Tracking:**
All calls are logged in the `callTracking` table with comprehensive metadata:
- Twilio Call SID for reference
- Call direction (inbound/outbound)
- From/to phone numbers
- Call status and duration
- Recording URL and transcription
- Associated lead or callback request
- Outcome classification (connected, voicemail, no answer, busy, failed)

---

## Admin Dashboard & Management

### Dashboard Overview

The admin dashboard provides centralized control over all platform operations with role-based access control.

**Key Sections:**

| Dashboard | Purpose | Key Features |
|-----------|---------|--------------|
| **Leads** | Lead management | Status tracking, assignment, filtering, export |
| **Callbacks** | Callback queue | Scheduling, assignment, call initiation, history |
| **AI Learnings** | Knowledge review | FAQ validation, learning approval, analytics |
| **Content Scaling** | Bulk content generation | City page generation, batch blog posts |
| **SEO Dashboard** | SEO performance | Keyword rankings, traffic analytics, backlinks |
| **Backlink Monitor** | Link portfolio | DA tracking, broken link detection, opportunities |
| **Weather Monitor** | Storm tracking | Active alerts, historical data, predictions |
| **Automation** | Workflow management | Trigger configuration, execution logs |
| **API Management** | API key administration | Key generation, usage analytics, rate limits |

### Callback Management Dashboard

The callback management interface provides comprehensive tools for managing customer callback requests:

**Statistics Cards:**
- Total callbacks (all time)
- Pending (awaiting action)
- Scheduled (assigned and planned)
- Completed (successfully contacted)
- Emergency (urgent requests)
- High Priority (time-sensitive)

**Filtering & Sorting:**
- Filter by status (pending, scheduled, completed, cancelled, no answer)
- Filter by urgency (emergency, high, medium, low)
- Date range selection
- Sort by creation time, scheduled time, or urgency

**Action Capabilities:**
- One-click call initiation via Twilio
- Status updates with notes
- Assignment to sales representatives
- Conversation context review
- Call history with recordings
- Bulk actions for efficiency

### API Key Management

Administrators can generate and manage API keys for external integrations:

**Key Generation:**
- Friendly name and description
- Permission assignment (`leads:create`, `webhooks:receive`, etc.)
- Rate limit configuration (requests per hour)
- Expiration date (optional)
- IP whitelist (optional)

**Usage Monitoring:**
- Total requests counter
- Last used timestamp
- Request logs with full details (endpoint, method, status, duration)
- Error tracking and debugging
- Performance analytics

---

## Security & Compliance

### API Security

**Authentication:**
- API keys use SHA-256 hashing for secure storage
- Keys are only displayed once during generation
- Automatic key rotation support
- Expiration enforcement

**Rate Limiting:**
- Per-key rate limits prevent abuse
- Configurable limits per integration
- Automatic blocking when limits exceeded
- Rate limit headers in all responses

**Request Logging:**
- All API requests logged with full context
- IP address and user agent tracking
- Request/response body storage
- Error tracking for debugging

### Data Protection

**Database Security:**
- Encrypted connections (SSL/TLS)
- Prepared statements prevent SQL injection
- Input validation on all user data
- XSS protection with content sanitization

**User Privacy:**
- Browser fingerprinting uses non-invasive techniques
- Optional user identification (email/phone)
- Data retention policies enforced
- GDPR/CCPA compliance ready

---

## Performance & Scalability

### Optimization Techniques

**Frontend Performance:**
- Code splitting for faster initial load
- Lazy loading of routes and components
- Image optimization with WebP format
- CDN delivery for static assets
- Browser caching with cache-busting

**Backend Performance:**
- Connection pooling for database efficiency
- Query optimization with indexed columns
- Caching layer for frequently accessed data
- Asynchronous processing for long-running tasks
- Rate limiting to prevent resource exhaustion

**Database Optimization:**
- Indexed columns on frequently queried fields
- Denormalized data for read-heavy operations
- Batch inserts for bulk operations
- Query result caching
- Connection pooling

### Scalability Architecture

The platform is designed for horizontal scalability:

**Stateless Backend:**
- No server-side session storage
- JWT-based authentication
- Load balancer ready
- Multi-instance deployment support

**Database Scalability:**
- Read replicas for query distribution
- Vertical scaling for increased capacity
- Partitioning strategies for large tables
- Archive tables for historical data

---

## Deployment & Infrastructure

### Hosting Environment

The platform is hosted on **Manus Cloud Infrastructure** with the following specifications:

**Production Environment:**
- Node.js 22.13.0 runtime
- MySQL 8.0+ database
- SSL/TLS encryption (HTTPS)
- Automatic backups (daily)
- 99.9% uptime SLA

**Development Environment:**
- Hot module replacement for instant updates
- TypeScript compilation with watch mode
- Database migrations with Drizzle Kit
- Environment variable management

### Custom Domain Support

The platform supports custom domain configuration:

**Default Domain:**
```
https://your-prefix.manus.space
```

**Custom Domain Options:**
- Purchase domains directly through Manus
- Bind existing domains with DNS configuration
- SSL certificate automatic provisioning
- Subdomain support

### Continuous Deployment

**Checkpoint System:**
- Version control with Git integration
- One-click rollback to previous versions
- Checkpoint creation before risky changes
- Automatic deployment on checkpoint save

**GitHub Integration:**
- Automatic sync to GitHub repository
- Conflict detection and resolution
- Branch management (main branch)
- Commit history preservation

---

## Integration Ecosystem

### External API Integrations

The platform integrates with multiple external services to provide comprehensive functionality:

| Service | Purpose | API Version |
|---------|---------|-------------|
| **Google Gemini** | AI content generation and chatbot | 2.0 Flash |
| **Twilio** | SMS and voice communication | Latest |
| **Moz** | Domain Authority and SEO metrics | Latest |
| **National Weather Service** | Real-time weather alerts | Latest |
| **Google Search Console** | Sitemap submission and indexing | Latest |

### Webhook Support

The platform can send webhooks to external systems for event notifications:

**Available Events:**
- New lead created
- Callback request received
- Call completed
- SMS delivered
- Weather alert detected
- Blog post published

**Webhook Configuration:**
- Custom endpoint URL
- Event selection
- Retry logic with exponential backoff
- Signature verification for security

---

## Monitoring & Analytics

### System Monitoring

**Health Checks:**
- Database connectivity monitoring
- API endpoint availability
- External service status
- Error rate tracking

**Performance Metrics:**
- Response time tracking
- Database query performance
- API request duration
- Memory and CPU usage

### Business Analytics

**Lead Analytics:**
- Lead source attribution
- Conversion rate by source
- Lead quality scoring
- Time-to-contact metrics

**Chatbot Analytics:**
- Conversation volume and trends
- Function usage statistics
- Customer satisfaction scores
- Learning extraction rate

**SEO Analytics:**
- Keyword ranking changes
- Organic traffic growth
- Backlink acquisition rate
- Content performance metrics

---

## Future Roadmap

### Planned Enhancements

**Q1 2026:**
- Voice AI for phone call automation
- Advanced roof inspection AI with drone integration
- Automated workflow builder with visual interface
- Real-time collaboration tools for sales team

**Q2 2026:**
- Mobile app (iOS and Android)
- Customer portal for project tracking
- Payment processing with Stripe integration
- Advanced reporting and business intelligence

**Q3 2026:**
- Multi-location support for franchise expansion
- White-label platform for other roofing companies
- AI-powered sales coaching and training
- Predictive maintenance recommendations

---

## Support & Documentation

### Developer Resources

**API Documentation:**
- Interactive API explorer
- Code examples in multiple languages
- Postman collection
- OpenAPI/Swagger specification

**SDK Libraries:**
- JavaScript/TypeScript SDK
- Python SDK (planned)
- PHP SDK (planned)
- Ruby SDK (planned)

### Technical Support

**Support Channels:**
- Email: support@nimbusroofing.com
- Documentation: https://docs.nimbusroofing.com
- Status Page: https://status.nimbusroofing.com
- GitHub Issues: https://github.com/nimbus-roofing/platform

**Support Tiers:**
- Community (free) - Email support, 48-hour response
- Professional - Priority email, 24-hour response
- Enterprise - Phone support, 4-hour response, dedicated account manager

---

## Conclusion

The Nimbus Roofing platform represents a comprehensive, AI-powered solution for modern roofing businesses. By combining advanced artificial intelligence, robust automation, and seamless integrations, the platform delivers exceptional customer experiences while dramatically improving operational efficiency. The modular architecture and extensive API support ensure the platform can grow and adapt to evolving business needs, making it a future-proof investment for roofing companies of all sizes.

---

**Document Version:** 1.0.0  
**Generated:** January 8, 2026  
**Next Review:** April 8, 2026
