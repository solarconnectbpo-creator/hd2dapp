-- COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT,
  industry TEXT,
  logo_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ADD COMPANY_ID TO EXISTING TABLES
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

-- CREATE INDEXES FOR COMPANY-SCOPED QUERIES
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_leads_company ON leads(company_id);
CREATE INDEX idx_deals_company ON deals(company_id);
CREATE INDEX idx_events_company ON events(company_id);
CREATE INDEX idx_posts_company ON posts(company_id);
CREATE INDEX idx_workflows_company ON workflows(company_id);
CREATE INDEX idx_api_keys_company ON api_keys(company_id);
CREATE INDEX idx_audit_log_company ON audit_log(company_id);
