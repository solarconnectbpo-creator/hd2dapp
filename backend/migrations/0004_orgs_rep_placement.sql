-- Organizations (billing / territory) and rep placement for field sales.
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  -- JSON array of 2-letter state codes, e.g. ["TX","OK"]
  service_states TEXT NOT NULL DEFAULT '[]',
  org_kind TEXT NOT NULL DEFAULT 'local' CHECK (org_kind IN ('local', 'storm', 'both')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS org_members (
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id, user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_one_org_per_user ON org_members(user_id);

CREATE TABLE IF NOT EXISTS rep_profiles (
  user_id TEXT PRIMARY KEY NOT NULL,
  home_state TEXT NOT NULL,
  placement_pref TEXT NOT NULL CHECK (placement_pref IN ('local', 'storm', 'either')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'paused')),
  matched_org_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (matched_org_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rep_profiles_home_state ON rep_profiles(home_state);
CREATE INDEX IF NOT EXISTS idx_rep_profiles_status ON rep_profiles(status);
