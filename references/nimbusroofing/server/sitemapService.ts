/**
 * Sitemap Generation Service
 * Automatically generates and updates sitemap.xml when new blog posts are published
 */

import * as db from './db';

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Generate complete sitemap.xml content
 */
export async function generateSitemap(baseUrl: string = 'https://www.nimbusroofing.com'): Promise<string> {
  const urls: SitemapUrl[] = [];
  
  // Static pages (high priority)
  const staticPages = [
    { path: '/', priority: 1.0, changefreq: 'daily' as const },
    { path: '/services/residential', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/services/commercial', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/services/storm-damage', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/services/insurance-claims', priority: 0.9, changefreq: 'weekly' as const },
    { path: '/contact', priority: 0.8, changefreq: 'monthly' as const },
    { path: '/projects', priority: 0.7, changefreq: 'weekly' as const },
    { path: '/certifications', priority: 0.7, changefreq: 'monthly' as const },
    { path: '/blog', priority: 0.8, changefreq: 'daily' as const },
  ];
  
  staticPages.forEach(page => {
    urls.push({
      loc: `${baseUrl}${page.path}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });
  
  // Neighborhood pages
  const neighborhoods = [
    '/neighborhoods/stonebridge-ranch',
    '/neighborhoods/craig-ranch',
    '/neighborhoods/eldorado-heights',
    '/neighborhoods/trinity-falls',
    '/neighborhoods/tucker-hill',
  ];
  
  neighborhoods.forEach(path => {
    urls.push({
      loc: `${baseUrl}${path}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'monthly',
      priority: 0.6,
    });
  });
  
  // Blog posts (dynamic, high SEO value)
  try {
    const blogPosts = await db.getPublishedBlogPosts(1000, 0); // Get all published posts
    
    blogPosts.forEach(post => {
      urls.push({
        loc: `${baseUrl}/blog/${post.slug}`,
        lastmod: post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.7,
      });
    });
    
    console.log(`[Sitemap] Added ${blogPosts.length} blog posts to sitemap`);
  } catch (error) {
    console.error('[Sitemap] Error fetching blog posts:', error);
  }
  
  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return xml;
}

/**
 * Ping Google to recrawl the sitemap
 */
export async function pingGoogle(sitemapUrl: string = 'https://www.nimbusroofing.com/sitemap.xml'): Promise<boolean> {
  try {
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    const response = await fetch(pingUrl);
    
    if (response.ok) {
      console.log('[Sitemap] Successfully pinged Google Search Console');
      return true;
    } else {
      console.warn('[Sitemap] Google ping returned non-OK status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[Sitemap] Error pinging Google:', error);
    return false;
  }
}

/**
 * Generate and save sitemap, then ping Google
 */
export async function updateSitemap(baseUrl?: string): Promise<{ success: boolean; urlCount: number }> {
  try {
    const xml = await generateSitemap(baseUrl);
    const urlCount = (xml.match(/<url>/g) || []).length;
    
    console.log(`[Sitemap] Generated sitemap with ${urlCount} URLs`);
    
    // Save to public directory
    const fs = await import('fs');
    const path = await import('path');
    const publicDir = path.join(process.cwd(), 'client', 'public');
    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log(`[Sitemap] Saved sitemap to ${sitemapPath}`);
    
    // Ping Google (don't wait for response)
    if (baseUrl) {
      pingGoogle(`${baseUrl}/sitemap.xml`).catch(err => {
        console.warn('[Sitemap] Google ping failed (non-critical):', err.message);
      });
    }
    
    return { success: true, urlCount };
  } catch (error: any) {
    console.error('[Sitemap] Error updating sitemap:', error);
    return { success: false, urlCount: 0 };
  }
}
