import { getDb } from './db';
import { seoKeywords, contentTemplates, backlinks } from '../drizzle/schema';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Import SEO data from extracted JSON into database
 */
export async function importSeoData() {
  const db = await getDb();
  if (!db) {
    console.error('[SEO Import] Database not available');
    return { success: false, error: 'Database not available' };
  }

  try {
    // Load prepared SEO data
    const dataPath = path.join(process.cwd(), 'seo_import_data.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const seoData = JSON.parse(rawData);

    let keywordsImported = 0;
    let templatesImported = 0;
    let backlinksImported = 0;

    // Import keywords
    console.log('[SEO Import] Importing keywords...');
    for (const kw of seoData.keywords) {
      try {
        await db.insert(seoKeywords).values({
          keyword: kw.keyword,
          searchVolume: kw.searchVolume,
          keywordDifficulty: kw.keywordDifficulty,
          cpc: kw.cpc,
          category: kw.category,
          serpFeatures: kw.serpFeatures,
          isActive: true,
        }).onDuplicateKeyUpdate({
          set: {
            searchVolume: kw.searchVolume,
            keywordDifficulty: kw.keywordDifficulty,
            cpc: kw.cpc,
          },
        });
        keywordsImported++;
      } catch (err) {
        console.error(`[SEO Import] Failed to import keyword: ${kw.keyword}`, err);
      }
    }

    // Import content templates
    console.log('[SEO Import] Importing content templates...');
    for (const template of seoData.templates) {
      try {
        await db.insert(contentTemplates).values({
          name: template.name,
          type: template.type as any,
          template: template.template,
          keywords: template.keywords,
          hashtags: template.hashtags,
          platform: template.platform,
          campaignId: template.campaignId,
          isActive: true,
        });
        templatesImported++;
      } catch (err) {
        console.error(`[SEO Import] Failed to import template: ${template.name}`, err);
      }
    }

    // Import backlinks
    console.log('[SEO Import] Importing backlinks...');
    for (const backlink of seoData.backlinks) {
      try {
        await db.insert(backlinks).values({
          sourceUrl: backlink.sourceUrl,
          targetUrl: backlink.targetUrl || 'https://nimbusroofing.com',
          platform: backlink.platform,
          status: backlink.status as any || 'active',
        });
        backlinksImported++;
      } catch (err) {
        console.error(`[SEO Import] Failed to import backlink: ${backlink.sourceUrl}`, err);
      }
    }

    console.log(`[SEO Import] ✅ Import complete:`);
    console.log(`  - Keywords: ${keywordsImported}`);
    console.log(`  - Templates: ${templatesImported}`);
    console.log(`  - Backlinks: ${backlinksImported}`);

    return {
      success: true,
      imported: {
        keywords: keywordsImported,
        templates: templatesImported,
        backlinks: backlinksImported,
      },
    };
  } catch (error) {
    console.error('[SEO Import] Error:', error);
    return { success: false, error: String(error) };
  }
}

// Run import if executed directly
importSeoData().then((result) => {
  console.log('Import result:', result);
  process.exit(result.success ? 0 : 1);
});
