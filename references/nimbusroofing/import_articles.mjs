import fs from 'fs';
import { drizzle } from 'drizzle-orm/mysql2';

const db = drizzle(process.env.DATABASE_URL);

// Read all generated articles
const articlesDir = '/home/ubuntu/nimbus-roofing/generated_articles';
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));

console.log(`📚 Importing ${files.length} articles to database...\n`);

let successCount = 0;
let errorCount = 0;

for (const file of files) {
  try {
    const filepath = `${articlesDir}/${file}`;
    const content = fs.readFileSync(filepath, 'utf8');
    
    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
      console.error(`❌ No frontmatter found in ${file}`);
      errorCount++;
      continue;
    }
    
    const frontmatter = frontmatterMatch[1];
    const articleContent = frontmatterMatch[2];
    
    // Extract metadata
    const titleMatch = frontmatter.match(/title: (.+)/);
    const keywordMatch = frontmatter.match(/primary_keyword: (.+)/);
    const wordCountMatch = frontmatter.match(/word_count: (\d+)/);
    
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    const keyword = keywordMatch ? keywordMatch[1] : '';
    const wordCount = wordCountMatch ? parseInt(wordCountMatch[1]) : 0;
    
    // Create slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Generate meta description (first 160 chars of content)
    const firstParagraph = articleContent.split('\n\n')[1] || articleContent.substring(0, 300);
    const metaDescription = firstParagraph
      .replace(/[#*]/g, '')
      .substring(0, 160)
      .trim() + '...';
    
    // Insert into database
    await db.execute(`
      INSERT INTO blog_posts (title, slug, content, excerpt, meta_description, primary_keyword, status, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'published', NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        content = VALUES(content),
        excerpt = VALUES(excerpt),
        meta_description = VALUES(meta_description),
        primary_keyword = VALUES(primary_keyword),
        updated_at = NOW()
    `, [title, slug, articleContent, metaDescription, metaDescription, keyword]);
    
    console.log(`✅ ${successCount + 1}. ${title}`);
    successCount++;
  } catch (error) {
    console.error(`❌ Error importing ${file}:`, error.message);
    errorCount++;
  }
}

console.log(`\n📊 Import Summary:`);
console.log(`   ✅ Success: ${successCount} articles`);
console.log(`   ❌ Errors: ${errorCount} articles`);
console.log(`\n🎉 All articles are now live at /blog!`);
