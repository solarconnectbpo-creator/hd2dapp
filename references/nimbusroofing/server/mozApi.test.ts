/**
 * Vitest test to validate Moz API token
 */

import { describe, it, expect } from 'vitest';
import { fetchDomainAuthority } from './mozApi';

describe('Moz API Integration', () => {
  it('should successfully fetch Domain Authority for a known domain', async () => {
    // Test with a well-known domain (moz.com itself)
    const result = await fetchDomainAuthority('moz.com');

    // If MOZ_API_TOKEN is not configured, result will be null
    if (!process.env.MOZ_API_TOKEN) {
      expect(result).toBeNull();
      console.warn('[Test] MOZ_API_TOKEN not configured, skipping API test');
      return;
    }

    // If token is configured, we should get valid metrics
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('domainAuthority');
    expect(result).toHaveProperty('pageAuthority');
    expect(result).toHaveProperty('spamScore');
    
    // DA should be a number between 0 and 100
    expect(result!.domainAuthority).toBeGreaterThanOrEqual(0);
    expect(result!.domainAuthority).toBeLessThanOrEqual(100);
    
    // moz.com should have a high DA (typically 90+)
    expect(result!.domainAuthority).toBeGreaterThan(50);

    console.log('[Test] Successfully fetched DA for moz.com:', result);
  }, 30000); // 30 second timeout for API call

  it('should handle invalid domains gracefully', async () => {
    const result = await fetchDomainAuthority('this-domain-definitely-does-not-exist-12345.com');
    
    // Should return null or metrics with low DA for non-existent domains
    if (result) {
      expect(result.domainAuthority).toBeLessThanOrEqual(10);
    }
    
    console.log('[Test] Invalid domain result:', result);
  }, 30000);
});
