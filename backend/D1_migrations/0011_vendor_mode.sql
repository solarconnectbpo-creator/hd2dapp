-- VENDOR MODE - Lead Provider Support
ALTER TABLE companies ADD COLUMN is_vendor INTEGER DEFAULT 0;

CREATE INDEX idx_companies_vendor ON companies(is_vendor);
