# Deploy HD2D in 10 Minutes

## 🚀 Fastest Path to Production

### Option 1: Local Testing (Development)
```bash
# Terminal 1: Start Frontend
npm run dev

# Terminal 2: Start Backend
cd backend && npm run dev
```
- Frontend: http://localhost:8081 (web)
- Backend: http://localhost:8787
- ✅ Works immediately without Cloudflare account

---

### Option 2: Deploy to Cloudflare + Custom Domain (Production)

#### You Need:
- ✅ Cloudflare account (free) → https://dash.cloudflare.com
- ✅ Domain: hardcoredoortodoorclosers.com (already pointing to Cloudflare DNS)

#### Step 1: Authenticate (2 min)
```bash
cd backend
npm install -g wrangler
wrangler login
# Browser opens, log in with your Cloudflare account
```

#### Step 2: Create Resources (2 min)
```bash
# Create D1 Database
wrangler d1 create hd2d

# Copy database_id and paste into backend/wrangler.toml:
# [[d1_databases]]
# database_id = "YOUR_ID_HERE"

# Create KV Storage
wrangler kv:namespace create "HD2D_CACHE"

# Copy ID and paste into backend/wrangler.toml:
# [[kv_namespaces]]
# id = "YOUR_ID_HERE"
```

#### Step 3: Deploy (2 min)
```bash
wrangler deploy
# Note the URL: https://hd2d-backend.YOUR_USERNAME.workers.dev
```

#### Step 4: Connect Domain (2 min)
1. https://dash.cloudflare.com → Select hardcoredoortodoorclosers.com
2. Workers & Pages → Routes → Create Route
3. Route: `https://hardcoredoortodoorclosers.com/api/*`
4. Worker: `hd2d-backend`
5. Save

#### Step 5: Update App (1 min)
**In Replit**, set environment variable:
```
EXPO_PUBLIC_API_URL=https://hardcoredoortodoorclosers.com
```

#### Step 6: Run Migrations (1 min)
```bash
wrangler d1 execute hd2d --file=./D1_migrations/001_initial_schema.sql
wrangler d1 execute hd2d --file=./D1_migrations/002_users_auth.sql
# ... run all 13 migrations
```

---

## ✅ Testing It Works

### Local Test
```bash
# Login screen → test@example.com / password123
# 2FA code → any 6 digits (e.g., 123456)
```

### Production Test
After deploying to Cloudflare:
```bash
curl https://hardcoredoortodoorclosers.com/api
# Should respond with API status
```

---

## 📚 Full Details
See `CLOUDFLARE_DEPLOYMENT_GUIDE.md` for troubleshooting and advanced setup.

---

## Current App Status
✅ Frontend: Fully functional with local auth fallback  
✅ 2FA: Development mode accepts any 6-digit code  
✅ API Client: Configured to use `EXPO_PUBLIC_API_URL`  
✅ Backend: Ready to deploy to Cloudflare Workers  
✅ Database: 13 migrations ready  

**You are ready to deploy!**
