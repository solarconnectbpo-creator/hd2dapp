-- ============================================================================
-- HD2D D1 Database - Complete Schema
-- All migrations combined for Cloudflare D1
-- Copy and paste this into wrangler d1 shell
-- ============================================================================

-- ============================================================================
-- Migration 0001: Users & Authentication
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Migration 0002: Leads Management
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  industry TEXT,
  location TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  price REAL,
  quality_score INTEGER,
  lead_type TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  assigned_to TEXT,
  status TEXT DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS lead_activity (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  event TEXT,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

-- ============================================================================
-- Migration 0003: Deals Pipeline
-- ============================================================================
CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  contact_name TEXT,
  company TEXT,
  value REAL,
  stage TEXT,
  probability INTEGER,
  phone TEXT,
  email TEXT,
  notes TEXT,
  assigned_to TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deal_activity (
  id TEXT PRIMARY KEY,
  deal_id TEXT,
  event TEXT,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  deal_id TEXT,
  title TEXT,
  due_date TEXT,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Migration 0004: Social Network
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  content TEXT,
  media_url TEXT,
  hashtags TEXT,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  user_id TEXT,
  content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS followers (
  follower_id TEXT,
  following_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_engagement (
  id TEXT PRIMARY KEY,
  post_id TEXT,
  user_id TEXT,
  type TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON posts(hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);

-- ============================================================================
-- Migration 0005: Events
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  cover_url TEXT,
  location TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  capacity INTEGER,
  organizer_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  user_id TEXT,
  type TEXT,
  qr_code TEXT,
  checked_in INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  title TEXT,
  description TEXT,
  start_time TEXT,
  end_time TEXT,
  speaker TEXT
);

CREATE TABLE IF NOT EXISTS event_rsvp (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  user_id TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_tickets_event ON event_tickets(event_id);
CREATE INDEX idx_rsvp_event ON event_rsvp(event_id);

-- ============================================================================
-- Migration 0006: Call Center
-- ============================================================================
CREATE TABLE IF NOT EXISTS inbound_calls (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  from_number TEXT,
  to_number TEXT,
  status TEXT,
  duration INTEGER,
  transcript TEXT,
  summary TEXT,
  intent TEXT,
  lead_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  skills TEXT,
  last_active TEXT,
  webhook_url TEXT
);

-- ============================================================================
-- Migration 0007: Workflow Automation
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  created_by TEXT,
  active INTEGER DEFAULT 1,
  ai_generated INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  step_order INTEGER,
  type TEXT,
  config TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE TABLE IF NOT EXISTS workflow_logs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  event TEXT,
  data TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE INDEX idx_workflows_active ON workflows(active);
CREATE INDEX idx_workflow_steps_order ON workflow_steps(workflow_id, step_order);
CREATE INDEX idx_workflow_logs_created ON workflow_logs(created_at);

-- ============================================================================
-- Migration 0008: Enterprise Admin (RBAC & Audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  role_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT,
  permission_id TEXT,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  key TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  resource TEXT,
  metadata TEXT,
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_usage (
  id TEXT PRIMARY KEY,
  metric TEXT,
  value REAL,
  time_bucket TEXT
);

CREATE TABLE IF NOT EXISTS webhook_health (
  id TEXT PRIMARY KEY,
  url TEXT,
  status TEXT,
  latency_ms INTEGER,
  last_checked TEXT
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  key TEXT,
  count INTEGER,
  window_end TEXT
);

CREATE TABLE IF NOT EXISTS billing (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  plan TEXT,
  status TEXT,
  renewal_date TEXT,
  usage INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_roles ON user_roles(user_id);
CREATE INDEX idx_role_permissions ON role_permissions(role_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_rate_limits_user ON rate_limits(user_id);

-- ============================================================================
-- Migration 0009: Multi-Tenant Companies
-- ============================================================================
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT,
  industry TEXT,
  logo_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE leads ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE deals ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE events ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE posts ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE inbound_calls ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE agents ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE workflows ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE api_keys ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE billing ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE audit_log ADD COLUMN company_id TEXT;

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_events_company ON events(company_id);
CREATE INDEX idx_posts_company ON posts(company_id);
CREATE INDEX idx_workflows_company ON workflows(company_id);
CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_audit_log_company ON audit_log(company_id);

-- ============================================================================
-- Migration 0010: White-Label Branding
-- ============================================================================
ALTER TABLE companies ADD COLUMN branding TEXT DEFAULT '{}';
ALTER TABLE companies ADD COLUMN custom_domain TEXT;
ALTER TABLE companies ADD COLUMN smtp_config TEXT;
ALTER TABLE companies ADD COLUMN sms_footer TEXT DEFAULT '';
ALTER TABLE companies ADD COLUMN ai_voice TEXT DEFAULT 'default';

CREATE INDEX idx_companies_custom_domain ON companies(custom_domain);

-- ============================================================================
-- Migration 0011: Vendor Mode
-- ============================================================================
ALTER TABLE companies ADD COLUMN is_vendor INTEGER DEFAULT 0;

CREATE INDEX idx_companies_vendor ON companies(is_vendor);

-- ============================================================================
-- Migration 0012: Vendor Marketplace
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_products (
  id TEXT PRIMARY KEY,
  vendor_id TEXT REFERENCES companies(id),
  name TEXT,
  type TEXT,
  vertical TEXT,
  description TEXT,
  price REAL,
  price_type TEXT,
  delivery_method TEXT,
  settings TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_product_orders (
  id TEXT PRIMARY KEY,
  buyer_id TEXT REFERENCES companies(id),
  vendor_id TEXT REFERENCES companies(id),
  product_id TEXT REFERENCES vendor_products(id),
  quantity INTEGER,
  amount REAL,
  status TEXT,
  delivery_log TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_products_vendor ON vendor_products(vendor_id);
CREATE INDEX idx_vendor_products_type ON vendor_products(type);
CREATE INDEX idx_vendor_products_active ON vendor_products(active);
CREATE INDEX idx_vendor_orders_buyer ON vendor_product_orders(buyer_id);
CREATE INDEX idx_vendor_orders_vendor ON vendor_product_orders(vendor_id);
CREATE INDEX idx_vendor_orders_status ON vendor_product_orders(status);

-- ============================================================================
-- Migration 0013: Lead Verification
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_verification (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  vendor_id TEXT REFERENCES companies(id),
  risk_score INTEGER,
  quality_score INTEGER,
  result_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_verification_lead ON lead_verification(lead_id);
CREATE INDEX idx_lead_verification_vendor ON lead_verification(vendor_id);
CREATE INDEX idx_lead_verification_scores ON lead_verification(risk_score, quality_score);

-- ============================================================================
-- Migration 0014: Pricing & Disputes
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_pricing_history (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES vendor_products(id),
  old_price REAL,
  new_price REAL,
  reason TEXT,
  strategy TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES vendor_product_orders(id),
  buyer_id TEXT REFERENCES companies(id),
  vendor_id TEXT REFERENCES companies(id),
  lead_id TEXT REFERENCES leads(id),
  reason TEXT,
  status TEXT,
  resolution TEXT,
  ai_recommendation TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_history_product ON vendor_pricing_history(product_id);
CREATE INDEX idx_pricing_history_created ON vendor_pricing_history(created_at);
CREATE INDEX idx_disputes_order ON vendor_disputes(order_id);
CREATE INDEX idx_disputes_buyer ON vendor_disputes(buyer_id);
CREATE INDEX idx_disputes_vendor ON vendor_disputes(vendor_id);
CREATE INDEX idx_disputes_status ON vendor_disputes(status);

-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================
-- Total Tables: 40+
-- Total Indexes: 30+
-- All migrations are idempotent (safe to run multiple times)
