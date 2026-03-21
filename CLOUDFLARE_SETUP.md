# Cloudflare Workers Setup for HD2D Inbound Agents

## Quick Start

### 1. Deploy Cloudflare Worker

**Option A: Using Wrangler CLI**

```bash
# Install wrangler
npm install -g wrangler

# Create worker project
wrangler init hd2d-inbound-webhook

# Copy the cloudflareWorker.template.js content to src/index.ts

# Deploy to your domain
wrangler deploy

# Note the URL provided after deployment
```

**Option B: Cloudflare Dashboard**

1. Go to https://dash.cloudflare.com/2b2f31d4f2fd46db5be5d72e772ecac5/hardcoredoortodoorclosers.com
2. Navigate to Workers → Routes
3. Create new Worker
4. Paste code from `services/cloudflareWorker.template.js`
5. Deploy
6. Copy the worker route URL

### 2. Configure in HD2D App

1. Open the app and go to **Inbound** tab
2. Tap **Webhook Configuration** card
3. Paste your Cloudflare Worker URL:
   - Example: `https://hd2d-inbound.hardcoredoortodoorclosers.workers.dev`
   - Or custom domain: `https://hardcoredoortodoorclosers.com/api/webhooks/inbound`
4. Tap **Test Webhook** button to verify connection

### 3. Worker Environment Variables

In your `wrangler.toml`, add:

```toml
[env.production]
vars = { ANALYTICS = "analytics", HD2D_CALLS = "calls_kv" }

[[env.production.kv_namespaces]]
binding = "HD2D_CALLS"
id = "your-kv-namespace-id"

[[env.production.analytics_datasets]]
dataset = "hd2d_calls"
```

### 4. Call Processing Flow

**Incoming Call** → App sends webhook → Worker receives → Worker stores in KV → Analytics updated

**Connected Call** → Agent handles → App sends update → Worker logs → Status updated

**Ended Call** → Call ends → App sends final → Worker saves transcript → Metrics computed

### 5. Test the Integration

1. Toggle AI Agent to **Online** in the app
2. Go to Webhook Configuration section
3. Click **Test Webhook** button
4. Check Cloudflare dashboard for worker invocations
5. Verify KV storage has the test record

### 6. Production Checklist

- [ ] Add HMAC signature verification to Worker
- [ ] Enable KV Storage for call history
- [ ] Set up Analytics Engine dashboard
- [ ] Configure rate limiting in Cloudflare
- [ ] Add authentication to webhook endpoint
- [ ] Test with real Twilio calls
- [ ] Set up error logging/monitoring

### Webhook Payload Format

```json
{
  "agentId": "agent-1",
  "fromNumber": "+1 (555) 123-4567",
  "toNumber": "+1 (555) 987-6543",
  "timestamp": "2024-12-01T21:00:00.000Z",
  "callId": "call-12345",
  "type": "incoming|connected|ended",
  "duration": 300,
  "transcript": "Call transcript text..."
}
```

### Troubleshooting

**Webhook not sending:**
- Check URL format (must start with https://)
- Verify Cloudflare Worker is deployed
- Check CORS settings in Worker

**Worker errors:**
- Review Worker logs in Cloudflare dashboard
- Check for timeout (30s limit)
- Verify KV namespace binding

**Performance:**
- Use Cloudflare Cache for frequently accessed data
- Batch webhook calls in production
- Monitor Worker CPU time
