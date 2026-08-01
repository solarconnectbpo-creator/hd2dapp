-- Per-org CRM delivery settings + marketplace contact fields + package purchase ledger.
-- See backend/src/services/crm/orgCrmDelivery.ts and marketplaceRoutes.ts
--
-- Ensures org_profiles exists (if 0010 was never applied), then adds CRM columns.
-- marketplace phone/email require 0009 first.

CREATE TABLE IF NOT EXISTS org_profiles (
  org_id     TEXT PRIMARY KEY,
  phone      TEXT,
  website    TEXT,
  address    TEXT,
  logo_url   TEXT,
  updated_at INTEGER NOT NULL
);

ALTER TABLE org_profiles ADD COLUMN crm_webhook_url TEXT;
ALTER TABLE org_profiles ADD COLUMN ghl_api_token TEXT;
ALTER TABLE org_profiles ADD COLUMN ghl_location_id TEXT;

ALTER TABLE marketplace_appointments ADD COLUMN phone TEXT;
ALTER TABLE marketplace_appointments ADD COLUMN email TEXT;

CREATE TABLE IF NOT EXISTS lead_package_purchases (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  org_id            TEXT,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_price_id   TEXT,
  amount_total      INTEGER,
  currency          TEXT,
  status            TEXT NOT NULL DEFAULT 'paid',
  crm_pushed_at     INTEGER,
  crm_push_error    TEXT,
  created_at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_package_purchases_user
  ON lead_package_purchases (user_id, created_at DESC);
