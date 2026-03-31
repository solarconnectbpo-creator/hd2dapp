import { getDb } from "./db";
import { knowledgeBase, stormHistory } from "../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

/**
 * Continuous Learning Service
 * 
 * Automatically ingests knowledge from multiple sources:
 * - Web scraping (roofing industry, SEO, warranties)
 * - APIs (weather, storms)
 * - Conversations (user feedback)
 * - Seasonal patterns (holidays, specials)
 */

interface KnowledgeSource {
  url: string;
  category: string;
  subcategory?: string;
  keywords?: string[];
}

/**
 * Knowledge sources to scrape regularly
 */
const KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  // Roofing Industry
  {
    url: "https://www.nrca.net/", // National Roofing Contractors Association
    category: "roofing",
    subcategory: "industry_standards",
    keywords: ["roofing", "standards", "best practices"],
  },
  {
    url: "https://www.owenscorning.com/en-us/roofing",
    category: "roofing",
    subcategory: "materials",
    keywords: ["shingles", "warranties", "owens corning"],
  },
  // SEO & Marketing
  {
    url: "https://developers.google.com/search/docs",
    category: "seo",
    subcategory: "google_guidelines",
    keywords: ["seo", "google", "search"],
  },
  // Warranties
  {
    url: "https://www.owenscorning.com/en-us/roofing/residential/warranty",
    category: "warranties",
    subcategory: "manufacturer",
    keywords: ["warranty", "guarantee", "coverage"],
  },
];

/**
 * Seasonal events and holidays for content planning
 */
const SEASONAL_EVENTS = [
  {
    name: "Spring Storm Season",
    startMonth: 3,
    endMonth: 5,
    category: "holidays",
    subcategory: "seasonal",
    content: "Spring brings severe weather to North Texas. Prepare your roof for hail season with a free inspection.",
  },
  {
    name: "Memorial Day Special",
    month: 5,
    day: 31,
    category: "specials",
    subcategory: "holiday_promotion",
    content: "Memorial Day roofing special: 10% off all residential roof replacements. Honor our heroes with a new roof.",
  },
  {
    name: "Summer Heat Protection",
    startMonth: 6,
    endMonth: 8,
    category: "holidays",
    subcategory: "seasonal",
    content: "Protect your home from Texas summer heat with energy-efficient roofing solutions. Cool roof technology available.",
  },
  {
    name: "Labor Day Sale",
    month: 9,
    day: 7,
    category: "specials",
    subcategory: "holiday_promotion",
    content: "Labor Day roofing sale: Special financing available on all roof replacements. Limited time offer.",
  },
  {
    name: "Fall Storm Season",
    startMonth: 9,
    endMonth: 11,
    category: "holidays",
    subcategory: "seasonal",
    content: "Fall storms can damage your roof. Get a free inspection before winter arrives.",
  },
  {
    name: "Veterans Day Special",
    month: 11,
    day: 11,
    category: "specials",
    subcategory: "holiday_promotion",
    content: "Veterans Day special: 15% military discount on all roofing services. Thank you for your service.",
  },
  {
    name: "Holiday Season",
    startMonth: 11,
    endMonth: 12,
    category: "holidays",
    subcategory: "seasonal",
    content: "End-of-year roofing specials. Complete your home improvements before the new year. Tax benefits available.",
  },
];

/**
 * Ingest knowledge from a web source
 */
export async function ingestWebKnowledge(source: KnowledgeSource): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Fetch content from URL (simplified - in production use proper web scraping)
    const response = await fetch(source.url);
    const html = await response.text();

    // Extract key information using AI
    const extraction = await extractKnowledge(html, source.category);

    if (extraction.insights.length === 0) {
      console.log(`[Continuous Learning] No insights extracted from ${source.url}`);
      return;
    }

    // Store each insight in knowledge base
    for (const insight of extraction.insights) {
      await db.insert(knowledgeBase).values({
        category: source.category,
        subcategory: source.subcategory || "general",
        title: insight.title,
        content: insight.content,
        source: source.url,
        sourceType: "web_scrape",
        keywords: JSON.stringify(source.keywords || []),
        relevanceScore: insight.relevanceScore,
        usageCount: 0,
        isActive: true,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`[Continuous Learning] Ingested ${extraction.insights.length} insights from ${source.url}`);
  } catch (error) {
    console.error(`[Continuous Learning] Error ingesting from ${source.url}:`, error);
  }
}

