/**
 * Nimbus SEO Agent Pro
 * AI-Powered Content Generation System
 * 
 * Automatically generates keyword-rich, semantically relevant blog content
 * using RAG workflows with proprietary business data.
 */

import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { retrieveKnowledge, SEO_KEYWORDS, CONTENT_TEMPLATES } from "./nimbusKnowledgeBase";

export interface ContentGenerationRequest {
  topic: string;
  geoTarget?: string;
  keywords?: string[];
  includeVisual?: boolean;
}

export interface GeneratedContent {
  title: string;
  content: string;
  excerpt: string;
  keywords: string[];
  visualUrl?: string;
  metadata: {
    wordCount: number;
    readingTime: number;
    seoScore: number;
  };
}

/**
 * Nimbus SEO Agent Pro - Main Content Generation Class
 */
export class NimbusSEOAgentPro {
  private geoTarget: string;
  
  constructor(geoTarget: string = "McKinney, Texas") {
    this.geoTarget = geoTarget;
  }

  /**
   * Generate semantically relevant, keyword-rich blog content
   * OPTIMIZED: Parallel processing for faster generation
   */
  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const { topic, geoTarget = this.geoTarget, keywords = [], includeVisual = true } = request;
    
    console.log("[SEO Agent Pro] Starting content generation...");
    const startTime = Date.now();
    
    // Step 1: Retrieve proprietary knowledge using RAG
    const contextData = retrieveKnowledge(topic);
    
    // Step 2: Select relevant keywords based on topic
    const targetKeywords = this.selectKeywords(topic, keywords);
    
    // Step 3: Construct semantic prompt (optimized - shorter prompt)
    const contentPrompt = this.buildContentPrompt(topic, geoTarget, contextData, targetKeywords);
    
    // OPTIMIZATION: Run LLM and image generation in parallel
    const [llmResponse, visualUrl] = await Promise.all([
      // Step 4: Generate article using LLM
      invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are the Nimbus SEO Agent Pro. Create SEO-optimized roofing content for ${geoTarget}. Be professional, authoritative, and customer-focused.`
          },
          {
            role: "user",
            content: contentPrompt
          }
        ]
      }),
      // Step 5: Generate visual asset in parallel (if requested)
      includeVisual
        ? (async () => {
            try {
              const visualPrompt = this.buildVisualPrompt(topic, geoTarget);
              const imageResult = await generateImage({ prompt: visualPrompt });
              return imageResult.url;
            } catch (error) {
              console.error("[SEO Agent Pro] Visual generation failed:", error);
              return undefined;
            }
          })()
        : Promise.resolve(undefined)
    ]);
    
    const messageContent = llmResponse.choices[0].message.content;
    const articleContent = typeof messageContent === 'string' ? messageContent : "";
    
    // Step 6: Extract title and generate metadata
    const title = this.extractTitle(articleContent, topic);
    const excerpt = this.generateExcerpt(articleContent);
    const metadata = this.calculateMetadata(articleContent, targetKeywords);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[SEO Agent Pro] Content generated in ${duration}s`);
    
    return {
      title,
      content: articleContent,
      excerpt,
      keywords: targetKeywords,
      visualUrl,
      metadata
    };
  }

  /**
   * Select relevant keywords based on topic
   */
  private selectKeywords(topic: string, customKeywords: string[]): string[] {
    const keywords: string[] = [...customKeywords];
    
    // Add keywords based on topic
    if (topic.includes('storm') || topic.includes('hail') || topic.includes('damage')) {
      keywords.push(...SEO_KEYWORDS.stormDamage.slice(0, 5));
    }
    
    if (topic.includes('insurance') || topic.includes('claim')) {
      keywords.push(...SEO_KEYWORDS.insuranceClaims.slice(0, 5));
    }
    
    // Always include local SEO keywords
    keywords.push(...SEO_KEYWORDS.localSEO.slice(0, 3));
    
    // Remove duplicates
    return Array.from(new Set(keywords));
  }

