# ☁️ Cloudflare Deployment - Final Setup Guide

## Step 1: Install Wrangler (On Your Machine)

Open your terminal and run:
```bash
npm install -g wrangler
```

Verify installation:
```bash
wrangler -v
# Should output: wrangler 3.x.x
```

---

## Step 2: Authenticate with Cloudflare

Run this command (browser will open):
```bash
wrangler login
```

This will:
1. Open your Cloudflare account in browser
2. Ask for permission to access via Wrangler
3. Click "Allow"
4. Return to terminal - you're authenticated!

---

## Step 3: Clone/Download Your Project

If not already done:
```bash
git clone <your-repo>
cd workspace
```

---

## Step 4: Create D1 Database

```bash
wrangler d1 create hd2d
```

**Output will show:**
```
✅ Created database 'hd2d'
binding = "DB"
database_name = "hd2d"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**COPY THE DATABASE_ID**

---

## Step 5: Update wrangler.toml

Open `backend/wrangler.toml` and add at the bottom:

```toml
[[d1_databases]]
binding = "DB"
database_name = "hd2d"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"
```

---

## Step 6: Create KV Namespace

```bash
wrangler kv:namespace create "HD2D_CACHE"
```

**Output will show:**
```
✅ Created KV namespace 'HD2D_CACHE'
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**COPY THE ID**

---

## Step 7: Update wrangler.toml with KV

Add to `backend/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "HD2D_CACHE"
id = "PASTE_YOUR_KV_ID_HERE"
```

---

## Step 8: Deploy Database Migrations

```bash
cd backend

# Deploy all migrations at once:
wrangler d1 execute hd2d --file=../D1_ALL_MIGRATIONS.sql
```

**Wait for it to complete** - you'll see success message

---

## Step 9: Deploy Backend to Cloudflare

```bash
# Still in backend folder
wrangler deploy
```

**Output will show:**
```
✅ Deployed to https://hd2d-backend.YOUR_USERNAME.workers.dev
```

**COPY THIS URL**

---

## Step 10: Connect Custom Domain (Optional)

If you want `hardcoredoortodoorclosers.com` to work:

1. Go to https://dash.cloudflare.com
2. Select your domain
3. Go to **Workers & Pages** → **Routes**
4. Click **Create Route**
5. Enter:
   - **Route:** `https://hardcoredoortodoorclosers.com/api/*`
   - **Worker:** `hd2d-backend`
6. Click **Save**

---

## Step 11: Test Your Deployment

Test the API:
```bash
curl https://hd2d-backend.YOUR_USERNAME.workers.dev/api
```

Should respond with success.

---

## Step 12: Update Frontend API URL

In your Replit environment, set the environment variable:

```
EXPO_PUBLIC_API_URL=https://hd2d-backend.YOUR_USERNAME.workers.dev
```

Or if using custom domain:
```
EXPO_PUBLIC_API_URL=https://hardcoredoortodoorclosers.com
```

---

## ✅ Verification Checklist

Run these commands to verify everything is working:

### Check Database
```bash
wrangler d1 shell hd2d
.tables
# Should show 40+ table names
SELECT COUNT(*) FROM users;
# Should return 0
.exit
```

### Check Backend
```bash
curl https://hd2d-backend.YOUR_USERNAME.workers.dev/api/health
# Should respond with success
```

### Check Frontend
Visit your Replit URL and login with:
```
Email: test@example.com
Password: password123
2FA: 123456
```

---

## 🎉 Done!

Your platform is now deployed to Cloudflare and live!

### What You Have:
- ✅ Backend API: `https://hd2d-backend.YOUR_USERNAME.workers.dev`
- ✅ Database: D1 with 40+ tables
- ✅ KV Cache: For real-time features
- ✅ Global CDN: Cloudflare's network
- ✅ Frontend: Connected to backend

### Next Steps:
1. Test the app with login credentials
2. Create teams/companies
3. Add users
4. Start using the platform!

---

## 📝 Troubleshooting

**"Command not found: wrangler"**
- Install: `npm install -g wrangler`

**"Not authenticated"**
- Run: `wrangler login`

**"Database not found"**
- Check `database_id` in `wrangler.toml`
- Run: `wrangler d1 list`

**"Cannot connect to API"**
- Verify backend deployed: `wrangler deploy`
- Check logs: `wrangler tail`

**"API returns 404"**
- Ensure migrations ran successfully
- Check database has tables: `wrangler d1 shell hd2d` → `.tables`

---

## 📊 Your Deployment Summary

| Component | Location |
|-----------|----------|
| **Backend API** | Cloudflare Workers |
| **Database** | Cloudflare D1 |
| **Cache** | Cloudflare KV |
| **Frontend** | Replit (Expo Web) |
| **Domain** | hardcoredoortodoorclosers.com |

---

## 🚀 You're Live!

Your HD2D online platform is now running on Cloudflare and ready for users!
