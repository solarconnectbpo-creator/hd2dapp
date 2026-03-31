import { getDb } from './db';
import { seoKeywords, contentTemplates } from '../drizzle/schema';
import { eq, like, and, or } from 'drizzle-orm';
import { invokeLLM } from './_core/llm';

/**
 * RAG (Retrieval-Augmented Generation) System for SEO Content
 * 
 * This system retrieves relevant keywords and templates from the database
 * and uses them to generate optimized content with AI.
 */

export interface ContentGenerationParams {
  topic: string;
  contentType: 'blog' | 'service_page' | 'neighborhood' | 'social' | 'email';
  targetKeywords?: string[];
  wordCount?: number;
  tone?: 'professional' | 'friendly' | 'technical' | 'urgent';
}

export interface GeneratedContent {
  title: string;
  content: string;
  metaDescription: string;
  keywords: string[];
  internalLinks: string[];
  callToAction: string;
}

/**
 * Retrieve relevant keywords from database based on topic
 */
export async function retrieveRelevantKeywords(topic: string, limit: number = 10) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Search for keywords that match the topic
  const keywords = await db
    .select()
    .from(seoKeywords)
    .where(
      and(
        or(
          like(seoKeywords.keyword, `%${topic}%`),
          like(seoKeywords.category, `%${topic}%`)
        ),
        eq(seoKeywords.isActive, true)
      )
    )
    .limit(limit);

  return keywords;
}

/**
 * Retrieve relevant content templates from database
 */
export async function retrieveContentTemplates(
  type: string,
  campaignId?: string,
  limit: number = 5
) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const conditions = [eq(contentTemplates.isActive, true)];
  
  if (type) {
    conditions.push(eq(contentTemplates.type, type as any));
  }
  
  if (campaignId) {
    conditions.push(eq(contentTemplates.campaignId, campaignId));
  }

  const templates = await db
    .select()
    .from(contentTemplates)
    .where(and(...conditions))
    .limit(limit);

  return templates;
}

/**
 * Generate SEO-optimized content using RAG system
 */
export async function generateSeoContent(
  params: ContentGenerationParams
): Promise<GeneratedContent> {
  // Step 1: Retrieve relevant keywords
  const keywords = await retrieveRelevantKeywords(params.topic, 15);
  const keywordList = keywords.map((k) => k.keyword);

  // Merge with target keywords if provided
  const allKeywords = params.targetKeywords
    ? Array.from(new Set([...keywordList, ...params.targetKeywords]))
    : keywordList;

  // Step 2: Retrieve relevant templates
  let templateType: string = 'headline';
  if (params.contentType === 'blog') templateType = 'headline';
  else if (params.contentType === 'social') templateType = 'social';
  else if (params.contentType === 'email') templateType = 'email';

  const templates = await retrieveContentTemplates(templateType, undefined, 5);

  // Step 3: Build context for LLM
  const context = {
    topic: params.topic,
    keywords: allKeywords.slice(0, 10),
    templates: templates.map((t) => ({
      type: t.type,
      template: t.template,
      keywords: t.keywords,
      hashtags: t.hashtags,
    })),
    contentType: params.contentType,
    wordCount: params.wordCount || 800,
    tone: params.tone || 'professional',
  };

  // Step 4: Generate content with LLM
  const prompt = `You are an expert SEO content writer for Nimbus Roofing, a premium roofing company in McKinney, Texas.

**Task:** Generate ${params.contentType} content about "${params.topic}"

**Requirements:**
- Target word count: ${context.wordCount} words
- Tone: ${context.tone}
- Include these keywords naturally: ${context.keywords.join(', ')}
- Follow Texas building codes and roofing industry best practices
- Include specific examples and data when possible

**Available Templates for Inspiration:**
${context.templates.map((t, i) => `${i + 1}. [${t.type}] ${t.template}`).join('\n')}

**Output Format (JSON):**
{
  "title": "SEO-optimized title (60 chars max)",
  "content": "Full content with proper formatting",
  "metaDescription": "Meta description (150-160 chars)",
  "keywords": ["primary keyword", "secondary keyword", "..."],
  "internalLinks": ["/services/roof-repair", "/neighborhoods/mckinney"],
  "callToAction": "Strong CTA with phone number or form link"
}

Generate the content now:`;

  const response = await invokeLLM({
    messages: [
      {
        role: 'system',
        content:
          'You are an expert SEO content writer specializing in roofing industry content. Always return valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'seo_content',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            metaDescription: { type: 'string' },
            keywords: {
              type: 'array',
              items: { type: 'string' },
            },
            internalLinks: {
              type: 'array',
              items: { type: 'string' },
            },
            callToAction: { type: 'string' },
          },
          required: [
            'title',
            'content',
            'metaDescription',
            'keywords',
            'internalLinks',
            'callToAction',
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const messageContent = response.choices[0].message.content;
  const contentString = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
  const generatedContent = JSON.parse(contentString || '{}');

  return generatedContent as GeneratedContent;
}

/**
 * Generate multiple content pieces in batch
 */
export async function generateBatchContent(
  topics: string[],
  contentType: ContentGenerationParams['contentType']
): Promise<GeneratedContent[]> {
  const results: GeneratedContent[] = [];

  for (const topic of topics) {
    try {
      const content = await generateSeoContent({
        topic,
        contentType,
      });
      results.push(content);
    } catch (error) {
      console.error(`[RAG] Failed to generate content for: ${topic}`, error);
    }
  }

  return results;
}
