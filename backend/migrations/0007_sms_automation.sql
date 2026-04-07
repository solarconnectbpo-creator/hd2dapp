-- SMS automation: contacts, messages, workflows, org routing, Stripe metered SMS item

-- Map inbound E.164 numbers to an organization (Telnyx "to" number).
CREATE TABLE IF NOT EXISTS sms_org_numbers (
  phone_e164 TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  label TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sms_org_numbers_org ON sms_org_numbers(org_id);

CREATE TABLE IF NOT EXISTS sms_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  unsubscribed INTEGER NOT NULL DEFAULT 0,
  last_inbound_at INTEGER,
  provider TEXT NOT NULL DEFAULT 'telnyx',
  automations_paused INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_contacts_org_phone ON sms_contacts(org_id, phone_e164);

CREATE TABLE IF NOT EXISTS sms_messages (
  id TEXT PRIMARY KEY NOT NULL,
  contact_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  body TEXT NOT NULL,
  external_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (contact_id) REFERENCES sms_contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_contact ON sms_messages(contact_id, created_at);

CREATE TABLE IF NOT EXISTS sms_workflows (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  steps_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sms_workflows_org ON sms_workflows(org_id);

CREATE TABLE IF NOT EXISTS sms_workflow_runs (
  id TEXT PRIMARY KEY NOT NULL,
  workflow_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  current_step_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'failed')),
  next_run_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (workflow_id) REFERENCES sms_workflows(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES sms_contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sms_workflow_runs_next ON sms_workflow_runs(status, next_run_at);

-- Stripe metered usage for SMS (subscription item id for usage records API)
ALTER TABLE users ADD COLUMN stripe_subscription_item_sms TEXT;
