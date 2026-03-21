CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  created_by TEXT,
  active INTEGER DEFAULT 1,
  ai_generated INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  step_order INTEGER,
  type TEXT,
  config TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE TABLE IF NOT EXISTS workflow_logs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  event TEXT,
  data TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workflow_id) REFERENCES workflows(id)
);

CREATE INDEX idx_workflows_active ON workflows(active);
CREATE INDEX idx_workflow_steps_order ON workflow_steps(workflow_id, step_order);
CREATE INDEX idx_workflow_logs_created ON workflow_logs(created_at);
