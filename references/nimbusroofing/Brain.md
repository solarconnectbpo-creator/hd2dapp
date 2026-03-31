# 🧠 Nimbus Roofing AI Brain Architecture

**Last Updated:** February 2, 2026  
**Version:** 1.0.0  
**Status:** Active Development

---

## 🎯 Mission

The Nimbus AI Brain is a multi-agent orchestration system that automates insurance claim analysis, fraud detection, supplier pricing, and workflow routing for roofing operations. It operates as the central intelligence layer connecting customer inquiries, insurance documents, supplier APIs, and business logic.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NIMBUS AI BRAIN                          │
│                  (Orchestration Layer)                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ CLAIM   │        │ FRAUD   │        │ PRICING │
   │ ANALYZER│        │ DETECTOR│        │ AGENT   │
   │ AGENT   │        │ AGENT   │        │         │
   └────┬────┘        └────┬────┘        └────┬────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ ROUTING │        │ PAYMENT │        │ DOCS    │
   │ AGENT   │        │ AGENT   │        │ AGENT   │
   └─────────┘        └─────────┘        └─────────┘
```

---

## 🤖 AI Agents

### 1. **Claim Analyzer Agent**
**Purpose:** Extract and validate insurance claim documents  
**Capabilities:**
- OCR text extraction from PDFs/images
- Line item detection and parsing
- Missing item identification (drip edge, ice & water shield, etc.)
- Xactimate code validation
- Estimate comparison

**Technologies:**
- Google Gemini Vision API (multimodal document analysis)
- PDF parsing libraries
- Regex pattern matching

**Input:** Insurance claim PDF/image  
**Output:** Structured JSON with line items, missing items, compliance issues

---

### 2. **Fraud Detector Agent**
**Purpose:** Identify fraudulent practices in insurance claims  
**Capabilities:**
- Keyword detection ("waived deductible", "free roof", "inflated claim")
- Pattern recognition (storm chaser tactics)
- Claim denial analysis
- Red flag scoring system

**Fraud Keywords Database:**
```
- "denied", "not covered", "closed without inspection"
- "waived deductible", "free roof", "no out-of-pocket"
- "inflated claim", "manufactured damage"
- "storm chaser", "door-to-door solicitation"
```

**Input:** Claim text + contractor information  
**Output:** Fraud risk score (0-100) + flagged sentences

---

### 3. **Pricing Agent**
**Purpose:** Real-time supplier pricing and cost validation  
**Capabilities:**
- ABC Supply API integration
- Beacon/QXO fallback (manual quotes)
- Price comparison across suppliers
- Material cost estimation
- Labor rate validation

**Supplier APIs:**
- **ABC Supply:** Public API (requires registration)
- **Beacon/QXO:** No public API (web scraping fallback)
- **SRS Distribution:** Contact for API access

**Input:** Material list (shingles, underlayment, flashing, etc.)  
**Output:** Current pricing + supplier availability

---

### 4. **Routing Agent**
**Purpose:** Intelligent task routing and workflow orchestration  
**Capabilities:**
- MCP-style agent-to-agent communication
- Task priority scoring
- Workflow state management
- Conditional routing rules

**Routing Rules:**
```javascript
{
  "high_urgency_lead": → "SMS + Email + Dashboard Alert",
  "fraud_detected": → "Manual Review Queue",
  "payment_due": → "QuickBooks Invoice Creation",
  "claim_approved": → "Project Scheduling Agent"
}
```

**Input:** Task type + metadata  
**Output:** Routed to appropriate agent/system

---

### 5. **Payment Agent**
**Purpose:** Automated invoicing and payment tracking  
**Capabilities:**
- QuickBooks API integration
- Stripe payment processing
- Invoice generation
- Payment status tracking
- Automated reminders

**Integrations:**
- QuickBooks Online API
- Stripe Checkout
- Email notifications

**Input:** Project completion + pricing data  
**Output:** Invoice sent + payment link

---

### 6. **Documentation Agent**
**Purpose:** Auto-generate reports, proposals, and documentation  
**Capabilities:**
- Claim analysis reports (PDF)
- Customer proposals with pricing
- Project documentation
- Compliance checklists
- Email templates

**Technologies:**
- Google Gemini for content generation
- Markdown → PDF conversion
- Template engine

**Input:** Analysis results + customer data  
**Output:** Professional PDF documents

---

## 📊 Data Flow

### Insurance Claim Analysis Workflow

```
1. Customer uploads claim PDF
   ↓
