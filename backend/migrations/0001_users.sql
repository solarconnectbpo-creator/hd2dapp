-- HD2D app users (passwords stored as PBKDF2-SHA256 hex + salt hex).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'company', 'sales_rep')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
