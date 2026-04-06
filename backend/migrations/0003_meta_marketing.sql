-- Meta (Facebook) marketing: OAuth tokens per HD2D user + scheduled Page posts.
CREATE TABLE IF NOT EXISTS meta_user_tokens (
  user_id TEXT PRIMARY KEY NOT NULL,
  access_token TEXT NOT NULL,
  expires_at INTEGER,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meta_scheduled_posts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  page_name TEXT,
  message TEXT NOT NULL,
  link_url TEXT,
  scheduled_unix INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  meta_post_id TEXT,
  last_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meta_scheduled_user ON meta_scheduled_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_scheduled_due ON meta_scheduled_posts (status, scheduled_unix);
