import { getDb } from "../db";
import { blogs, InsertBlog, stormHistory, seoKeywords } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { desc, eq, and } from "drizzle-orm";

/**
 * Auto-Blog Writer System
 * 
 * Generates SEO-optimized blog posts automatically based on:
 * - Recent storm data from weather APIs
 * - Trending roofing keywords
 * - Customer questions from call logs
 * - Competitor analysis
 * 
 * Scheduled to run twice weekly (Tuesday & Friday)
 */

export interface BlogGenerationOptions {
  topic?: string;
  keywords?: string[];
  targetWordCount?: number;
  tone?: "professional" | "friendly" | "urgent";
  includeCallToAction?: boolean;
}

/**
 * Main blog generation function
 */
export async function generateBlogPost(options: BlogGenerationOptions = {}): Promise<number | null> {
  const db = await getDb();
  if (!db) {
    console.error("[AutoBlogWriter] Database not available");
    return null;
  }

  try {
    // 1. Determine blog topic if not provided
    const topic = options.topic || await selectBlogTopic();
    console.log(`[AutoBlogWriter] Generating blog about: ${topic}`);

    // 2. Research keywords and trending topics
    const keywords = options.keywords || await researchKeywords(topic);

    // 3. Generate blog content using AI
    const content = await generateContent(topic, keywords, options);

    // 4. Generate SEO metadata
    const seoData = await generateSEOMetadata(topic, content, keywords);

    // 5. Create slug from title
    const slug = createSlug(seoData.title);

    // 6. Save to database as draft
    const [blog] = await db.insert(blogs).values({
      title: seoData.title,
      slug,
      content,
      excerpt: seoData.excerpt,
      seoKeywords: keywords.join(", "),
      metaDescription: seoData.metaDescription,
      category: seoData.category,
      tags: seoData.tags.join(", "),
      status: "draft",
      aiGenerated: true,
      generationPrompt: `Topic: ${topic}, Keywords: ${keywords.join(", ")}`,
      publishDate: null, // Will be set when scheduled
      authorId: null, // AI-generated
    }).$returningId();

    console.log(`[AutoBlogWriter] Blog created successfully (ID: ${blog.id})`);
    return blog.id;

  } catch (error) {
    console.error("[AutoBlogWriter] Error generating blog:", error);
    return null;
  }
}

/**
 * Select blog topic based on recent events and trends
 */
async function selectBlogTopic(): Promise<string> {
  const db = await getDb();
  if (!db) return "Roofing Maintenance Tips for Homeowners";

  try {
    // Check for recent storms
    const recentStorms = await db
      .select()
      .from(stormHistory)
      .orderBy(desc(stormHistory.createdAt))
      .limit(1);

    if (recentStorms.length > 0) {
      const storm = recentStorms[0];
      return `How to Protect Your Roof from ${storm.stormType} Damage in ${storm.county}`;
    }

    // Check trending keywords
    const trendingKeywords = await db
      .select()
      .from(seoKeywords)
      .orderBy(desc(seoKeywords.searchVolume))
      .limit(1);

    if (trendingKeywords.length > 0) {
      return `Complete Guide to ${trendingKeywords[0].keyword}`;
    }

    // Default topics
    const defaultTopics = [
      "5 Signs Your Roof Needs Immediate Repair",
      "How to Choose the Right Roofing Material for Your Home",
      "Understanding Your Insurance Claim for Roof Damage",
      "Storm Season Preparation: Protecting Your Roof",
      "The Complete Guide to Roof Inspections",
      "Energy-Efficient Roofing Options for 2026",
      "Common Roofing Mistakes Homeowners Make",
      "How to Spot Roof Damage After a Storm",
    ];

    return defaultTopics[Math.floor(Math.random() * defaultTopics.length)];

  } catch (error) {
    console.error("[AutoBlogWriter] Error selecting topic:", error);
    return "Roofing Maintenance Tips for Homeowners";
  }
}

/**
 * Research keywords related to topic
 */
async function researchKeywords(topic: string): Promise<string[]> {
  const db = await getDb();
  
  // Base keywords
  const baseKeywords = [
    "roofing",
    "roof repair",
    "roof replacement",
    "storm damage",
    "insurance claim",
  ];

  if (!db) return baseKeywords;

  try {
    // Get relevant keywords from database
    const dbKeywords = await db
      .select()
      .from(seoKeywords)
      .orderBy(desc(seoKeywords.searchVolume))
      .limit(5);

    const keywords = dbKeywords.map(k => k.keyword);
    return [...new Set([...baseKeywords, ...keywords])];

  } catch (error) {
    console.error("[AutoBlogWriter] Error researching keywords:", error);
    return baseKeywords;
  }
}

/**
 * Generate blog content using AI
 */
