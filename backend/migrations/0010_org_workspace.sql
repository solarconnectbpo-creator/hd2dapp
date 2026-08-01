-- Organization workspace: contact/branding profile plus agreement documents.
-- Bodies under ~1.5MB are stored inline as base64; larger files go to the ORG_FILES R2 bucket.
-- See backend/src/api/orgWorkspaceRoutes.ts

CREATE TABLE IF NOT EXISTS org_profiles (
  org_id     TEXT PRIMARY KEY,
  phone      TEXT,
  website    TEXT,
  address    TEXT,
  logo_url   TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS org_agreements (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  title        TEXT NOT NULL,
  content_type TEXT,
  size_bytes   INTEGER,
  -- 'd1' when body_base64 holds the file, 'r2' when it lives in ORG_FILES.
  storage      TEXT NOT NULL DEFAULT 'd1',
  body_base64  TEXT,
  uploaded_by  TEXT,
  created_at   INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_org_agreements_org
  ON org_agreements (org_id, created_at DESC);
