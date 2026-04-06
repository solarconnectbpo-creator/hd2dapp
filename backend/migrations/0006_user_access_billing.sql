-- Account access: admin approval + paid membership (Stripe subscription) before full app access.
ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;

-- Grandfather existing rows (pre-gate users stay fully active).
UPDATE users SET approval_status = 'approved', billing_status = 'active';
