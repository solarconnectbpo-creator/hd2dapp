# Moz API Integration Notes

## Overview
Moz API provides Domain Authority (DA) and other SEO metrics through their JSON-RPC API.

## Authentication
- **Method**: Token-based authentication
- **Header**: `x-moz-token: <YOUR_MOZ_TOKEN>`
- **API Base URL**: `https://api.moz.com/jsonrpc`

## Getting API Token
1. Access Moz API dashboard: https://moz.com/api/dashboard
2. Click "+ Add Token" to generate new token
3. Enter description and click "Create"
4. Token appears in "API Tokens" section

## Fetch Site Metrics Endpoint

**JSON-RPC Method**: `data.site.metrics.fetch`

**Request Format**:
```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "data.site.metrics.fetch",
  "params": {
    "data": {
      "site_query": {
        "query": "https://example.com",
        "scope": "domain"
      }
    }
  }
}
```

**Response Includes**:
- `domain_authority`: DA score (0-100)
- `page_authority`: PA score (0-100)
- `spam_score`: Spam score (0-100)
- `root_domains_to_root_domain`: Number of linking root domains
- `pages_to_root_domain`: Number of linking pages
- Link counts (internal, external, nofollow, redirect, deleted)

**Quota Usage**: 1 row per API call

## Implementation Plan

1. **Request Moz API Token from User**
   - Use `webdev_request_secrets` to ask for MOZ_API_TOKEN
   - Store in environment variables

2. **Create DA Fetching Service** (`server/mozApi.ts`)
   - Function to fetch DA for single domain
   - Function to batch fetch DA for multiple domains
   - Error handling for rate limits and API errors

3. **Add Backend Endpoint**
   - `seo.fetchDomainAuthority` - Fetch DA for single backlink
   - `seo.refreshAllDomainAuthority` - Batch refresh all backlinks

4. **Update Dashboard**
   - Add "Refresh DA Scores" button
   - Show loading state during fetch
   - Display updated DA scores in real-time

## Pricing Considerations
- Moz API is paid service (no free tier for bulk requests)
- Pricing based on rows consumed
- 1 domain = 1 row
- Need to manage quota carefully

## Alternative: Manual DA Entry
If user doesn't want to pay for Moz API:
- Add manual DA entry form in dashboard
- Allow bulk CSV import of DA scores
- Use free DA checker tools and import results