/**
 * Extract knowledge from HTML content using AI
 */
async function extractKnowledge(
  html: string,
  category: string
): Promise<{ insights: Array<{ title: string; content: string; relevanceScore: number }> }> {
  // Truncate HTML to avoid token limits (keep first 10000 chars)
  const truncatedHtml = html.substring(0, 10000);

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Extract key insights from this webpage about ${category}. Return JSON with:
- insights: array of insights (max 5), each with:
  - title: brief title (max 100 chars)
  - content: detailed content (max 500 chars)
  - relevanceScore: 0-100 score of relevance to roofing business

Focus on actionable information, industry updates, best practices, and customer-relevant facts.`,
        },
        {
          role: "user",
          content: truncatedHtml,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "knowledge_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    relevanceScore: { type: "integer" },
                  },
                  required: ["title", "content", "relevanceScore"],
                  additionalProperties: false,
                },
              },
            },
            required: ["insights"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0].message.content;
    const result = JSON.parse(typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent));
    return result;
  } catch (error) {
    console.error("[Continuous Learning] Error extracting knowledge:", error);
    return { insights: [] };
  }
}

/**
 * Ingest seasonal events and holidays into knowledge base
 */
export async function ingestSeasonalKnowledge(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  for (const event of SEASONAL_EVENTS) {
    // Check if event is relevant now or upcoming (within 30 days)
    let isRelevant = false;
    let expiresAt: Date | null = null;

    if ("startMonth" in event && "endMonth" in event) {
      // Seasonal event (multi-month)
      isRelevant =
        currentMonth >= event.startMonth && currentMonth <= event.endMonth;
      if (isRelevant) {
        expiresAt = new Date(now.getFullYear(), event.endMonth, 0); // Last day of end month
      }
    } else if ("month" in event && "day" in event) {
      // Single-day event
      const eventDate = new Date(now.getFullYear(), event.month - 1, event.day);
      const daysDiff = Math.floor(
        (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      isRelevant = daysDiff >= -7 && daysDiff <= 30; // 7 days before to 30 days after
      if (isRelevant) {
        expiresAt = new Date(eventDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Expires 7 days after event
      }
    }

    if (!isRelevant) continue;

    // Check if already exists
    const existing = await db
      .select()
      .from(knowledgeBase)
      .where(
        and(
          eq(knowledgeBase.category, event.category),
          eq(knowledgeBase.title, event.name)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      // Create new entry
      await db.insert(knowledgeBase).values({
        category: event.category,
        subcategory: event.subcategory,
        title: event.name,
        content: event.content,
        source: "seasonal_calendar",
        sourceType: "manual",
        keywords: JSON.stringify([event.name.toLowerCase(), event.category]),
        relevanceScore: 90,
        usageCount: 0,
        isActive: true,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`[Continuous Learning] Added seasonal event: ${event.name}`);
    } else {
      // Update expiration date
      await db
        .update(knowledgeBase)
        .set({
          expiresAt,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(knowledgeBase.id, existing[0].id));
    }
  }
}

/**
 * Ingest storm history for predictive analysis
 */
export async function ingestStormHistory(
  eventId: string,
  eventType: string,
  severity: "Minor" | "Moderate" | "Severe" | "Extreme",
  location: string,
  county: string,
  startTime: Date,
  endTime: Date | null,
  description: string,
  hailSize?: string,
  windSpeed?: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if storm already exists
  const existing = await db
    .select()
    .from(stormHistory)
    .where(eq(stormHistory.eventId, eventId))
    .limit(1);

  if (existing.length > 0) {
    console.log(`[Continuous Learning] Storm ${eventId} already in history`);
    return;
  }

  // Determine seasonal pattern
  const month = startTime.getMonth() + 1;
  let seasonalPattern = "Winter";
  if (month >= 3 && month <= 5) seasonalPattern = "Spring";
  else if (month >= 6 && month <= 8) seasonalPattern = "Summer";
  else if (month >= 9 && month <= 11) seasonalPattern = "Fall";

  // Store storm in history
  await db.insert(stormHistory).values({
    eventId,
    eventType,
    severity,
    location,
    county,
    state: "TX",
    startTime,
    endTime: endTime || null,
    description,
    hailSize: hailSize || null,
    windSpeed: windSpeed || null,
    damageEstimate: null,
    leadsGenerated: 0,
    contentGenerated: false,
    blogPostId: null,
    seasonalPattern,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`[Continuous Learning] Added storm to history: ${eventId} (${eventType}, ${severity})`);
}

/**
 * Analyze storm patterns for predictive warnings
 */
export async function analyzeStormPatterns(): Promise<{
  riskScore: number;
  prediction: string;
  recommendations: string[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      riskScore: 0,
      prediction: "Unable to analyze - database unavailable",
      recommendations: [],
    };
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Get historical storms for current month (last 5 years)
  const fiveYearsAgo = new Date(currentYear - 5, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0);

  const historicalStorms = await db
    .select()
    .from(stormHistory)
    .where(
      and(
        gte(stormHistory.startTime, fiveYearsAgo),
        lte(stormHistory.startTime, endOfMonth)
      )
    )
    .orderBy(desc(stormHistory.startTime));

  if (historicalStorms.length === 0) {
    return {
      riskScore: 30,
      prediction: "No historical storm data available for this period",
      recommendations: [
        "Monitor weather alerts regularly",
        "Schedule roof inspection",
      ],
    };
  }

  // Calculate risk score based on historical patterns
  const severeStorms = historicalStorms.filter(
    (s) => s.severity === "Severe" || s.severity === "Extreme"
  ).length;
  const hailStorms = historicalStorms.filter((s) =>
    s.eventType.toLowerCase().includes("hail")
  ).length;

  const riskScore = Math.min(
    100,
    Math.floor(
      (severeStorms / historicalStorms.length) * 50 +
        (hailStorms / historicalStorms.length) * 50
    )
  );

  // Generate prediction using AI
  const stormSummary = historicalStorms
    .slice(0, 10)
    .map(
      (s) =>
        `${s.eventType} (${s.severity}) on ${s.startTime.toLocaleDateString()}`
    )
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Analyze storm patterns and provide prediction. Return JSON with:
- prediction: brief prediction (max 200 chars)
- recommendations: array of 3-5 actionable recommendations

Be specific and helpful for roofing business planning.`,
        },
        {
          role: "user",
          content: `Historical storms in McKinney, TX for this period:\n\n${stormSummary}\n\nRisk Score: ${riskScore}/100`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "storm_prediction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              prediction: { type: "string" },
              recommendations: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["prediction", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0].message.content;
    const analysis = JSON.parse(typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent));

    return {
      riskScore,
      prediction: analysis.prediction,
      recommendations: analysis.recommendations,
    };
  } catch (error) {
    console.error("[Continuous Learning] Error analyzing storm patterns:", error);
    return {
      riskScore,
      prediction: `Based on ${historicalStorms.length} historical storms, risk level is ${riskScore >= 70 ? "high" : riskScore >= 40 ? "moderate" : "low"}`,
      recommendations: [
        "Monitor NWS alerts",
        "Prepare emergency response team",
        "Stock up on materials",
      ],
    };
  }
}

