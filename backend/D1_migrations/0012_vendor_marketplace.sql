-- VENDOR MARKETPLACE
CREATE TABLE IF NOT EXISTS vendor_products (
  id TEXT PRIMARY KEY,
  vendor_id TEXT REFERENCES companies(id),
  name TEXT,
  type TEXT,
  vertical TEXT,
  description TEXT,
  price REAL,
  price_type TEXT,
  delivery_method TEXT,
  settings TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_product_orders (
  id TEXT PRIMARY KEY,
  buyer_id TEXT REFERENCES companies(id),
  vendor_id TEXT REFERENCES companies(id),
  product_id TEXT REFERENCES vendor_products(id),
  quantity INTEGER,
  amount REAL,
  status TEXT,
  delivery_log TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendor_products_vendor ON vendor_products(vendor_id);
CREATE INDEX idx_vendor_products_type ON vendor_products(type);
CREATE INDEX idx_vendor_products_active ON vendor_products(active);
CREATE INDEX idx_vendor_orders_buyer ON vendor_product_orders(buyer_id);
CREATE INDEX idx_vendor_orders_vendor ON vendor_product_orders(vendor_id);
CREATE INDEX idx_vendor_orders_status ON vendor_product_orders(status);
