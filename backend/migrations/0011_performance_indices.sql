-- Indices for the hot lookup paths (auth, org membership, SMS).
-- Safe to re-run: every statement is IF NOT EXISTS.

-- Login and admin user lookups.
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users (stripe_customer_id);

-- Org membership is read on every /api/org request.
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members (user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members (org_id);

-- Rep placement / directory matching.
CREATE INDEX IF NOT EXISTS idx_rep_profiles_status ON rep_profiles (status);
CREATE INDEX IF NOT EXISTS idx_rep_profiles_matched_org ON rep_profiles (matched_org_id);
