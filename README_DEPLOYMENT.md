# 🚀 HD2D Online Platform - Deployment Scripts

This folder contains everything needed to convert the HD2D mobile app into a fully-featured online platform deployed to your custom domain.

---

## 📁 Deployment Files

| File | Purpose | Use Case |
|------|---------|----------|
| `deploy.sh` | Master deployment script | Local dev or Cloudflare production |
| `docker-deploy.sh` | Docker containerized deployment | VMs, servers, self-hosted |
| `docker-compose.yml` | Docker services configuration | Docker deployment |
| `Dockerfile` | Container image definition | Docker build |
| `nginx.conf` | Reverse proxy configuration | Docker with HTTPS |
| `.env.example` | Environment variables template | Configuration setup |
| `PLATFORM_SETUP.md` | Complete setup guide | Reference documentation |

---

## ⚡ Quick Start (3 options)

### Option 1: Local Development (Fastest)
```bash
bash deploy.sh local
# Then run:
# Terminal 1: cd backend && npm run dev
# Terminal 2: npm run dev
# Visit: http://localhost:8081
```

### Option 2: Docker Container
```bash
bash docker-deploy.sh
# Services start at:
# - Frontend: http://localhost:8081
# - Backend: http://localhost:8787
```

### Option 3: Cloudflare Workers (Production)
```bash
bash deploy.sh production
# Follow the prompts to authenticate and deploy
# Your platform lives at: https://hardcoredoortodoorclosers.com
```

---

## 📋 What Each Script Does

### `deploy.sh` - Master Deployment Script

**For Local Development:**
```bash
bash deploy.sh local
```
- ✅ Validates Node.js installation
- ✅ Installs frontend + backend dependencies
- ✅ Configures local environment (`http://localhost:8787`)
- ✅ Ready to run `npm run dev` in two terminals
- **Time:** ~5 minutes

**For Production (Cloudflare Workers):**
```bash
bash deploy.sh production
```
- ✅ Authenticates with Cloudflare account
- ✅ Creates D1 Database in Cloudflare
- ✅ Creates KV Storage namespace
- ✅ Deploys backend to Cloudflare Workers
- ✅ Configures custom domain routing
- ✅ Runs all 14 database migrations
- **Time:** ~10 minutes
- **Requirements:** Cloudflare account + domain

### `docker-deploy.sh` - Docker Deployment Script

```bash
bash docker-deploy.sh
```
- ✅ Checks Docker and Docker Compose installation
- ✅ Builds containerized frontend and backend
- ✅ Starts all services with auto-restart
- ✅ Configures networking and health checks
- ✅ Sets up environment variables
- **Time:** ~3 minutes (after Docker installation)
- **Requirements:** Docker + Docker Compose installed

---

## 🛠️ Configuration Files

### `.env.example` - Environment Variables Template
Copy and customize:
```bash
cp .env.example .env
```

Key variables:
- `EXPO_PUBLIC_API_URL` - Backend URL (set by deploy scripts)
- `SESSION_SECRET` - JWT signing key
- `OPENAI_API_KEY` - AI features (optional)
- `CLOUDFLARE_ACCOUNT_ID` - For Cloudflare deployment

### `docker-compose.yml` - Docker Services
Defines 3 services:
1. **backend** - Node.js API on port 8787
2. **frontend** - Expo web on port 8081
3. **nginx** - Reverse proxy (production only)

Services automatically:
- Start together with one command
- Share a network for inter-service communication
- Mount volumes for hot-reload during development
- Include health checks

### `Dockerfile` - Container Image
Builds a single image with:
- Node.js 18 Alpine (minimal size)
- Both frontend and backend code
- All dependencies pre-installed
- Health check configured

### `nginx.conf` - Reverse Proxy
Routes traffic:
- `/api/*` → Backend (8787)
- `/webhook/*` → Backend (8787)
- `/*` → Frontend (8081)

Includes:
- HTTPS/SSL support
- WebSocket support for real-time features
- Security headers
- Request forwarding

---

## 🌍 Platform Architecture

The three deployment options create this structure:

