import { invokeLLM } from "./_core/llm";
import { generateCompetitiveHeadlines, optimizeHeadline } from "./competitiveHeadlineGenerator";
import { generateSEOContent } from "./seoAgentPro";
import { NIMBUS_KNOWLEDGE } from "./nimbusKnowledgeBase";
import * as db from "./db";

/**
 * Auto-SEO Generative Loop
 * Continuously generates, tests, and optimizes content to improve rankings
 * Includes grounding to prevent hallucinations
 */

interface SEOLoopOptions {
  targetKeywords: string[];
  city: string;
  contentType: "blog" | "landing_page" | "service_page";
  iterations?: number;
  autoPublish?: boolean;
}

interface ContentQualityScore {
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  hasHallucinations: boolean;
  groundingScore: number; // 0-100
}

/**
 * Ground check: Verify content against known facts to prevent hallucinations
 */
async function groundCheckContent(content: string, topic: string): Promise<ContentQualityScore> {
  const knownFacts = `
VERIFIED NIMBUS ROOFING FACTS (DO NOT HALLUCINATE):
- Company: Nimbus Roofing, McKinney TX
- Owner: Dustin D. Moore, Licensed Texas Adjuster
- Service Area: McKinney + 83 DFW cities
- Experience: 10+ years
- Certifications: Owens Corning Preferred Contractor
- Phone: (214) 612-6696
- AI Technology: Nimbus AI-Roofing Agent
- Average Claim Value Increase: $4,200+
- Response Time: 24/7 emergency service, 2-hour response for emergencies
- Services: Residential, Commercial, Storm Damage, Insurance Claims
- Specialties: Hail damage, wind damage, roof leaks, missing shingles

FACTS TO VERIFY IN CONTENT:
1. No fake statistics or made-up numbers
2. No false certifications or awards
3. No invented customer testimonials
4. No exaggerated claims without data
5. All prices and timelines must be realistic
6. Geographic claims must be accurate (DFW only)
`;

  const prompt = `
Analyze this content for factual accuracy and hallucinations:

TOPIC: ${topic}

CONTENT TO CHECK:
${content}

KNOWN FACTS:
${knownFacts}

TASK: Identify any hallucinations, false claims, or unsupported statements.

Return a JSON object with:
{
  "score": 0-100 (100 = perfect, no issues),
  "issues": ["list of problems found"],
  "suggestions": ["how to fix each issue"],
  "hasHallucinations": true/false,
  "groundingScore": 0-100 (how well grounded in facts)
}
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a fact-checker identifying hallucinations and false claims in content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_quality_check",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              issues: { type: "array", items: { type: "string" } },
              suggestions: { type: "array", items: { type: "string" } },
              hasHallucinations: { type: "boolean" },
              groundingScore: { type: "number" },
            },
            required: ["score", "issues", "suggestions", "hasHallucinations", "groundingScore"],
            additionalProperties: false,
          },
        },
      },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    return result as ContentQualityScore;
  } catch (error) {
    console.error("[Ground Check] Failed:", error);
    return {
      score: 50,
      issues: ["Unable to verify content"],
      suggestions: ["Manual review recommended"],
      hasHallucinations: false,
      groundingScore: 50,
    };
  }
}

/**
 * Fix hallucinations in content
 */
async function fixHallucinations(
  content: string,
  issues: string[],
  suggestions: string[]
): Promise<string> {
  const prompt = `
Fix the following issues in this content:

ORIGINAL CONTENT:
${content}

ISSUES FOUND:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}

SUGGESTED FIXES:
${suggestions.map((fix, i) => `${i + 1}. ${fix}`).join("\n")}

TASK: Rewrite the content to fix all issues while maintaining the same structure and message.
Use ONLY verified facts from Nimbus Roofing knowledge base.

Return the corrected content.
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an editor fixing factual errors and hallucinations in content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.choices[0]?.message?.content || content;
  } catch (error) {
    console.error("[Fix Hallucinations] Failed:", error);
    return content;
  }
}

/**
 * Auto-SEO Loop: Generate → Ground Check → Optimize → Publish
 */