  /**
   * Build comprehensive content prompt for LLM
   */
  private buildContentPrompt(
    topic: string,
    geoTarget: string,
    context: string,
    keywords: string[]
  ): string {
    return `
ACTION: Write a comprehensive, SEO-optimized blog article about "${topic}" for homeowners in ${geoTarget}.

TARGET AUDIENCE: Homeowners who need roofing services, particularly those dealing with storm damage or insurance claims.

REQUIRED KEYWORD INTEGRATION (use naturally throughout the article):
${keywords.map(k => `- ${k}`).join('\n')}

PROPRIETARY CONTEXT (use this data to establish authority):
${context}

ARTICLE STRUCTURE:
1. **Compelling Headline** - Include primary keyword and location
2. **Introduction** (150-200 words) - Hook the reader with a relatable problem or question
3. **Main Content** (1200-1500 words) - Divided into 4-6 sections with H2 subheadings
   - Address customer pain points
   - Provide actionable insights
   - Include specific data and statistics from the context
   - Explain Nimbus Roofing's unique approach
4. **Call to Action** - Clear next steps for the reader

MANDATORY CONTENT POINTS:
- Emphasize Nimbus Roofing's ${context.includes('$4,200') ? 'average supplement value of $4,200+ discovered per claim' : 'expertise since 2015'}
- Mention Dustin Moore's credentials (Texas All Lines Adjuster License #2820344)
- Highlight Owens Corning Preferred Contractor status
- Include 5-year workmanship warranty
- Reference one-day installation capability
- Mention service areas: McKinney, Plano, Frisco, Allen

TONE: Professional, authoritative, trustworthy, customer-focused

SEO REQUIREMENTS:
- Use keywords naturally (avoid keyword stuffing)
- Include semantic variations of keywords
- Use short paragraphs (2-3 sentences max)
- Include bullet points for readability
- Write in active voice
- Target reading level: 8th-10th grade

OUTPUT FORMAT: Return the complete article in Markdown format with proper headings, bullet points, and formatting.
`;
  }

  /**
   * Build prompt for visual asset generation
   */
  private buildVisualPrompt(topic: string, geoTarget: string): string {
    if (topic.includes('storm') || topic.includes('hail')) {
      return `Professional photo of a residential house roof in ${geoTarget} after storm damage, showing hail impact marks on shingles, realistic architectural photography, high quality, daytime lighting`;
    }
    
    if (topic.includes('insurance') || topic.includes('claim')) {
      return `Professional roofing contractor inspecting a residential roof with clipboard and measuring tools, ${geoTarget} suburban neighborhood, realistic photography, professional attire`;
    }
    
    return `Beautiful residential house with new Owens Corning architectural shingles in ${geoTarget}, modern suburban home, professional real estate photography, blue sky, high quality`;
  }

