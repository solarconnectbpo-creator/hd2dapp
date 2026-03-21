-- LEAD VERIFICATION PIPELINE
CREATE TABLE IF NOT EXISTS lead_verification (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES leads(id),
  vendor_id TEXT REFERENCES companies(id),
  risk_score INTEGER,
  quality_score INTEGER,
  result_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lead_verification_lead ON lead_verification(lead_id);
CREATE INDEX idx_lead_verification_vendor ON lead_verification(vendor_id);
CREATE INDEX idx_lead_verification_scores ON lead_verification(risk_score, quality_score);
