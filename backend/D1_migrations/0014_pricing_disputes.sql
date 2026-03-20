-- PRICE OPTIMIZATION HISTORY
CREATE TABLE IF NOT EXISTS vendor_pricing_history (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES vendor_products(id),
  old_price REAL,
  new_price REAL,
  reason TEXT,
  strategy TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- DISPUTES
CREATE TABLE IF NOT EXISTS vendor_disputes (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES vendor_product_orders(id),
  buyer_id TEXT REFERENCES companies(id),
  vendor_id TEXT REFERENCES companies(id),
  lead_id TEXT REFERENCES leads(id),
  reason TEXT,
  status TEXT,
  resolution TEXT,
  ai_recommendation TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_history_product ON vendor_pricing_history(product_id);
CREATE INDEX idx_pricing_history_created ON vendor_pricing_history(created_at);
CREATE INDEX idx_disputes_order ON vendor_disputes(order_id);
CREATE INDEX idx_disputes_buyer ON vendor_disputes(buyer_id);
CREATE INDEX idx_disputes_vendor ON vendor_disputes(vendor_id);
CREATE INDEX idx_disputes_status ON vendor_disputes(status);
