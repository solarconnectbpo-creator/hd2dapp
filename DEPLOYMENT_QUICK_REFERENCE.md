# 🚀 HD2D Platform - Deployment Quick Reference

## Choose Your Deployment (Pick One)

### 👨‍💻 Local Development
```bash
bash deploy.sh local
```
**Then run in 2 terminals:**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
npm run dev
```
**Access:** http://localhost:8081

---

### 🐳 Docker (Recommended for Servers)
```bash
bash docker-deploy.sh
```
**Access:** http://localhost:8081 & http://localhost:8787

---

### ☁️ Cloudflare Workers (Production)
```bash
bash deploy.sh production
```
**Access:** https://hardcoredoortodoorclosers.com

---

## Test Login Credentials

```
Email: test@example.com
Password: password123
2FA Code: any 6 digits (e.g., 123456)
```

---

## Useful Commands

### Docker
```bash
docker-compose logs -f              # View logs
docker-compose restart              # Restart
docker-compose down                 # Stop
docker-compose exec backend sh      # Shell access
```

### Cloudflare Workers
```bash
wrangler deploy                      # Deploy
wrangler tail                        # View logs
wrangler d1 shell hd2d              # Database shell
```

### Local Development
```bash
npm run dev                          # Frontend on 8081
cd backend && npm run dev            # Backend on 8787
```

---

## Configuration

### Environment Variables
```bash
cp .env.example .env
# Edit .env with your settings
```

### Database Migrations
```bash
# Cloudflare only:
wrangler d1 execute hd2d --file=D1_migrations/001_initial_schema.sql
```

---

## Features Included

✅ 50+ API endpoints  
✅ User authentication with 2FA  
✅ Lead management with AI analysis  
✅ Deal pipeline with forecasting  
✅ Social network for team collaboration  
✅ Event management system  
✅ Workflow automation  
✅ Vendor marketplace  
✅ RBAC and audit logging  
✅ Multi-tenant support  

---

## File Guide

| File | What It Does |
|------|-------------|
| `deploy.sh` | Main deployment script (local or Cloudflare) |
| `docker-deploy.sh` | Docker deployment script |
| `docker-compose.yml` | Docker services config |
| `.env.example` | Environment variables template |
| `PLATFORM_SETUP.md` | Complete setup guide |
| `README_DEPLOYMENT.md` | Detailed deployment docs |

---

## Troubleshooting

**Backend not responding?**
```bash
curl http://localhost:8787
# Should return success
```

**Docker issues?**
```bash
docker-compose logs backend
# Check error messages
```

**Cloudflare deployment failed?**
```bash
wrangler tail
# Check deployment logs
```

---

## Next Steps After Deployment

1. ✅ Deployment complete
2. 🌐 Configure DNS for custom domain
3. 🔒 Set up SSL certificate
4. 👥 Create admin user
5. 📊 Configure dashboard
6. 🚀 Go live!

---

**Need more details?** See `PLATFORM_SETUP.md` or `README_DEPLOYMENT.md`