2. Claim Analyzer Agent extracts text + line items
   ↓
3. Fraud Detector Agent scans for red flags
   ↓
4. Pricing Agent fetches current material costs
   ↓
5. Documentation Agent generates analysis report
   ↓
6. Routing Agent determines next action:
   - If fraud detected → Manual review queue
   - If missing items → Customer notification
   - If approved → Project scheduling
   ↓
7. Payment Agent creates invoice (if applicable)
```

---

## 🗄️ Database Schema

### `insurance_claims` Table
```sql
CREATE TABLE insurance_claims (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  claim_number VARCHAR(255),
  insurance_company VARCHAR(255),
  uploaded_file_url TEXT,
  ocr_text LONGTEXT,
  line_items JSON,
  missing_items JSON,
  fraud_score INT DEFAULT 0,
  fraud_flags JSON,
  status ENUM('pending', 'analyzing', 'reviewed', 'approved', 'rejected'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  analyzed_at TIMESTAMP
);
```

### `agent_tasks` Table
```sql
CREATE TABLE agent_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_type VARCHAR(100),
  agent_name VARCHAR(100),
  input_data JSON,
  output_data JSON,
  status ENUM('queued', 'processing', 'completed', 'failed'),
  priority INT DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);
```

### `supplier_pricing` Table
```sql
CREATE TABLE supplier_pricing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  item_name VARCHAR(255),
  supplier VARCHAR(100),
  price DECIMAL(10,2),
  unit VARCHAR(50),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### Claim Analysis
```typescript
POST /api/trpc/agents.analyzeClaim
Input: { fileUrl: string, claimNumber?: string }
Output: { 
  claimId: number,
  lineItems: Array<LineItem>,
  missingItems: string[],
  fraudScore: number,
  fraudFlags: string[],
  supplierPricing: Record<string, number>,
  reportUrl: string
}
```

### Fraud Detection
```typescript
POST /api/trpc/agents.detectFraud
Input: { text: string, contractorInfo?: object }
Output: {
  fraudScore: number,
  flaggedSentences: string[],
  riskLevel: 'low' | 'medium' | 'high',
  recommendations: string[]
}
```

### Supplier Pricing
```typescript
GET /api/trpc/agents.getSupplierPricing
Input: { items: string[] }
Output: {
  [itemName: string]: {
    abcSupply?: number,
    beacon?: number,
    srs?: number,
    lastUpdated: string
  }
}
```

---

## 🛡️ Security & Compliance

### Legal Compliance
- **Texas §4102:** Nimbus Roofing is a contractor, NOT a public adjuster
- **Disclaimer:** All claim analysis is advisory only
- **Data Privacy:** HIPAA-level encryption for customer documents
- **Access Control:** Role-based permissions (admin, agent, customer)

### Security Measures
- API key rotation (ABC Supply, QuickBooks)
- Encrypted file storage (S3 with server-side encryption)
- Rate limiting on AI endpoints
- Audit logging for all agent actions

---

## 📱 Mobile Agent App

### Features
- **Claim Scanner:** Camera → OCR → Analysis
- **Call Log:** Twilio integration for agent calls
- **Task Dashboard:** Real-time agent task status
- **Push Notifications:** High-priority alerts

### Technology Stack
- React Native (iOS + Android)
- Expo for rapid deployment
- tRPC client for API calls
- Secure token storage

---

## 🚀 Deployment Strategy

### Phase 1: Core Agents (Current)
- ✅ Claim Analyzer Agent
- ✅ Fraud Detector Agent
- ✅ Pricing Agent

### Phase 2: Workflow Automation
- ⏳ Routing Agent
- ⏳ Payment Agent
- ⏳ Documentation Agent

