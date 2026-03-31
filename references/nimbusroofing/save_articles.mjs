import fs from 'fs';
import { execSync } from 'child_process';

// Read the generated articles
const data = JSON.parse(fs.readFileSync('/home/ubuntu/generate_seo_articles.json', 'utf8'));

console.log(`📚 Processing ${data.results.length} articles...`);

let successCount = 0;
let errorCount = 0;

// Save each article to a file in the blog directory
const blogDir = '/home/ubuntu/nimbus-roofing/generated_articles';
if (!fs.existsSync(blogDir)) {
  fs.mkdirSync(blogDir, { recursive: true });
}

data.results.forEach((result, index) => {
  try {
    const title = result.input;
    const content = result.output.article_content;
    const wordCount = result.output.word_count;
    const keyword = result.output.primary_keyword;
    
    // Create filename from title
    const filename = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 100);
    
    const filepath = `${blogDir}/${index + 1}-${filename}.md`;
    
    // Add metadata header
    const fullContent = `---
title: ${title}
primary_keyword: ${keyword}
word_count: ${wordCount}
status: draft
generated_date: ${new Date().toISOString()}
---

${content}
`;
    
    fs.writeFileSync(filepath, fullContent);
    console.log(`✅ ${index + 1}. ${title} (${wordCount} words)`);
    successCount++;
  } catch (error) {
    console.error(`❌ Error processing article ${index + 1}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Success: ${successCount} articles`);
console.log(`   ❌ Errors: ${errorCount} articles`);
console.log(`   📁 Saved to: ${blogDir}`);

// Calculate total word count
const totalWords = data.results.reduce((sum, r) => sum + (r.output?.word_count || 0), 0);
console.log(`   📝 Total words: ${totalWords.toLocaleString()}`);
console.log(`   📈 Average: ${Math.round(totalWords / successCount)} words per article`);
