/**
 * Moz API Service
 * 
 * Provides Domain Authority (DA) and other SEO metrics using Moz API.
 * Requires MOZ_API_TOKEN environment variable.
 * 
 * API Documentation: https://moz.com/api/docs
 */

interface MozSiteMetricsResponse {
  site_query: {
    query: string;
    scope: string;
  };
  site_metrics: {
    page: string;
    subdomain: string;
    root_domain: string;
    domain_authority: number;
    page_authority: number;
    spam_score: number;
    root_domains_to_root_domain: number;
    pages_to_root_domain: number;
  };
}

interface MozApiError {
  name: string;
  message: string;
}

/**
 * Fetch Domain Authority and other metrics for a single domain
 * @param domain - Domain name (e.g., "example.com" or "https://example.com")
 * @returns Domain Authority score and other metrics
 */
export async function fetchDomainAuthority(domain: string): Promise<{
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  linkingRootDomains: number;
  linkingPages: number;
} | null> {
  const mozToken = process.env.MOZ_API_TOKEN;

  if (!mozToken) {
    console.warn('[Moz API] MOZ_API_TOKEN not configured');
    return null;
  }

  try {
    // Clean up domain (remove protocol, www, trailing slash)
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '');

    // Make JSON-RPC request to Moz API
    const response = await fetch('https://api.moz.com/jsonrpc', {
      method: 'POST',
      headers: {
        'x-moz-token': mozToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `da-fetch-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        method: 'data.site.metrics.fetch',
        params: {
          data: {
            site_query: {
              query: cleanDomain,
              scope: 'domain',
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Moz API] HTTP error: ${response.status}`);
      console.error(`[Moz API] Response: ${errorText}`);
      return null;
    }

    const data = await response.json();

    // Check for JSON-RPC error
    if (data.error) {
      const error = data.error as MozApiError;
      console.error(`[Moz API] Error: ${error.name} - ${error.message}`);
      console.error(`[Moz API] Full error:`, JSON.stringify(data.error, null, 2));
      return null;
    }

    const result = data.result as MozSiteMetricsResponse;

    return {
      domainAuthority: result.site_metrics.domain_authority || 0,
      pageAuthority: result.site_metrics.page_authority || 0,
      spamScore: result.site_metrics.spam_score || 0,
      linkingRootDomains: result.site_metrics.root_domains_to_root_domain || 0,
      linkingPages: result.site_metrics.pages_to_root_domain || 0,
    };
  } catch (error) {
    console.error('[Moz API] Fetch error:', error);
    return null;
  }
}

/**
 * Batch fetch Domain Authority for multiple domains
 * @param domains - Array of domain names
 * @param delayMs - Delay between requests to avoid rate limiting (default: 1000ms)
 * @returns Map of domain to DA metrics
 */
export async function batchFetchDomainAuthority(
  domains: string[],
  delayMs: number = 1000
): Promise<Map<string, {
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  linkingRootDomains: number;
  linkingPages: number;
}>> {
  const results = new Map();

  for (const domain of domains) {
    const metrics = await fetchDomainAuthority(domain);
    if (metrics) {
      results.set(domain, metrics);
    }

    // Add delay to avoid rate limiting
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Extract domain from URL
 * @param url - Full URL or domain
 * @returns Clean domain name
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch {
    // If URL parsing fails, try to clean up manually
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');
  }
}
