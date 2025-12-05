# Cloudflare Workers Deployment Guide

## Quick Start: Deploy HD2D Backend to Cloudflare

### Step 1: Install Wrangler CLI
```bash
npm install -g wrangler
```

### Step 2: Authenticate with Cloudflare
```bash
cd backend
wrangler login
```
This opens your browser to authenticate. Log in with your Cloudflare account.

### Step 3: Create Cloudflare Database (D1)
```bash
wrangler d1 create hd2d
```
Copy the `database_id` from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "hd2d"
database_id = "YOUR_DATABASE_ID"  # Paste here
```

### Step 4: Create KV Namespace
```bash
wrangler kv:namespace create "HD2D_CACHE"
```
Copy the `id` and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "HD2D_CACHE"
id = "YOUR_KV_ID"
```

### Step 5: Deploy to Cloudflare Workers
```bash
wrangler deploy
```

**Note the URL provided** - it will look like:
```
https://hd2d-backend.YOUR_USERNAME.workers.dev
```

### Step 6: Connect Custom Domain

1. Go to https://dash.cloudflare.com
2. Select your domain (hardcoredoortodoorclosers.com)
3. Go to **Workers & Pages** → **Routes**
4. Click **Create Route**
5. Set route: `https://hardcoredoortodoorclosers.com/api/*`
6. Select the Worker: `hd2d-backend`
7. Save

### Step 7: Update HD2D App to Use Deployed Backend

Set this environment variable in the app:
```
EXPO_PUBLIC_API_URL=https://hd2d-backend.YOUR_USERNAME.workers.dev
```

Or if using custom domain:
```
EXPO_PUBLIC_API_URL=https://hardcoredoortodoorclosers.com
```

### Step 8: Run Migrations
Once deployed, run migrations on the D1 database:
```bash
wrangler d1 execute hd2d --file=./D1_migrations/001_initial_schema.sql
```

### Done!
Your backend is now deployed to Cloudflare Workers and connected to your domain.

---

## Troubleshooting

**"No such table" error?**
- Run: `wrangler d1 execute hd2d --file=./D1_migrations/001_initial_schema.sql`

**Worker not responding?**
- Check logs: `wrangler tail`

**Custom domain not working?**
- Wait 5-10 minutes for DNS propagation
- Verify route in Cloudflare dashboard

---

## Local Backend (Development)
To test locally without Cloudflare:
```bash
cd backend
npm run dev
# Backend runs on http://localhost:8787
```
