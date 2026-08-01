-- Durable server-side storage for workspace documents that previously lived only in
-- browser localStorage (measurements, estimates, contracts, field projects, canvassing).
--
-- One generic table keeps sync logic in a single place: every record is an opaque JSON
-- document identified by (kind, id) and owned by a user, optionally visible to their org.
-- Sync is last-write-wins on `updated_at`; deletes are soft so other devices can observe them.
--
-- See backend/src/workspace/workspaceDb.ts

CREATE TABLE IF NOT EXISTS workspace_records (
  id         TEXT NOT NULL,
  -- 'measurement' | 'estimate' | 'contract' | 'field_project' | 'canvass_lead' | 'canvass_visit' | 'saved_job'
  kind       TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  -- Denormalized from org_members so team reads do not need a join.
  org_id     TEXT,
  -- JSON document; shape is owned by the client feature.
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  -- Soft delete so other devices can converge instead of resurrecting rows.
  deleted_at INTEGER,
  PRIMARY KEY (user_id, kind, id)
);

-- Incremental pull: "everything of this kind changed since N".
CREATE INDEX IF NOT EXISTS idx_workspace_records_user_kind_updated
  ON workspace_records (user_id, kind, updated_at);

-- Manager/team view across an organization.
CREATE INDEX IF NOT EXISTS idx_workspace_records_org_kind_updated
  ON workspace_records (org_id, kind, updated_at);
