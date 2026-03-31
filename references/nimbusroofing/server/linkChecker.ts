/**
 * Link Checker Service
 * 
 * Automatically checks backlinks for 404 errors and broken links.
 * Updates backlink status in database and sends email alerts.
 */

interface LinkCheckResult {
  url: string;
  status: 'active' | 'broken' | 'redirect' | 'timeout';
  statusCode?: number;
  redirectUrl?: string;
  responseTime?: number;
  error?: string;
}

/**
 * Check if a single URL is accessible
 */
export async function checkLink(url: string, timeout: number = 10000): Promise<LinkCheckResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Use HEAD to avoid downloading full content
      signal: controller.signal,
      redirect: 'manual', // Don't follow redirects automatically
      headers: {
        'User-Agent': 'Nimbus-LinkChecker/1.0 (Backlink Monitoring Service)',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Handle redirects (3xx status codes)
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('location');
      return {
        url,
        status: 'redirect',
        statusCode: response.status,
        redirectUrl: redirectUrl || undefined,
        responseTime,
      };
    }
    
    // Handle successful responses (2xx status codes)
    if (response.status >= 200 && response.status < 300) {
      return {
        url,
        status: 'active',
        statusCode: response.status,
        responseTime,
      };
    }
    
    // Handle client/server errors (4xx, 5xx status codes)
    return {
      url,
      status: 'broken',
      statusCode: response.status,
      responseTime,
      error: `HTTP ${response.status} ${response.statusText}`,
    };
    
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      return {
        url,
        status: 'timeout',
        error: `Request timed out after ${timeout}ms`,
      };
    }
    
    // Handle network errors
    return {
      url,
      status: 'broken',
      error: error.message || 'Network error',
    };
  }
}

/**
 * Check multiple links in batch with rate limiting
 */
export async function checkLinks(
  urls: string[],
  options: {
    timeout?: number;
    delayBetweenRequests?: number;
    maxConcurrent?: number;
  } = {}
): Promise<LinkCheckResult[]> {
  const {
    timeout = 10000,
    delayBetweenRequests = 1000,
    maxConcurrent = 5,
  } = options;
  
  const results: LinkCheckResult[] = [];
  
  // Process URLs in batches to avoid overwhelming servers
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(url => checkLink(url, timeout))
    );
    results.push(...batchResults);
    
    // Add delay between batches (except for the last batch)
    if (i + maxConcurrent < urls.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    }
  }
  
  return results;
}

/**
 * Get summary statistics from link check results
 */
export function getLinkCheckSummary(results: LinkCheckResult[]) {
  const summary = {
    total: results.length,
    active: 0,
    broken: 0,
    redirect: 0,
    timeout: 0,
    avgResponseTime: 0,
  };
  
  let totalResponseTime = 0;
  let responseTimeCount = 0;
  
  for (const result of results) {
    summary[result.status]++;
    
    if (result.responseTime) {
      totalResponseTime += result.responseTime;
      responseTimeCount++;
    }
  }
  
  summary.avgResponseTime = responseTimeCount > 0
    ? Math.round(totalResponseTime / responseTimeCount)
    : 0;
  
  return summary;
}
