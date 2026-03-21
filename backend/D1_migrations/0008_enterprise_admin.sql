-- ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  role_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role_id TEXT,
  permission_id TEXT,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);

-- API KEYS
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  key TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT,
  resource TEXT,
  metadata TEXT,
  ip TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- SYSTEM USAGE METRICS
CREATE TABLE IF NOT EXISTS system_usage (
  id TEXT PRIMARY KEY,
  metric TEXT,
  value REAL,
  time_bucket TEXT
);

-- WEBHOOK HEALTH MONITOR
CREATE TABLE IF NOT EXISTS webhook_health (
  id TEXT PRIMARY KEY,
  url TEXT,
  status TEXT,
  latency_ms INTEGER,
  last_checked TEXT
);

-- RATE LIMITING
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  key TEXT,
  count INTEGER,
  window_end TEXT
);

-- BILLING
CREATE TABLE IF NOT EXISTS billing (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  plan TEXT,
  status TEXT,
  renewal_date TEXT,
  usage INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_roles ON user_roles(user_id);
CREATE INDEX idx_role_permissions ON role_permissions(role_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_rate_limits_user ON rate_limits(user_id);