export async function runAutoSEOLoop(options: SEOLoopOptions): Promise<{
  success: boolean;
  articlesGenerated: number;
  articlesPublished: number;
  averageQualityScore: number;
  errors: string[];
}> {
  const {
    targetKeywords,
    city,
    contentType,
    iterations = 1,
    autoPublish = false,
  } = options;

  const results = {
    success: true,
    articlesGenerated: 0,
    articlesPublished: 0,
    averageQualityScore: 0,
    errors: [] as string[],
  };

  let totalQualityScore = 0;

  for (let i = 0; i < iterations; i++) {
    const keyword = targetKeywords[i % targetKeywords.length];

    try {
      console.log(`[Auto-SEO Loop] Iteration ${i + 1}/${iterations} - Keyword: ${keyword}`);

      // Step 1: Generate competitive headline
      const headlines = await generateCompetitiveHeadlines({
        service: keyword.includes("roofing") ? "Roofing" : keyword,
        city,
        count: 1,
      });
      const headline = headlines[0] || `${keyword} ${city} TX`;

      // Step 2: Generate SEO-optimized content
      const contentResult = await generateSEOContent({
        keyword,
        city,
        contentType: "blog_post",
        wordCount: 1500,
      });

      if (!contentResult.success || !contentResult.content) {
        results.errors.push(`Failed to generate content for: ${keyword}`);
        continue;
      }

      results.articlesGenerated++;

      // Step 3: Ground check for hallucinations
      const qualityCheck = await groundCheckContent(
        contentResult.content,
        keyword
      );

      totalQualityScore += qualityCheck.score;

      console.log(`[Auto-SEO Loop] Quality Score: ${qualityCheck.score}/100, Grounding: ${qualityCheck.groundingScore}/100`);

      // Step 4: Fix hallucinations if found
      let finalContent = contentResult.content;
      if (qualityCheck.hasHallucinations || qualityCheck.score < 70) {
        console.log(`[Auto-SEO Loop] Fixing ${qualityCheck.issues.length} issues...`);
        finalContent = await fixHallucinations(
          contentResult.content,
          qualityCheck.issues,
          qualityCheck.suggestions
        );

        // Re-check after fixes
        const recheckResult = await groundCheckContent(finalContent, keyword);
        console.log(`[Auto-SEO Loop] After fixes: ${recheckResult.score}/100`);
      }

      // Step 5: Auto-publish if enabled and quality is high
      if (autoPublish && qualityCheck.score >= 80) {
        const database = await db.getDb();
        if (database) {
          try {
            await database.insert(require("../drizzle/schema").blogPosts).values({
              title: headline,
              slug: headline.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
              content: finalContent,
              excerpt: finalContent.substring(0, 200) + "...",
              authorId: 1, // Admin
              category: contentType === "blog" ? "SEO Content" : "Service Pages",
              keywords: keyword,
              metaTitle: headline,
              metaDescription: finalContent.substring(0, 160),
              isPublished: true,
              publishedAt: new Date(),
            });

            results.articlesPublished++;
            console.log(`[Auto-SEO Loop] Published: ${headline}`);
          } catch (error) {
            console.error(`[Auto-SEO Loop] Publish failed:`, error);
            results.errors.push(`Failed to publish: ${headline}`);
          }
        }
      }
    } catch (error: any) {
      console.error(`[Auto-SEO Loop] Iteration ${i + 1} failed:`, error);
      results.errors.push(`Iteration ${i + 1}: ${error.message}`);
      results.success = false;
    }
  }

  results.averageQualityScore = Math.round(totalQualityScore / Math.max(results.articlesGenerated, 1));

  return results;
}

/**
 * Continuous SEO optimization loop (runs in background)
 */
export async function startContinuousSEOLoop(
  keywords: string[],
  intervalHours: number = 24
): Promise<void> {
  console.log(`[Continuous SEO] Starting loop with ${keywords.length} keywords, interval: ${intervalHours}h`);

  const runLoop = async () => {
    const result = await runAutoSEOLoop({
      targetKeywords: keywords,
      city: "McKinney",
      contentType: "blog",
      iterations: Math.min(keywords.length, 10), // Max 10 per run
      autoPublish: true,
    });

    console.log(`[Continuous SEO] Loop complete:`, result);
  };

  // Run immediately
  await runLoop();

  // Then run on interval
  setInterval(runLoop, intervalHours * 60 * 60 * 1000);
}
