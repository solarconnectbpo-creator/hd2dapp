CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY,
  contact_name TEXT,
  company TEXT,
  value REAL,
  stage TEXT,
  probability INTEGER,
  phone TEXT,
  email TEXT,
  notes TEXT,
  assigned_to TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deal_activity (
  id TEXT PRIMARY KEY,
  deal_id TEXT,
  event TEXT,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deal_id) REFERENCES deals(id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  deal_id TEXT,
  title TEXT,
  due_date TEXT,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