### Phase 3: Mobile & Advanced
- ⏳ Mobile agent app
- ⏳ Real-time dashboard
- ⏳ Predictive analytics

---

## 🔧 Configuration

### Environment Variables
```bash
# AI Services
GEMINI_API_KEY=your_gemini_key
ANTHROPIC_API_KEY=your_anthropic_key

# Supplier APIs
ABC_SUPPLY_API_KEY=your_abc_key
ABC_SUPPLY_API_URL=https://api.abcsupply.com/v1

# Payment Integration
QUICKBOOKS_CLIENT_ID=your_qb_client_id
QUICKBOOKS_CLIENT_SECRET=your_qb_secret
STRIPE_SECRET_KEY=your_stripe_key

# Twilio (SMS/Voice)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

---

## 📈 Performance Metrics

### Target KPIs
- **Claim Analysis Time:** < 30 seconds
- **Fraud Detection Accuracy:** > 90%
- **Pricing Data Freshness:** < 24 hours
- **Agent Response Time:** < 2 seconds
- **System Uptime:** > 99.5%

---

## 🧪 Testing Strategy

### Unit Tests
- Individual agent logic
- Fraud keyword matching
- Price comparison algorithms

### Integration Tests
- End-to-end claim analysis workflow
- API endpoint validation
- Database transactions

### Load Tests
- 100 concurrent claim uploads
- 1000 fraud detection requests/minute
- Supplier API rate limits

---

## 📚 Knowledge Base

### Required Line Items (Texas Building Code)
1. Roof replacement/repair
2. Ice and water shield
3. Drip edge installation
4. Flashing (valleys, chimneys, vents)
5. Ridge cap shingles
6. Tear-off labor
7. Dump fees
8. Underlayment

### Common Fraud Patterns
- Waived deductibles (illegal in Texas)
- "Free roof" promises
- Door-to-door storm chasers
- Inflated damage claims
- Manufactured hail damage
- Pressure tactics ("expires today")

---

## 🔄 Continuous Improvement

### Feedback Loop
1. Agent actions logged to database
2. Manual review results tracked
3. ML model retraining (quarterly)
4. Fraud pattern updates (monthly)
5. Supplier pricing refresh (daily)

### Version Control
- Brain.md updated with each major feature
- Agent logic versioned in Git
- API contracts documented in OpenAPI spec

---

## 👥 Team Access

### Admin Dashboard
- View all agent tasks
- Manual review queue
- Override agent decisions
- Performance analytics

### Customer Portal
- Upload claim documents
- View analysis results
- Download reports
- Track project status

---

## 📞 Support & Escalation

### Agent Failure Handling
- Automatic retry (3 attempts)
- Fallback to manual review
- Error logging + notifications
- Customer communication

### Human Escalation Triggers
- Fraud score > 70
- Missing critical line items
- Pricing discrepancy > 20%
- Customer dispute

---

## 🎓 Training Data

### Fraud Detection Model
- 500+ labeled insurance claims
- Texas roofing scam reports
- BBB complaint database
- Industry fraud patterns

### Claim Analysis Model
- 1000+ Xactimate estimates
- Standard line item templates
- Building code requirements
- Material specifications

---

## 🔗 External Integrations

### Current
- ✅ Google Gemini AI
- ✅ Twilio (SMS/Voice)
- ✅ Stripe (Payments)
- ✅ S3 (File Storage)

### Planned
- ⏳ ABC Supply API
- ⏳ QuickBooks Online
- ⏳ Xactimate (if API available)
- ⏳ Weather API (storm tracking)

---

## 📝 Changelog

### v1.0.0 (Feb 2, 2026)
- Initial Brain.md architecture
- Defined 6 core AI agents
- Database schema design
- API endpoint specification
- Security & compliance framework

---

**Next Steps:**
1. Implement Claim Analyzer Agent API
2. Build Fraud Detector service
3. Integrate ABC Supply API
4. Create admin dashboard for agent monitoring
5. Deploy mobile agent app (Phase 3)

---

*This document is the living brain of the Nimbus AI system. Update it as agents evolve.*
