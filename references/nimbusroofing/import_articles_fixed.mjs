import fs from 'fs';
import { drizzle } from 'drizzle-orm/mysql2';
import { blogPosts } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

// Get owner ID (first admin user)
const ownerResult = await db.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
const authorId = ownerResult[0]?.[0]?.id || 1;

console.log(`👤 Using author ID: ${authorId}\n`);

// Read all generated articles
const articlesDir = '/home/ubuntu/nimbus-roofing/generated_articles';
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md')).sort();

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
    
    const title = titleMatch ? titleMatch[1] : 'Untitled';
    const keyword = keywordMatch ? keywordMatch[1] : '';
    
    // Create slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Generate excerpt (first 200 chars of content, clean)
    const firstParagraph = articleContent.split('\n\n').find(p => p.trim() && !p.startsWith('#')) || articleContent.substring(0, 300);
    const excerpt = firstParagraph
      .replace(/[#*]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links
      .substring(0, 200)
      .trim() + '...';
    
    // Generate meta description (160 chars)
    const metaDescription = excerpt.substring(0, 157) + '...';
    
    // Determine category from keywords
    let category = 'General';
    if (keyword.includes('storm') || keyword.includes('hail') || keyword.includes('wind')) {
      category = 'Storm Damage';
    } else if (keyword.includes('insurance') || keyword.includes('claim')) {
      category = 'Insurance';
    } else if (keyword.includes('repair') || keyword.includes('maintenance')) {
      category = 'Maintenance';
    } else if (keyword.includes('commercial')) {
      category = 'Commercial';
    } else if (keyword.includes('residential')) {
      category = 'Residential';
    }
    
    // Insert using Drizzle ORM
    await db.insert(blogPosts).values({
      title,
      slug,
      content: articleContent,
      excerpt,
      metaTitle: title,
      metaDescription,
      keywords: keyword,
      authorId,
      category,
      isPublished: true,
      publishedAt: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        content: articleContent,
        excerpt,
        metaDescription,
        keywords: keyword,
        category,
        updatedAt: new Date(),
      }
    });
    
    console.log(`✅ ${successCount + 1}. ${title}`);
    console.log(`   Category: ${category} | Keyword: ${keyword}`);
    successCount++;
  } catch (error) {
    console.error(`❌ Error importing ${file}:`, error.message);
    errorCount++;
  }
}

console.log(`\n📊 Import Summary:`);
console.log(`   ✅ Success: ${successCount} articles`);
console.log(`   ❌ Errors: ${errorCount} articles`);
console.log(`\n🎉 All articles are now live at https://www.nimbusroofing.com/blog!`);
