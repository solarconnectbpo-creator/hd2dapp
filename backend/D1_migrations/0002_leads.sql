CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  industry TEXT,
  location TEXT,
  city TEXT,
  latitude REAL,
  longitude REAL,
  price REAL,
  quality_score INTEGER,
  lead_type TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  assigned_to TEXT,
  status TEXT DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS lead_activity (
  id TEXT PRIMARY KEY,
  lead_id TEXT,
  event TEXT,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
