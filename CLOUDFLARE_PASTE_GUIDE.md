# 📝 Cloudflare D1 - Paste & Deploy Guide

## 🚀 Complete Step-by-Step Instructions

### Step 1: Authenticate with Cloudflare
```bash
wrangler login
# Browser opens - log in with your Cloudflare account
```

### Step 2: Create D1 Database
```bash
wrangler d1 create hd2d
```

**Output will show:**
```
✅ Created database 'hd2d'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 3: Copy Database ID to wrangler.toml
Open `backend/wrangler.toml` and add:
```toml
[[d1_databases]]
binding = "DB"
database_name = "hd2d"
database_id = "YOUR_DATABASE_ID_HERE"  # Paste the ID from Step 2
```

### Step 4: Create KV Namespace
```bash
wrangler kv:namespace create "HD2D_CACHE"
```

**Output will show:**
```
✅ Created KV namespace
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### Step 5: Copy KV ID to wrangler.toml
Add to `backend/wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "HD2D_CACHE"
id = "YOUR_KV_ID_HERE"
```

### Step 6: Run Migrations (CHOOSE ONE METHOD)

#### Method A: Individual Files (Safest)
```bash
cd backend

wrangler d1 execute hd2d --file=D1_migrations/0001_initial_schema.sql
wrangler d1 execute hd2d --file=D1_migrations/0002_leads.sql
wrangler d1 execute hd2d --file=D1_migrations/0003_deals.sql
wrangler d1 execute hd2d --file=D1_migrations/0004_social.sql
wrangler d1 execute hd2d --file=D1_migrations/0005_events.sql
wrangler d1 execute hd2d --file=D1_migrations/0006_calls.sql
wrangler d1 execute hd2d --file=D1_migrations/0007_workflows.sql
wrangler d1 execute hd2d --file=D1_migrations/0008_enterprise_admin.sql
wrangler d1 execute hd2d --file=D1_migrations/0009_multi_company.sql
wrangler d1 execute hd2d --file=D1_migrations/0010_whitelabel.sql
wrangler d1 execute hd2d --file=D1_migrations/0011_vendor_mode.sql
wrangler d1 execute hd2d --file=D1_migrations/0012_vendor_marketplace.sql
wrangler d1 execute hd2d --file=D1_migrations/0013_lead_verification.sql
wrangler d1 execute hd2d --file=D1_migrations/0014_pricing_disputes.sql
```

#### Method B: All at Once (Fastest)
```bash
cd backend
wrangler d1 execute hd2d --file=../D1_ALL_MIGRATIONS.sql
```

### Step 7: Verify Migrations
```bash
wrangler d1 shell hd2d
```

In the shell, run:
```sql
.tables
```

Should output 40+ table names like:
```
users  leads  deals  posts  comments  followers  events  event_tickets
workflows  roles  permissions  companies  vendor_products  ...
```

Count tables:
```sql
SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table';
```

Should show: **40+** tables

Exit shell: `.exit`

### Step 8: Deploy Backend
```bash
wrangler deploy
```

**Output will show:**
```
✅ Deployed to https://hd2d-backend.YOUR_USERNAME.workers.dev
```

### Step 9: Connect Custom Domain (Optional but Recommended)

1. Go to https://dash.cloudflare.com
2. Select your domain: `hardcoredoortodoorclosers.com`
3. Go to **Workers & Pages** → **Routes**
4. Click **Create Route**
5. Fill in:
   - **Route:** `https://hardcoredoortodoorclosers.com/api/*`
   - **Worker:** `hd2d-backend`
6. Click **Save**

### Step 10: Update Frontend API URL

Set environment variable:
```
EXPO_PUBLIC_API_URL=https://hardcoredoortodoorclosers.com
```

Or if using Workers URL directly:
```
EXPO_PUBLIC_API_URL=https://hd2d-backend.YOUR_USERNAME.workers.dev
```

---

## 📁 Files You Need

| File | Location | Purpose |
|------|----------|---------|
| `D1_ALL_MIGRATIONS.sql` | Project root | All migrations combined (fastest) |
| Individual migrations | `backend/D1_migrations/` | Individual .sql files (safest) |
| `wrangler.toml` | `backend/` | Configuration (update with IDs) |

---

## ✅ Verification Checklist

After deployment, verify everything works:

```bash
# 1. Check database exists
wrangler d1 shell hd2d
SELECT COUNT(*) FROM users;  # Should return 0 (empty)
.exit

# 2. Check backend API
curl https://hd2d-backend.YOUR_USERNAME.workers.dev/api

# 3. Test login endpoint
curl -X POST https://hd2d-backend.YOUR_USERNAME.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

---

## 🔒 Security Notes

Before going to production, set these environment variables:

```bash
wrangler secret put SESSION_SECRET
# Generate a strong random string, e.g., using: openssl rand -hex 32

wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key
```

---

## 📊 What Gets Created

### 40+ Tables Across 10 Systems:
- ✅ User authentication
- ✅ Lead management with verification
- ✅ Deal pipeline with forecasting
- ✅ Social network
- ✅ Event management
- ✅ Call center integration
- ✅ Workflow automation
- ✅ Enterprise admin & RBAC
- ✅ Multi-tenant companies
- ✅ Vendor marketplace

### All 14 Migrations:
- ✅ 0001: Users & auth
- ✅ 0002: Leads
- ✅ 0003: Deals
- ✅ 0004: Social
- ✅ 0005: Events
- ✅ 0006: Calls
- ✅ 0007: Workflows
- ✅ 0008: Enterprise admin
- ✅ 0009: Multi-tenant
- ✅ 0010: White-label
- ✅ 0011: Vendor mode
- ✅ 0012: Marketplace
- ✅ 0013: Lead verification
- ✅ 0014: Pricing & disputes

---

## 🎯 Quick Summary

```bash
# Total setup time: ~10 minutes

wrangler login                                    # 1 min
wrangler d1 create hd2d                         # 1 min
# Edit wrangler.toml with IDs                   # 1 min
wrangler d1 execute hd2d --file=../D1_ALL_MIGRATIONS.sql  # 1 min
wrangler deploy                                  # 2 min
# Configure domain at dash.cloudflare.com       # 3 min

✅ Platform is live!
```

---

## 🆘 Troubleshooting

**"Table already exists"**
- Migrations are idempotent (safe to run again)
- Just run again: `wrangler d1 execute hd2d --file=D1_ALL_MIGRATIONS.sql`

**"Database not found"**
- Make sure `database_id` is in `wrangler.toml`
- Run: `wrangler d1 list` to see your databases

**"Cannot connect to database"**
- Verify `wrangler.toml` has correct `database_id`
- Check you're authenticated: `wrangler whoami`

**"KV namespace not found"**
- Add to `wrangler.toml`: `[[kv_namespaces]]` section
- Copy the `id` from `wrangler kv:namespace create` output

---

## 📞 Need Help?

See also:
- `D1_MIGRATION_GUIDE.md` - Full schema reference
- `CLOUDFLARE_D1_TABLES.md` - Table quick reference
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `DEPLOYMENT_QUICK_START.md` - Quick checklist

---

**You're ready! Run the commands above and your database will be live in 10 minutes.**
