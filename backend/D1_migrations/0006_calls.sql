CREATE TABLE IF NOT EXISTS inbound_calls (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  from_number TEXT,
  to_number TEXT,
  status TEXT,
  duration INTEGER,
  transcript TEXT,
  summary TEXT,
  intent TEXT,
  lead_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT,
  skills TEXT,
  last_active TEXT,
  webhook_url TEXT
);