  /**
   * Extract title from generated content
   */
  private extractTitle(content: string, fallbackTopic: string): string {
    // Look for first H1 heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }
    
    // Look for first line
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').trim();
    if (firstLine && firstLine.length < 100) {
      return firstLine;
    }
    
    return fallbackTopic;
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string): string {
    // Remove markdown headers
    const cleanContent = content.replace(/^#+\s+.+$/gm, '');
    
    // Get first paragraph
    const paragraphs = cleanContent.split('\n\n').filter(p => p.trim().length > 50);
    
    if (paragraphs.length > 0) {
      const excerpt = paragraphs[0].trim();
      return excerpt.length > 200 ? excerpt.substring(0, 197) + '...' : excerpt;
    }
    
    return content.substring(0, 197) + '...';
  }

  /**
   * Calculate content metadata
   */
  private calculateMetadata(content: string, keywords: string[]): {
    wordCount: number;
    readingTime: number;
    seoScore: number;
  } {
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    
    // Calculate basic SEO score
    let seoScore = 0;
    const lowerContent = content.toLowerCase();
    
    // Check keyword presence (max 40 points)
    const keywordMatches = keywords.filter(k => lowerContent.includes(k.toLowerCase())).length;
    seoScore += Math.min(keywordMatches * 5, 40);
    
    // Check word count (max 20 points)
    if (wordCount >= 1200) seoScore += 20;
    else if (wordCount >= 800) seoScore += 15;
    else if (wordCount >= 500) seoScore += 10;
    
    // Check headings (max 20 points)
    const headingCount = (content.match(/^##\s+/gm) || []).length;
    seoScore += Math.min(headingCount * 4, 20);
    
    // Check bullet points (max 10 points)
    const bulletCount = (content.match(/^[-*]\s+/gm) || []).length;
    seoScore += Math.min(bulletCount * 2, 10);
    
    // Check call to action (max 10 points)
    if (lowerContent.includes('call') || lowerContent.includes('contact') || lowerContent.includes('schedule')) {
      seoScore += 10;
    }
    
    return {
      wordCount,
      readingTime,
      seoScore: Math.min(seoScore, 100)
    };
  }
}

/**
 * Quick content generation function
 */
export async function generateSEOContent(
  topic: string,
  geoTarget?: string,
  keywords?: string[]
): Promise<GeneratedContent> {
  const agent = new NimbusSEOAgentPro(geoTarget);
  return agent.generateContent({ topic, keywords, includeVisual: true });
}


/**
 * Batch content generation - Generate multiple articles in parallel
 * OPTIMIZED: Process multiple topics simultaneously for faster bulk generation
 */
export async function generateBatchContent(
  topics: Array<{ topic: string; geoTarget?: string; keywords?: string[] }>,
  maxConcurrent: number = 2 // Reduced from 3 to 2 to avoid rate limits
): Promise<Array<GeneratedContent & { originalTopic: string }>> {
  console.log(`[SEO Agent Pro] Starting batch generation for ${topics.length} topics...`);
  const startTime = Date.now();
  
  const agent = new NimbusSEOAgentPro();
  const results: Array<GeneratedContent & { originalTopic: string }> = [];
  
  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < topics.length; i += maxConcurrent) {
    const batch = topics.slice(i, i + maxConcurrent);
    console.log(`[SEO Agent Pro] Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(topics.length / maxConcurrent)} (${i + 1}-${Math.min(i + maxConcurrent, topics.length)} of ${topics.length})...`);
    
    const batchResults = await Promise.all(
      batch.map(async ({ topic, geoTarget, keywords }) => {
        let retries = 3;
        while (retries > 0) {
          try {
            const content = await agent.generateContent({ topic, geoTarget, keywords, includeVisual: false }); // Disable images for speed
            return { ...content, originalTopic: topic };
          } catch (error: any) {
            retries--;
            console.error(`[SEO Agent Pro] Failed to generate content for "${topic}" (${retries} retries left):`, error.message);
            
            if (retries > 0) {
              // Wait before retry (exponential backoff)
              const waitTime = (4 - retries) * 2000; // 2s, 4s, 6s
              console.log(`[SEO Agent Pro] Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
              // Return empty result after all retries
              return {
                title: `Error: ${topic}`,
                content: "",
                excerpt: "",
                keywords: [],
                metadata: { wordCount: 0, readingTime: 0, seoScore: 0 },
                originalTopic: topic
              };
            }
          }
        }
        // TypeScript safety - should never reach here
        return {
          title: `Error: ${topic}`,
          content: "",
          excerpt: "",
          keywords: [],
          metadata: { wordCount: 0, readingTime: 0, seoScore: 0 },
          originalTopic: topic
        };
      })
    );
    
    results.push(...batchResults);
    
    // Small delay between batches to avoid rate limiting
    if (i + maxConcurrent < topics.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const successCount = results.filter(r => r.content.length > 0).length;
  console.log(`[SEO Agent Pro] Batch generation complete: ${successCount}/${topics.length} successful in ${duration}s`);
  
  return results;
}
