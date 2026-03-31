# Email Authentication Setup for Nimbus Roofing

This document provides step-by-step instructions for setting up email authentication with Twilio SendGrid to fix Gmail compliance issues for **nimbusroofing.com**.

## Overview

Gmail requires proper email authentication to ensure deliverability and prevent spam. The three key authentication methods are **SPF**, **DKIM**, and **DMARC**. This setup will fix the "Needs work" status in your Gmail Compliance Dashboard.

## Current Status

| Requirement | Status | Action Required |
|------------|--------|-----------------|
| SPF and DKIM authentication | ❌ Needs work | Add DNS records below |
| From: header alignment | ❌ Needs work | Configure SendGrid sender |
| DMARC authentication | ✅ Compliant | No action needed |
| Encryption | ✅ Compliant | No action needed |
| User-reported spam rate | ✅ Compliant | No action needed |
| DNS records | ✅ Compliant | No action needed |
| One-click unsubscribe | ✅ Compliant | No action needed |
| Honor unsubscribe | ✅ Compliant | No action needed |

## Step 1: Get Your SendGrid API Key

1. Log in to [SendGrid](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it "Nimbus Roofing Production"
5. Select **Full Access** permissions
6. Click **Create & View**
7. **Copy the API key** (you won't be able to see it again!)

## Step 2: Add SendGrid API Key to Your App

Add the following environment variable to your Manus project:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**How to add in Manus:**
1. Go to your project's Management UI
2. Click **Settings** → **Secrets**
3. Add new secret: `SENDGRID_API_KEY`
4. Paste your API key
5. Save

## Step 3: Verify Your Sender Domain in SendGrid

1. In SendGrid, go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Select **DNS Host**: Choose your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
4. Enter domain: `nimbusroofing.com`
5. Click **Next**

SendGrid will generate custom DNS records for your domain. You'll see something like this:

### SPF Record (Type: TXT)

| Host/Name | Type | Value | TTL |
|-----------|------|-------|-----|
| `nimbusroofing.com` | TXT | `v=spf1 include:sendgrid.net ~all` | 3600 |

### DKIM Records (Type: CNAME)

| Host/Name | Type | Value | TTL |
|-----------|------|-------|-----|
| `s1._domainkey.nimbusroofing.com` | CNAME | `s1.domainkey.u12345678.wl123.sendgrid.net` | 3600 |
| `s2._domainkey.nimbusroofing.com` | CNAME | `s2.domainkey.u12345678.wl123.sendgrid.net` | 3600 |

### DMARC Record (Type: TXT)

| Host/Name | Type | Value | TTL |
|-----------|------|-------|-----|
| `_dmarc.nimbusroofing.com` | TXT | `v=DMARC1; p=none; rua=mailto:dmarc@nimbusroofing.com` | 3600 |

**Note:** The exact values for DKIM records will be unique to your SendGrid account. Use the values provided by SendGrid, not the examples above.

## Step 4: Add DNS Records to Your Domain

### If using GoDaddy:

1. Log in to [GoDaddy](https://dcc.godaddy.com/)
2. Go to **My Products** → **DNS**
3. Find **nimbusroofing.com** and click **DNS**
4. Click **Add** for each record:
   - **SPF**: Type = TXT, Name = @, Value = (from SendGrid), TTL = 1 Hour
   - **DKIM 1**: Type = CNAME, Name = s1._domainkey, Value = (from SendGrid), TTL = 1 Hour
   - **DKIM 2**: Type = CNAME, Name = s2._domainkey, Value = (from SendGrid), TTL = 1 Hour
   - **DMARC**: Type = TXT, Name = _dmarc, Value = (from SendGrid), TTL = 1 Hour

### If using Namecheap:

1. Log in to [Namecheap](https://www.namecheap.com/)
2. Go to **Domain List** → **Manage** → **Advanced DNS**
3. Click **Add New Record** for each:
   - **SPF**: Type = TXT Record, Host = @, Value = (from SendGrid), TTL = Automatic
   - **DKIM 1**: Type = CNAME Record, Host = s1._domainkey, Value = (from SendGrid), TTL = Automatic
   - **DKIM 2**: Type = CNAME Record, Host = s2._domainkey, Value = (from SendGrid), TTL = Automatic
   - **DMARC**: Type = TXT Record, Host = _dmarc, Value = (from SendGrid), TTL = Automatic

### If using Cloudflare:

1. Log in to [Cloudflare](https://dash.cloudflare.com/)
2. Select **nimbusroofing.com**
3. Go to **DNS** → **Records**
4. Click **Add record** for each:
   - **SPF**: Type = TXT, Name = @, Content = (from SendGrid), TTL = Auto
   - **DKIM 1**: Type = CNAME, Name = s1._domainkey, Target = (from SendGrid), TTL = Auto, Proxy status = DNS only
   - **DKIM 2**: Type = CNAME, Name = s2._domainkey, Target = (from SendGrid), TTL = Auto, Proxy status = DNS only
   - **DMARC**: Type = TXT, Name = _dmarc, Content = (from SendGrid), TTL = Auto

**Important:** For CNAME records in Cloudflare, make sure to set **Proxy status** to **DNS only** (gray cloud), not **Proxied** (orange cloud).

## Step 5: Verify DNS Records in SendGrid

1. Wait 24-48 hours for DNS propagation (usually faster, often 1-2 hours)
2. In SendGrid, go back to **Settings** → **Sender Authentication**
3. Click **Verify** next to your domain
4. If successful, you'll see green checkmarks ✅

**Check DNS propagation manually:**
```bash
# Check SPF
dig TXT nimbusroofing.com

# Check DKIM
dig CNAME s1._domainkey.nimbusroofing.com
dig CNAME s2._domainkey.nimbusroofing.com

# Check DMARC
dig TXT _dmarc.nimbusroofing.com
```

## Step 6: Configure From: Header Alignment

In your SendGrid account:

1. Go to **Settings** → **Sender Authentication**
2. Click **Single Sender Verification** (if you haven't done domain authentication yet)
3. Add sender: `notifications@nimbusroofing.com`
4. Fill in:
   - **From Name**: Nimbus Roofing
   - **From Email Address**: notifications@nimbusroofing.com
   - **Reply To**: info@nimbusroofing.com
   - **Company Address**: Your McKinney, TX address
5. Click **Create**
6. Check your email and verify the sender

**Important:** The From: email address **must** use your authenticated domain (nimbusroofing.com) to pass DMARC alignment.

## Step 7: Test Email Sending

Once DNS records are verified, test your email setup:

1. Navigate to your callback management dashboard
2. Create a test callback request
3. Check if you receive the confirmation email
4. Verify the email arrives in your inbox (not spam)
5. Check email headers to confirm SPF and DKIM pass

**Check email authentication:**
- Open the email in Gmail
- Click the three dots (⋮) → **Show original**
- Look for:
  - `spf=pass`
  - `dkim=pass`
  - `dmarc=pass`

## Step 8: Monitor Gmail Compliance

After setup, check your Gmail Compliance Dashboard:

1. Go to [Google Postmaster Tools](https://postmaster.google.com/)
2. Add your domain: nimbusroofing.com
3. Verify ownership via DNS TXT record
4. Monitor:
   - **Spam rate**: Should stay below 0.3%
   - **IP reputation**: Should be "High"
   - **Domain reputation**: Should be "High"
   - **Authentication**: Should show "Pass"

## Troubleshooting

### SPF/DKIM not passing after 48 hours

1. Verify DNS records are correct (no typos)
2. Check DNS propagation: [whatsmydns.net](https://www.whatsmydns.net/)
3. Ensure no conflicting SPF records exist
4. Contact your domain registrar support

### Emails going to spam

1. Verify SPF, DKIM, and DMARC all pass
2. Check your sender reputation
3. Avoid spam trigger words in subject lines
4. Include unsubscribe link in all emails
5. Warm up your sending domain (start with low volume)

### "From: header alignment" still shows "Needs work"

1. Ensure From: email uses authenticated domain (notifications@nimbusroofing.com)
2. Verify DKIM and SPF both pass
3. Check DMARC policy is set correctly
4. Wait 24-48 hours for Gmail to re-check

## Email Templates Included

Your app now includes two professional email templates:

### 1. Callback Confirmation Email
- Sent to customers when they request a callback
- Includes request details and next steps
- Emergency contact information
- One-click unsubscribe link

### 2. Lead Notification Email
- Sent to you when a new lead is created
- Urgency indicators (🚨 emergency, ⚠️ high, 📋 normal)
- One-click call button
- Lead source tracking

## Environment Variables

Add these to your Manus project secrets:

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | Your SendGrid API key | `SG.xxxxxxxx...` |
| `OWNER_EMAIL` | Email to receive lead notifications | `info@nimbusroofing.com` |

## SendGrid Free Tier Limits

- **100 emails per day** (3,000 per month)
- Unlimited contacts
- Email validation
- Dedicated IP (paid plans only)

If you exceed 100 emails/day, consider upgrading to:
- **Essentials Plan**: $19.95/month for 50,000 emails
- **Pro Plan**: $89.95/month for 100,000 emails

## Next Steps

1. ✅ Add `SENDGRID_API_KEY` to Manus secrets
2. ✅ Add DNS records to your domain registrar
3. ✅ Verify domain in SendGrid (wait 24-48 hours)
4. ✅ Configure sender email (notifications@nimbusroofing.com)
5. ✅ Test email sending
6. ✅ Monitor Gmail compliance dashboard

## Support

- **SendGrid Support**: https://support.sendgrid.com/
- **Gmail Postmaster Tools**: https://postmaster.google.com/
- **DNS Propagation Checker**: https://www.whatsmydns.net/

---

**Document created:** January 13, 2026  
**Last updated:** January 13, 2026  
**Author:** Manus AI
