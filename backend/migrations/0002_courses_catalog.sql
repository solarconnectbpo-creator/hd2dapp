-- Single-row JSON blob for /courses catalog (managed via admin portal).
CREATE TABLE IF NOT EXISTS courses_catalog (
  id TEXT PRIMARY KEY NOT NULL,
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
