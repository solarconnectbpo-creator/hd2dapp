# HD2D Online Platform - Complete Setup Guide

Convert your mobile app into a fully-featured online platform with three deployment options.

---

## 📋 Quick Start (Choose Your Deployment)

### Option 1: Local Development (Fastest)
```bash
bash deploy.sh local
```
- ✅ Works immediately on your machine
- ✅ No cloud account needed
- ✅ Perfect for testing and development
- **Result:** http://localhost:8081

### Option 2: Docker (Recommended for VMs/Servers)
```bash
bash docker-deploy.sh
```
- ✅ Containerized deployment
- ✅ Works on any server or VPS
- ✅ Includes health checks and auto-restart
- **Requirements:** Docker and Docker Compose installed
- **Result:** http://your-domain:8081

### Option 3: Cloudflare Workers (Production)
```bash
bash deploy.sh production
```
- ✅ Serverless, zero-maintenance
- ✅ Global CDN for fast delivery
- ✅ Connect to custom domain
- **Requirements:** Cloudflare account + domain
- **Result:** https://hardcoredoortodoorclosers.com

---

## 🔧 Deployment Options Explained

### Local Development
Best for: Testing, development, learning
- Backend runs on `http://localhost:8787`
- Frontend runs on `http://localhost:8081`
- Uses local SQLite database
- Hot reload enabled

**Setup:**
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
npm run dev

# Visit: http://localhost:8081
```

---

### Docker Container
Best for: VMs, servers, self-hosted deployment
- Entire platform in containerized environment
- Automatic service management
- Easy scaling and upgrades

**Setup:**
```bash
# Install Docker & Docker Compose (if needed)
# https://docs.docker.com/get-docker/
# https://docs.docker.com/compose/install/

# Run deployment
bash docker-deploy.sh

# Services:
# - Frontend: http://localhost:8081
# - Backend: http://localhost:8787
```

**Docker Compose Commands:**
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Shell access
docker-compose exec backend sh
```

---

### Cloudflare Workers (Recommended for Production)
Best for: Production, custom domains, global reach

**Prerequisites:**
1. Cloudflare account (free): https://dash.cloudflare.com
2. Domain registered and pointed to Cloudflare DNS
3. Wrangler CLI installed

**Setup:**
```bash
# Step 1: Authenticate
wrangler login

# Step 2: Create D1 Database
wrangler d1 create hd2d
# Copy database_id to wrangler.toml

# Step 3: Create KV Storage
wrangler kv:namespace create "HD2D_CACHE"
# Copy id to wrangler.toml

# Step 4: Deploy
cd backend
wrangler deploy

# Step 5: Connect Custom Domain
# Go to: https://dash.cloudflare.com
# Select your domain → Workers & Pages → Routes
# Create route: hardcoredoortodoorclosers.com/api/*
# Point to: hd2d-backend worker

# Step 6: Run migrations
wrangler d1 execute hd2d --file=D1_migrations/001_initial_schema.sql
# (repeat for all 14 migrations)

# Step 7: Set environment variable
# In Replit: EXPO_PUBLIC_API_URL=https://hardcoredoortodoorclosers.com
```

---

## 🌍 Connecting to Your Domain

### For Docker Deployment:
```bash
# 1. Point DNS to your server IP
# 2. Configure nginx (optional):
docker-compose --profile production up -d

# 3. Your platform is now at: http://your-domain:8081
```

### For Cloudflare Workers:
```bash
# Already done in setup! Visit:
https://hardcoredoortodoorclosers.com
```

---

## 📊 Platform Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   HD2D Online Platform                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐              ┌─────────────────┐  │
│  │  Web Frontend   │              │   Mobile App    │  │
│  │ (React/Expo)   │              │  (Expo Go)      │  │
│  │  :8081          │              │                 │  │
│  └────────┬────────┘              └────────┬────────┘  │
│           │                                │            │
│           └────────────────┬───────────────┘            │
│                            │                            │
│           ┌────────────────▼───────────────┐            │
│           │    API Client                  │            │
│           │ (Automatic API routing)        │            │
│           └────────────────┬───────────────┘            │
│                            │                            │
│    ┌───────────────────────┴───────────────────────┐   │
│    │                                               │   │
│    ▼                                               ▼   │
│ ┌──────────────┐  (Option 1)        ┌──────────────┐ │
│ │  Backend API │                    │   Backend    │ │
│ │  :8787       │  (Option 2)        │   Cloudflare │ │
│ │  Local Dev   │                    │   Workers    │ │
│ │  Docker      │  (Option 3)        │   Production │ │
│ │  Cloudflare  │                    │              │ │
│ └──────┬───────┘                    └──────┬───────┘ │
│        │                                   │         │
│        └───────────────┬───────────────────┘         │
│                        │                             │
│                        ▼                             │
│         ┌──────────────────────────┐                │
│         │   D1 Database (SQL)      │                │
│         │   - Users & Auth         │                │
│         │   - Leads & Deals        │                │
│         │   - Social Network       │                │
│         │   - Events               │                │
│         │   - Workflows            │                │
│         │   - Admin/RBAC           │                │
│         └──────────────────────────┘                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔐 Security Setup

### Environment Variables (Required)
```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your values:
SESSION_SECRET=generate-strong-random-key
OPENAI_API_KEY=your-api-key
```

### For Production:
```bash
# 1. Use Cloudflare secrets for sensitive keys
# 2. Enable HTTPS (automatic with Cloudflare)
# 3. Configure rate limiting
# 4. Enable audit logging
# 5. Setup 2FA authentication
```

---

## 📈 Monitoring & Logs

### Local Development:
```bash
# Backend logs
cd backend && npm run dev

# Frontend logs
npm run dev
```

### Docker:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

### Cloudflare Workers:
```bash
# View logs
wrangler tail

# View specific worker
wrangler tail hd2d-backend
```

---

## 🚀 Production Checklist

- [ ] Database created and migrations run
- [ ] Environment variables configured
- [ ] SSL/HTTPS enabled
- [ ] Domain pointed to platform
- [ ] Admin account created
- [ ] Backup strategy in place
- [ ] Monitoring/alerting configured
- [ ] Rate limiting enabled
- [ ] 2FA authentication working
- [ ] Vendor marketplace setup (if needed)

---

## 🆘 Troubleshooting

### "Cannot connect to backend"
- Check backend is running: `curl http://localhost:8787`
- Verify EXPO_PUBLIC_API_URL environment variable
- Check firewall rules

### "Database error"
- Verify D1 migrations have run
- Check database permissions
- View logs: `wrangler tail`

### "Docker container exits immediately"
- View logs: `docker-compose logs backend`
- Check environment variables in docker-compose.yml
- Verify ports are not in use

---

## 📚 Next Steps

1. Choose your deployment option above
2. Run the appropriate deploy script
3. Login with test credentials
4. Configure your company/team
5. Add users and start using the platform

---

## Support

For detailed documentation, see:
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` - Cloudflare Workers setup
- `DEPLOYMENT_QUICK_START.md` - Quick reference
- `README.md` - Project overview

