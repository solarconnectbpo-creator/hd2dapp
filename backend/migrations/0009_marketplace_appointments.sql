-- Lead marketplace appointment inventory.
-- Lifecycle: available -> reserved (Stripe Checkout TTL) -> sold.
-- See backend/src/marketplace/marketplaceDb.ts

CREATE TABLE IF NOT EXISTS marketplace_appointments (
  id                TEXT PRIMARY KEY,
  status            TEXT NOT NULL DEFAULT 'available',
  homeowner_name    TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  zip               TEXT,
  scheduled_at      INTEGER,
  price_usd         REAL,
  notes             TEXT,
  reserved_by       TEXT,
  reserved_until    INTEGER,
  sold_to           TEXT,
  sold_at           INTEGER,
  stripe_session_id TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL
);

-- Browse query filters on status + state and orders by schedule.
CREATE INDEX IF NOT EXISTS idx_marketplace_appts_status_state
  ON marketplace_appointments (status, state);

-- Cron sweep for lapsed reservations.
CREATE INDEX IF NOT EXISTS idx_marketplace_appts_reserved_until
  ON marketplace_appointments (reserved_until)
  WHERE status = 'reserved';

-- "My purchases" lookup.
CREATE INDEX IF NOT EXISTS idx_marketplace_appts_sold_to
  ON marketplace_appointments (sold_to);