```
┌─────────────────────────────────┐
│   Your Custom Domain            │
│   hardcoredoortodoorclosers.com │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────────┐  ┌──────────────┐
│   Option 1   │  │   Option 2   │  │   Option 3   │
│    Local     │  │    Docker    │  │  Cloudflare  │
├──────────────┤  ├──────────────┤  ├──────────────┤
│Frontend:8081 │  │Frontend:8081 │  │   Frontend   │
│Backend:8787  │  │Backend:8787  │  │   Cloudflare │
│LocalDB(SQLite)  │  Docker DB   │  │  D1 Database │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🔄 Workflow Examples

### Local Development Workflow
```bash
# 1. Initial setup
bash deploy.sh local

# 2. Terminal 1: Start backend
cd backend && npm run dev

# 3. Terminal 2: Start frontend
npm run dev

# 4. Access at http://localhost:8081
# 5. Hot reload enabled - changes auto-update

# 6. Test login
# Username: test@example.com
# Password: password123
# 2FA code: any 6 digits (e.g., 123456)
```

### Docker Development Workflow
```bash
# 1. Deploy
bash docker-deploy.sh

# 2. View logs in real-time
docker-compose logs -f

# 3. Access at http://localhost:8081

# 4. Make code changes - containers auto-reload

# 5. Stop and clean up
docker-compose down
```

### Production Cloudflare Workflow
```bash
# 1. Deploy to Cloudflare
bash deploy.sh production

# 2. Platform is live at:
https://hardcoredoortodoorclosers.com

# 3. Monitor logs
wrangler tail

# 4. Database management
wrangler d1 shell hd2d
```

---

## 🧹 Cleanup Commands

### Local Development
```bash
# Just stop npm processes with Ctrl+C
```

### Docker
```bash
# Stop services
docker-compose down

# Remove volumes (data)
docker-compose down -v

# Remove all images
docker system prune -a
```

### Cloudflare Workers
```bash
# View deployed worker
wrangler list

# Delete worker
wrangler delete

# Rollback to previous version
wrangler versions
```

---

## 📊 Performance Notes

| Deployment | Startup Time | Performance | Cost | Maintenance |
|------------|-------------|------------|------|------------|
| Local Dev | 1 min | Fast (local) | $0 | Minimal |
| Docker | 2 min | Very Good | $5-20/month | Low |
| Cloudflare | 2 min | Excellent (global CDN) | Free-$200/month | Minimal |

---

## ✅ Deployment Checklist

- [ ] Choose deployment option (local/docker/cloudflare)
- [ ] Run appropriate deploy script
- [ ] Verify backend is responding
- [ ] Verify frontend loads
- [ ] Test login functionality
- [ ] Check 2FA authentication
- [ ] Verify API calls are working
- [ ] Monitor logs for errors
- [ ] Configure environment variables
- [ ] Set up monitoring/alerts

---

## 🆘 Troubleshooting

**"Connection refused" error**
- Is backend running? Check with: `curl http://localhost:8787`
- Is EXPO_PUBLIC_API_URL set correctly?
- Is firewall blocking ports?

**"Docker image not found"**
- Rebuild: `docker-compose build --no-cache`
- Clear images: `docker system prune -a`

**"Cloudflare authentication failed"**
- Run: `wrangler logout && wrangler login`
- Check your Cloudflare account has Workers enabled

**"Database migration errors"**
- Verify D1 database exists
- Check database permissions
- View error logs: `wrangler tail`

---

## 📚 Full Documentation

For more details, see:
- `PLATFORM_SETUP.md` - Complete setup guide with all options
- `CLOUDFLARE_DEPLOYMENT_GUIDE.md` - Cloudflare Workers deep dive
- `DEPLOYMENT_QUICK_START.md` - Quick reference checklist

---

## 🎯 Next Steps

1. **Choose your deployment:**
   - Local? Run: `bash deploy.sh local`
   - Docker? Run: `bash docker-deploy.sh`
   - Cloudflare? Run: `bash deploy.sh production`

2. **Verify it works:**
   - Open the app and test login
   - Try creating a lead
   - Check the social feed

3. **Go live:**
   - Point your domain to the platform
   - Configure SSL certificates
   - Set up monitoring

---

**Ready?** Pick a deployment option above and run the script!
