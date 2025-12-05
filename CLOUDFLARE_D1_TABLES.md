# 🗄️ Cloudflare D1 Database Tables

Quick reference of all 40+ database tables included with HD2D.

---

## 📊 Table Categories

### 👥 User Management (2 tables)
- `users` - User accounts with authentication
- [company_id] - Multi-company support

### 📋 Lead Management (3 tables)
- `leads` - Sales leads with location & quality scoring
- `lead_activity` - Audit trail of lead changes
- `lead_verification` - Fraud detection & quality scores

### 💰 Deal Pipeline (3 tables)
- `deals` - Sales opportunities with AI forecasting
- `deal_activity` - Deal stage history
- `tasks` - Actions tied to deals

### 📱 Social Network (4 tables)
- `posts` - User-generated content with hashtags
- `comments` - Comments on posts
- `followers` - Follow relationships
- `post_engagement` - Likes and engagement tracking

### 📅 Event Management (4 tables)
- `events` - Event creation and management
- `event_tickets` - QR-coded tickets for attendees
- `event_sessions` - Breakout sessions
- `event_rsvp` - RSVP tracking

### ☎️ Call Center (2 tables)
- `inbound_calls` - Recorded call data with transcripts
- `agents` - AI agents and their configurations

### 🔄 Workflow Automation (3 tables)
- `workflows` - AI-generated automated workflows
- `workflow_steps` - Individual workflow actions
- `workflow_logs` - Execution history

### 🏢 Enterprise Admin (9 tables)
- `roles` - Role definitions
- `user_roles` - User to role assignments
- `permissions` - Permission definitions
- `role_permissions` - Role to permission mapping
- `api_keys` - API key management
- `audit_log` - Complete audit trail
- `system_usage` - Metrics and analytics
- `webhook_health` - Webhook monitoring
- `rate_limits` - Rate limiting tracking
- `billing` - Subscription and usage

### 🏭 Multi-Tenant (1 table)
- `companies` - Company/organization accounts

### 🛍️ Vendor Marketplace (3 tables)
- `vendor_products` - Sellable lead products
- `vendor_product_orders` - Orders for leads
- `vendor_pricing_history` - Price optimization tracking

### ⚖️ Disputes (1 table)
- `vendor_disputes` - Dispute resolution system

---

## ✅ Deploy Steps

### 1. Create D1 Database
```bash
wrangler d1 create hd2d
```
Copy the `database_id` from output.

### 2. Update wrangler.toml
```toml
[[d1_databases]]
binding = "DB"
database_name = "hd2d"
database_id = "YOUR_DATABASE_ID"  # Paste here
```

### 3. Run All Migrations
```bash
cd backend

# Run each migration in order:
wrangler d1 execute hd2d --file=D1_migrations/0001_initial_schema.sql
wrangler d1 execute hd2d --file=D1_migrations/0002_leads.sql
wrangler d1 execute hd2d --file=D1_migrations/0003_deals.sql
wrangler d1 execute hd2d --file=D1_migrations/0004_social.sql
wrangler d1 execute hd2d --file=D1_migrations/0005_events.sql
wrangler d1 execute hd2d --file=D1_migrations/0006_calls.sql
wrangler d1 execute hd2d --file=D1_migrations/0007_workflows.sql
wrangler d1 execute hd2d --file=D1_migrations/0008_enterprise_admin.sql
wrangler d1 execute hd2d --file=D1_migrations/0009_multi_company.sql
wrangler d1 execute hd2d --file=D1_migrations/0010_whitelabel.sql
wrangler d1 execute hd2d --file=D1_migrations/0011_vendor_mode.sql
wrangler d1 execute hd2d --file=D1_migrations/0012_vendor_marketplace.sql
wrangler d1 execute hd2d --file=D1_migrations/0013_lead_verification.sql
wrangler d1 execute hd2d --file=D1_migrations/0014_pricing_disputes.sql
```

### 4. Verify
```bash
wrangler d1 shell hd2d
# In shell:
.tables
# Should show 40+ tables
```

### 5. Deploy
```bash
wrangler deploy
```

---

## 📂 All Files Location

All migration files are in: `backend/D1_migrations/`

- `0001_initial_schema.sql` - Users & auth
- `0002_leads.sql` - Lead management
- `0003_deals.sql` - Deal pipeline
- `0004_social.sql` - Social network
- `0005_events.sql` - Events
- `0006_calls.sql` - Call center
- `0007_workflows.sql` - Automation
- `0008_enterprise_admin.sql` - RBAC & audit
- `0009_multi_company.sql` - Multi-tenant
- `0010_whitelabel.sql` - White-label
- `0011_vendor_mode.sql` - Vendor support
- `0012_vendor_marketplace.sql` - Marketplace
- `0013_lead_verification.sql` - Verification
- `0014_pricing_disputes.sql` - Pricing & disputes

---

## 🔍 Full Schema Reference

For complete SQL for each table, see:
- `D1_MIGRATION_GUIDE.md` - Full schema with all columns
- Individual `.sql` files in `backend/D1_migrations/`

---

## 💡 Key Points

✅ All migrations are idempotent (safe to run multiple times)  
✅ Foreign keys and indexes included  
✅ Default values for timestamps  
✅ Production-ready schema  
✅ Supports multi-tenant companies  

**Ready to deploy!**