async function generateContent(
  topic: string,
  keywords: string[],
  options: BlogGenerationOptions
): Promise<string> {
  const wordCount = options.targetWordCount || 1200;
  const tone = options.tone || "professional";
  const includeCallToAction = options.includeCallToAction !== false;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an expert roofing content writer. Write SEO-optimized blog posts that are informative, engaging, and helpful to homeowners. Use a ${tone} tone.`,
        },
        {
          role: "user",
          content: `Write a comprehensive blog post about: "${topic}"

Requirements:
- Target word count: ${wordCount} words
- Include these keywords naturally: ${keywords.join(", ")}
- Use proper markdown formatting with headers (##, ###)
- Include bullet points and numbered lists where appropriate
- Add practical tips and actionable advice
${includeCallToAction ? "- End with a strong call-to-action encouraging readers to contact Nimbus Roofing" : ""}

Write the complete blog post now:`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    return content;

  } catch (error) {
    console.error("[AutoBlogWriter] Error generating content:", error);
    return `# ${topic}\n\nContent generation failed. Please try again.`;
  }
}

/**
 * Generate SEO metadata for blog post
 */
async function generateSEOMetadata(
  topic: string,
  content: string,
  keywords: string[]
): Promise<{
  title: string;
  excerpt: string;
  metaDescription: string;
  category: string;
  tags: string[];
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are an SEO expert. Generate optimized metadata for blog posts. Respond with JSON only:
{
  "title": "SEO-optimized title (60 chars max)",
  "excerpt": "Brief excerpt (150 chars)",
  "metaDescription": "Meta description (155 chars max)",
  "category": "Category name",
  "tags": ["tag1", "tag2", "tag3"]
}`,
        },
        {
          role: "user",
          content: `Topic: ${topic}\nKeywords: ${keywords.join(", ")}\n\nFirst 200 words of content:\n${content.substring(0, 500)}`,
        },
      ],
    });

    const metadata = JSON.parse(response.choices[0]?.message?.content || "{}");
    return {
      title: metadata.title || topic,
      excerpt: metadata.excerpt || content.substring(0, 150),
      metaDescription: metadata.metaDescription || content.substring(0, 155),
      category: metadata.category || "Roofing Tips",
      tags: metadata.tags || keywords.slice(0, 5),
    };

  } catch (error) {
    console.error("[AutoBlogWriter] Error generating SEO metadata:", error);
    return {
      title: topic,
      excerpt: content.substring(0, 150),
      metaDescription: content.substring(0, 155),
      category: "Roofing Tips",
      tags: keywords.slice(0, 5),
    };
  }
}

/**
 * Create URL-friendly slug from title
 */
function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Schedule blog for publishing
 */
export async function scheduleBlogPost(blogId: number, publishDate: Date): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(blogs)
      .set({
        status: "scheduled",
        publishDate,
      })
      .where(eq(blogs.id, blogId));

    console.log(`[AutoBlogWriter] Blog ${blogId} scheduled for ${publishDate.toISOString()}`);
    return true;

  } catch (error) {
    console.error("[AutoBlogWriter] Error scheduling blog:", error);
    return false;
  }
}

/**
 * Publish blog post
 */
export async function publishBlogPost(blogId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.update(blogs)
      .set({
        status: "published",
        publishDate: new Date(),
      })
      .where(eq(blogs.id, blogId));

    console.log(`[AutoBlogWriter] Blog ${blogId} published successfully`);
    return true;

  } catch (error) {
    console.error("[AutoBlogWriter] Error publishing blog:", error);
    return false;
  }
}

/**
 * Get all blogs with filters
 */
export async function getAllBlogs(filters: {
  status?: "draft" | "scheduled" | "published" | "archived";
  aiGenerated?: boolean;
  limit?: number;
} = {}) {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(blogs);

    if (filters.status) {
      query = query.where(eq(blogs.status, filters.status)) as any;
    }

    if (filters.aiGenerated !== undefined) {
      query = query.where(eq(blogs.aiGenerated, filters.aiGenerated)) as any;
    }

    query = query.orderBy(desc(blogs.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const results = await query;
    return results;

  } catch (error) {
    console.error("[AutoBlogWriter] Error fetching blogs:", error);
    return [];
  }
}

/**
 * Auto-generate blog on schedule (Tuesday & Friday)
 * This function should be called by a cron job
 */
export async function autoGenerateScheduledBlog(): Promise<void> {
  console.log("[AutoBlogWriter] Running scheduled blog generation...");

  const blogId = await generateBlogPost({
    targetWordCount: 1200,
    tone: "professional",
    includeCallToAction: true,
  });

  if (blogId) {
    // Schedule for publishing in 1 hour (gives time for review)
    const publishDate = new Date(Date.now() + 60 * 60 * 1000);
    await scheduleBlogPost(blogId, publishDate);
  }
}