/**
 * Get active knowledge for AI context
 */
export async function getActiveKnowledge(
  category?: string,
  limit: number = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  let query = db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, true))
    .orderBy(desc(knowledgeBase.relevanceScore), desc(knowledgeBase.usageCount))
    .limit(limit);

  if (category) {
    query = db
      .select()
      .from(knowledgeBase)
      .where(
        and(
          eq(knowledgeBase.isActive, true),
          eq(knowledgeBase.category, category)
        )
      )
      .orderBy(desc(knowledgeBase.relevanceScore), desc(knowledgeBase.usageCount))
      .limit(limit);
  }

  const knowledge = await query;

  // Filter out expired knowledge
  return knowledge.filter((k) => !k.expiresAt || k.expiresAt > now);
}

/**
 * Run continuous learning cycle (call this periodically)
 */
export async function runLearningCycle(): Promise<void> {
  console.log("[Continuous Learning] Starting learning cycle...");

  // Ingest seasonal knowledge
  await ingestSeasonalKnowledge();

  // Analyze storm patterns
  const prediction = await analyzeStormPatterns();
  console.log(`[Continuous Learning] Storm risk score: ${prediction.riskScore}/100`);
  console.log(`[Continuous Learning] Prediction: ${prediction.prediction}`);

  // Note: Web scraping would run here in production
  // For now, we'll skip it to avoid rate limiting and external dependencies
  // await ingestWebKnowledge(KNOWLEDGE_SOURCES[0]);

  console.log("[Continuous Learning] Learning cycle complete");
}
