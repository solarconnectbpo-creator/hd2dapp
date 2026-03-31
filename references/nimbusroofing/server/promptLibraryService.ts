import { eq, and, like, or, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  promptLibrary,
  promptFavorites,
  promptUsageLogs,
  customPrompts,
  InsertPromptLibraryItem,
  InsertPromptFavorite,
  InsertPromptUsageLog,
  InsertCustomPrompt,
} from "../drizzle/schema";

/**
 * Prompt Library Service
 * Manages Perplexity AI prompts for daily Nimbus Roofing tasks
 */

// Get all prompts with optional filtering
export async function getAllPrompts(filters?: {
  category?: string;
  searchQuery?: string;
  isFeatured?: boolean;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let query = db.select().from(promptLibrary);

  const conditions = [];

  if (filters?.category) {
    conditions.push(eq(promptLibrary.category, filters.category as any));
  }

  if (filters?.isFeatured !== undefined) {
    conditions.push(eq(promptLibrary.isFeatured, filters.isFeatured));
  }

  if (filters?.isActive !== undefined) {
    conditions.push(eq(promptLibrary.isActive, filters.isActive));
  }

  if (filters?.searchQuery) {
    const searchTerm = `%${filters.searchQuery}%`;
    conditions.push(
      or(
        like(promptLibrary.title, searchTerm),
        like(promptLibrary.useCase, searchTerm),
        like(promptLibrary.promptText, searchTerm),
        like(promptLibrary.tags, searchTerm)
      )!
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)!) as any;
  }

  const results = await query.orderBy(desc(promptLibrary.usageCount));
  return results;
}

// Get single prompt by ID
export async function getPromptById(promptId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(promptLibrary)
    .where(eq(promptLibrary.id, promptId))
    .limit(1);

  return results[0] || null;
}

// Create new prompt
export async function createPrompt(prompt: InsertPromptLibraryItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(promptLibrary).values(prompt);
  return result;
}

// Update prompt
export async function updatePrompt(
  promptId: number,
  updates: Partial<InsertPromptLibraryItem>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(promptLibrary)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(promptLibrary.id, promptId));

  return getPromptById(promptId);
}

// Increment usage count and update last used timestamp
export async function recordPromptUsage(
  promptId: number,
  userId?: number,
  customizationValues?: Record<string, any>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update usage count and timestamp
  await db
    .update(promptLibrary)
    .set({
      usageCount: sql`${promptLibrary.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(promptLibrary.id, promptId));

  // Log the usage
  const usageLog: InsertPromptUsageLog = {
    promptId,
    userId: userId || null,
    customizationValues: customizationValues
      ? JSON.stringify(customizationValues)
      : null,
  };

  await db.insert(promptUsageLogs).values(usageLog);
}

// Get user's favorite prompts
export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select({
      favorite: promptFavorites,
      prompt: promptLibrary,
    })
    .from(promptFavorites)
    .innerJoin(
      promptLibrary,
      eq(promptFavorites.promptId, promptLibrary.id)
    )
    .where(eq(promptFavorites.userId, userId));

  return results;
}

// Add prompt to favorites
export async function addToFavorites(
  userId: number,
  promptId: number,
  notes?: string,
  customDefaults?: Record<string, any>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const favorite: InsertPromptFavorite = {
    userId,
    promptId,
    notes: notes || null,
    customDefaults: customDefaults ? JSON.stringify(customDefaults) : null,
  };

  await db.insert(promptFavorites).values(favorite);
}

// Remove from favorites
export async function removeFromFavorites(userId: number, promptId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(promptFavorites)
    .where(
      and(
        eq(promptFavorites.userId, userId),
        eq(promptFavorites.promptId, promptId)
      )!
    );
}

// Check if prompt is favorited by user
export async function isFavorited(userId: number, promptId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(promptFavorites)
    .where(
      and(
        eq(promptFavorites.userId, userId),
        eq(promptFavorites.promptId, promptId)
      )!
    )
    .limit(1);

  return results.length > 0;
}

// Get prompt usage statistics
export async function getPromptStats(promptId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const prompt = await getPromptById(promptId);
  if (!prompt) return null;

  // Get usage logs
  const usageLogs = await db
    .select()
    .from(promptUsageLogs)
    .where(eq(promptUsageLogs.promptId, promptId))
    .orderBy(desc(promptUsageLogs.copiedAt))
    .limit(100);

  // Calculate stats
  const totalUsage = prompt.usageCount;
  const recentUsage = usageLogs.length;
  const qualityRatings = usageLogs
    .filter((log) => log.resultQuality)
    .map((log) => log.resultQuality);

  return {
    promptId,
    title: prompt.title,
    totalUsage,
    recentUsage,
    lastUsedAt: prompt.lastUsedAt,
    qualityRatings,
    recentLogs: usageLogs.slice(0, 10),
  };
}

// Get all categories with prompt counts
export async function getCategoriesWithCounts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select({
      category: promptLibrary.category,
      count: sql<number>`count(*)`,
    })
    .from(promptLibrary)
    .where(eq(promptLibrary.isActive, true))
    .groupBy(promptLibrary.category);

  return results;
}

// Create custom prompt
export async function createCustomPrompt(prompt: InsertCustomPrompt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(customPrompts).values(prompt);
  return result;
}

// Get user's custom prompts
export async function getUserCustomPrompts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(customPrompts)
    .where(eq(customPrompts.createdBy, userId))
    .orderBy(desc(customPrompts.usageCount));

  return results;
}

// Get shared custom prompts
export async function getSharedCustomPrompts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const results = await db
    .select()
    .from(customPrompts)
    .where(eq(customPrompts.isShared, true))
    .orderBy(desc(customPrompts.usageCount));

  return results;
}

// Search across all prompts (library + custom)
export async function searchAllPrompts(
  searchQuery: string,
  userId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const searchTerm = `%${searchQuery}%`;

  // Search library prompts
  const libraryResults = await db
    .select()
    .from(promptLibrary)
    .where(
      and(
        eq(promptLibrary.isActive, true),
        or(
          like(promptLibrary.title, searchTerm),
          like(promptLibrary.useCase, searchTerm),
          like(promptLibrary.promptText, searchTerm),
          like(promptLibrary.tags, searchTerm)
        )!
      )!
    )
    .orderBy(desc(promptLibrary.usageCount))
    .limit(20);

  // Search custom prompts
  let customResults: any[] = [];
  if (userId) {
    customResults = await db
      .select()
      .from(customPrompts)
      .where(
        and(
          or(
            eq(customPrompts.createdBy, userId),
            eq(customPrompts.isShared, true)
          )!,
          or(
            like(customPrompts.title, searchTerm),
            like(customPrompts.promptText, searchTerm)
          )!
        )!
      )
      .orderBy(desc(customPrompts.usageCount))
      .limit(10);
  }

  return {
    library: libraryResults,
    custom: customResults,
  };
}

// Seed initial prompts from PERPLEXITY_PROMPTS.md
export async function seedPrompts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if prompts already exist
  const existing = await db.select().from(promptLibrary).limit(1);
  if (existing.length > 0) {
    console.log("Prompts already seeded");
    return;
  }

  const prompts: InsertPromptLibraryItem[] = [
    {
      title: "Storm Damage Research & Lead Generation",
      category: "storm_intelligence",
      useCase: "After major weather events to identify lead opportunities",
      promptText: `I need real-time storm damage intelligence for Nimbus Roofing in the Dallas-Fort Worth area. Please provide:

1. **Recent Storm Events** (past 7 days):
   - Hail size and locations in [COUNTY_NAMES]
   - Wind damage reports from National Weather Service
   - Affected zip codes with highest damage severity

2. **Insurance Claim Trends**:
   - Which insurance companies are processing the most claims in DFW
   - Average claim approval rates for roof damage
   - Current adjuster wait times

3. **Competitor Activity**:
   - Which roofing companies are advertising storm damage services in affected areas
   - Current pricing trends for storm damage repairs
   - Door-to-door canvassing activity reports

4. **Lead Generation Opportunities**:
   - Neighborhoods with highest storm damage concentration
   - HOAs that may need bulk roofing services
   - Commercial properties affected by recent storms

Format the response with actionable next steps and priority zip codes for immediate canvassing.`,
      customizationFields: JSON.stringify([
        {
          name: "COUNTY_NAMES",
          label: "County Names",
          type: "text",
          default: "Collin County, Denton County, Dallas County",
          required: true,
        },
        {
          name: "TIME_PERIOD",
          label: "Time Period",
          type: "text",
          default: "past 7 days",
          required: false,
        },
      ]),
      tags: JSON.stringify([
        "storm",
        "hail",
        "leads",
        "insurance",
        "weather",
        "emergency",
      ]),
      isFeatured: true,
      isActive: true,
    },
    {
      title: "Competitor Intelligence & Market Positioning",
      category: "market_research",
      useCase: "Monthly competitive analysis and positioning strategy",
      promptText: `Analyze the competitive landscape for Nimbus Roofing in the [MARKET_AREA] roofing market. Focus on:

1. **Top [COMPETITOR_COUNT] Competitors**:
   - Company names, locations, and service areas
   - Their unique selling propositions (USPs)
   - Customer review ratings (Google, Yelp, BBB)
   - Pricing strategies and typical project costs

2. **Digital Marketing Analysis**:
   - SEO rankings for [TARGET_KEYWORDS]
   - Social media presence and engagement rates
   - Google Ads strategies and estimated ad spend
   - Content marketing approaches (blogs, videos, guides)

3. **Service Differentiation**:
   - What services do competitors offer that we don't?
   - What gaps exist in the market that Nimbus can fill?
   - How are competitors positioning AI/technology in their offerings?

4. **Customer Pain Points**:
   - Common complaints about competitors in reviews
   - Unmet customer needs in the DFW roofing market
   - Opportunities for Nimbus to differentiate

Provide 3 specific recommendations for how Nimbus Roofing can gain market share.`,
      customizationFields: JSON.stringify([
        {
          name: "MARKET_AREA",
          label: "Market Area",
          type: "text",
          default: "Dallas-Fort Worth",
          required: true,
        },
        {
          name: "TARGET_KEYWORDS",
          label: "Target Keywords",
          type: "text",
          default:
            "roofing McKinney TX, storm damage repair Plano, roof replacement Frisco",
          required: true,
        },
        {
          name: "COMPETITOR_COUNT",
          label: "Number of Competitors",
          type: "number",
          default: "5",
          required: false,
        },
      ]),
      tags: JSON.stringify([
        "competitors",
        "market research",
        "seo",
        "positioning",
        "strategy",
      ]),
      isFeatured: true,
      isActive: true,
    },
    {
      title: "Roofing Material & Technology Research",
      category: "product_research",
      useCase: "Quarterly research on new materials and technologies",
      promptText: `I need the latest information on roofing materials and technologies for Nimbus Roofing. Research:

1. **New Roofing Materials** ([YEAR_RANGE]):
   - Innovative shingle technologies (impact resistance, energy efficiency)
   - Solar roofing integration options
   - Cool roof technologies for [STATE] climate
   - Warranty improvements from major manufacturers

2. **Manufacturer Updates**:
   - Latest products from [MANUFACTURERS]
   - Price changes or supply chain issues
   - New warranty programs or contractor incentives

3. **AI & Inspection Technology**:
   - Latest drone inspection technologies for roofing
   - AI-powered damage detection tools
   - Thermal imaging advancements for leak detection
   - 3D modeling software for estimates

4. **Sustainability & Regulations**:
   - [STATE] building code updates affecting roofing
   - Energy efficiency rebates and tax credits
   - Sustainable roofing material options
   - LEED certification requirements

Summarize the top 3 technologies Nimbus should adopt in the next 6 months.`,
      customizationFields: JSON.stringify([
        {
          name: "YEAR_RANGE",
          label: "Year Range",
          type: "text",
          default: "2025-2026",
          required: false,
        },
        {
          name: "MANUFACTURERS",
          label: "Manufacturers",
          type: "text",
          default: "GAF, Owens Corning, CertainTeed, Malarkey",
          required: true,
        },
        {
          name: "STATE",
          label: "State",
          type: "text",
          default: "Texas",
          required: true,
        },
      ]),
      tags: JSON.stringify([
        "materials",
        "technology",
        "innovation",
        "manufacturers",
        "sustainability",
      ]),
      isFeatured: false,
      isActive: true,
    },
    {
      title: "Local SEO & Content Ideas",
      category: "seo_marketing",
      useCase: "Monthly content planning and keyword research",
      promptText: `Generate hyperlocal content ideas for Nimbus Roofing to dominate [SERVICE_AREA] roofing search results. Provide:

1. **High-Value Keywords** (with search volume):
   - City-specific keywords ([TARGET_CITIES])
   - Long-tail keywords with buyer intent
   - Question-based keywords for FAQ content
   - Seasonal keywords (hail season, summer heat, winter prep)

2. **Content Topic Ideas**:
   - Blog post titles optimized for featured snippets
   - Video content ideas for YouTube SEO
   - Local landing page topics for each DFW city
   - FAQ content based on "People Also Ask" data

3. **Local Link Building Opportunities**:
   - DFW business directories and local citations
   - Partnership opportunities with local businesses
   - Community events for sponsorship and PR
   - Local news outlets covering home improvement

4. **Competitor Content Gaps**:
   - Topics competitors haven't covered
   - Questions customers are asking that aren't answered
   - Seasonal content opportunities being missed

Prioritize topics by potential traffic and conversion value.`,
      customizationFields: JSON.stringify([
        {
          name: "SERVICE_AREA",
          label: "Service Area",
          type: "text",
          default: "Dallas-Fort Worth",
          required: true,
        },
        {
          name: "TARGET_CITIES",
          label: "Target Cities",
          type: "text",
          default: "McKinney, Plano, Frisco, Allen, Prosper",
          required: true,
        },
      ]),
      tags: JSON.stringify([
        "seo",
        "content",
        "keywords",
        "local",
        "marketing",
        "blog",
      ]),
      isFeatured: true,
      isActive: true,
    },
    {
      title: "Lead Qualification & Customer Research",
      category: "lead_management",
      useCase: "Before major sales calls or estimates",
      promptText: `Help me qualify a potential roofing lead for Nimbus Roofing. Research:

**Lead Information:**
- Address: [ADDRESS]
- Property Type: [PROPERTY_TYPE]
- Stated Issue: [STATED_ISSUE]

**Research Needed:**
1. **Property Intelligence**:
   - Property value and square footage
   - Roof age (if available from public records)
   - Previous insurance claims for roof damage
   - HOA requirements or restrictions

2. **Storm History**:
   - Recent hail or wind events affecting this address
   - Insurance claim likelihood and potential payout
   - Neighboring properties with recent roof work

3. **Financial Indicators**:
   - Estimated household income for the area
   - Typical project budget range for this neighborhood
   - Financing options and approval likelihood
   - Property tax history (indicates financial stability)

4. **Decision-Making Timeline**:
   - Urgency indicators (active leaks, insurance deadlines)
   - Seasonal factors affecting project timing
   - Competitor activity in the neighborhood

Provide a lead score (1-10) and recommended approach strategy.`,
      customizationFields: JSON.stringify([
        {
          name: "ADDRESS",
          label: "Property Address",
          type: "text",
          required: true,
        },
        {
          name: "PROPERTY_TYPE",
          label: "Property Type",
          type: "select",
          options: ["Residential", "Commercial"],
          default: "Residential",
          required: true,
        },
        {
          name: "STATED_ISSUE",
          label: "Stated Issue",
          type: "text",
          required: true,
        },
      ]),
      tags: JSON.stringify([
        "leads",
        "qualification",
        "research",
        "sales",
        "property",
      ]),
      isFeatured: true,
      isActive: true,
    },
    {
      title: "Insurance Claim Support Research",
      category: "insurance_claims",
      useCase: "Supporting customers through insurance claim process",
      promptText: `I need to help a Nimbus Roofing customer navigate an insurance claim for storm damage. Research:

**Insurance Company:** [INSURANCE_COMPANY]
**Claim Type:** [CLAIM_TYPE]
**Location:** [LOCATION]

**Research Focus:**
1. **Insurance Company Profile**:
   - Reputation for roof damage claims in Texas
   - Average claim approval rate and payout amounts
   - Common denial reasons and how to avoid them
   - Preferred documentation and evidence requirements

2. **Claim Process**:
   - Typical timeline from filing to payout
   - Required documentation (photos, estimates, inspections)
   - When to request re-inspection or appeal
   - Adjuster negotiation strategies

3. **Legal & Regulatory**:
   - Texas insurance laws protecting homeowners
   - Statute of limitations for filing claims
   - When to involve a public adjuster or attorney
   - Recent court cases affecting roof claims in Texas

4. **Best Practices**:
   - How to document damage for maximum payout
   - What to say (and not say) to adjusters
   - Common mistakes that reduce claim value
   - How contractors can support the claim process

Provide a step-by-step action plan for the customer.`,
      customizationFields: JSON.stringify([
        {
          name: "INSURANCE_COMPANY",
          label: "Insurance Company",
          type: "text",
          required: true,
        },
        {
          name: "CLAIM_TYPE",
          label: "Claim Type",
          type: "select",
          options: ["Hail", "Wind", "Leak", "Other"],
          default: "Hail",
          required: true,
        },
        {
          name: "LOCATION",
          label: "Location (City, TX)",
          type: "text",
          required: true,
        },
      ]),
      tags: JSON.stringify([
        "insurance",
        "claims",
        "adjuster",
        "documentation",
        "support",
      ]),
      isFeatured: true,
      isActive: true,
    },
    {
      title: "Seasonal Business Planning",
      category: "business_strategy",
      useCase: "Quarterly planning and seasonal preparation",
      promptText: `Create a seasonal business strategy for Nimbus Roofing in the [SERVICE_AREA] area. Analyze:

**Current Season:** [SEASON]

1. **Weather Patterns & Opportunities**:
   - Historical storm data for this season in DFW
   - Hail season predictions and preparation
   - Temperature extremes affecting roofing work
   - Best weather windows for installations

2. **Seasonal Demand Trends**:
   - Peak months for roofing inquiries
   - Off-season marketing strategies
   - Emergency repair demand patterns
   - Preventive maintenance opportunities

3. **Marketing Calendar**:
   - Seasonal content topics and keywords
   - Holiday promotions and special offers
   - Community events and sponsorship opportunities
   - Social media campaigns aligned with weather

4. **Operational Planning**:
   - Crew scheduling and capacity planning
   - Material procurement and inventory
   - Equipment maintenance timing
   - Training and certification schedules

5. **Financial Forecasting**:
   - Expected revenue for the season
   - Cash flow management strategies
   - Pricing adjustments for demand
   - Budget allocation for marketing

Provide a 90-day action plan with weekly priorities.`,
      customizationFields: JSON.stringify([
        {
          name: "SEASON",
          label: "Current Season",
          type: "select",
          options: ["Spring", "Summer", "Fall", "Winter"],
          required: true,
        },
        {
          name: "SERVICE_AREA",
          label: "Service Area",
          type: "text",
          default: "Dallas-Fort Worth",
          required: true,
        },
      ]),
      tags: JSON.stringify([
        "strategy",
        "planning",
        "seasonal",
        "business",
        "operations",
      ]),
      isFeatured: false,
      isActive: true,
    },
    {
      title: "Customer Objection Handling Research",
      category: "sales_support",
      useCase: "Preparing responses to common objections",
      promptText: `I'm facing a common customer objection at Nimbus Roofing. Help me craft a response:

**Objection:** [OBJECTION]

**Research:**
1. **Root Cause Analysis**:
   - What's the real concern behind this objection?
   - Common misconceptions customers have
   - Psychological factors influencing the decision

2. **Competitor Comparison**:
   - How do competitors handle this objection?
   - What value propositions address this concern?
   - Industry best practices for overcoming this

3. **Proof Points & Evidence**:
   - Statistics that support our position
   - Case studies or testimonials addressing this
   - Third-party validation (warranties, certifications)
   - Cost-benefit analysis data

4. **Response Framework**:
   - Empathetic acknowledgment of the concern
   - Educational content to address misconceptions
   - Value demonstration (not just price defense)
   - Risk of inaction or delay
   - Next steps to move forward

Provide a word-for-word script I can use with the customer.`,
      customizationFields: JSON.stringify([
        {
          name: "OBJECTION",
          label: "Customer Objection",
          type: "textarea",
          required: true,
          placeholder:
            'e.g., "Your price is too high compared to competitors"',
        },
      ]),
      tags: JSON.stringify([
        "sales",
        "objections",
        "closing",
        "scripts",
        "training",
      ]),
      isFeatured: false,
      isActive: true,
    },
    {
      title: "Emergency Response & Crisis Management",
      category: "emergency_operations",
      useCase: "Immediate response to major storm events",
      promptText: `URGENT: Major storm event just hit the Dallas-Fort Worth area. Help Nimbus Roofing respond effectively:

**Storm Details:** [STORM_DETAILS]

**Immediate Research Needed:**
1. **Damage Assessment**:
   - Real-time reports from [AFFECTED_AREAS]
   - Social media mentions of roof damage
   - Emergency services activity and road closures
   - Power outages affecting response

2. **Emergency Response Plan**:
   - Priority areas for immediate canvassing
   - Emergency tarping and temporary repair protocols
   - 24/7 hotline messaging and staffing
   - Equipment and material needs for emergency repairs

3. **Communication Strategy**:
   - Social media posts for storm response
   - Email/SMS templates for existing customers
   - Press release for local media
   - Google My Business post about emergency services

4. **Regulatory & Safety**:
   - Emergency roofing permits and inspections
   - Safety protocols for storm damage work
   - Insurance claim filing deadlines
   - OSHA requirements for emergency repairs

5. **Competitive Intelligence**:
   - How are other roofers responding?
   - Price gouging concerns and ethical pricing
   - Scam warnings to share with customers
   - Partnership opportunities with restoration companies

Provide a 24-hour action plan with hour-by-hour priorities.`,
      customizationFields: JSON.stringify([
        {
          name: "STORM_DETAILS",
          label: "Storm Details",
          type: "textarea",
          required: true,
          placeholder: "e.g., 2-inch hail, 70mph winds, McKinney/Frisco area",
        },
        {
          name: "AFFECTED_AREAS",
          label: "Affected Areas",
          type: "text",
          required: true,
        },
      ]),
      tags: JSON.stringify([
        "emergency",
        "storm",
        "crisis",
        "response",
        "urgent",
        "disaster",
      ]),
      isFeatured: true,
      isActive: true,
    },
    {
      title: "Technology & Software Evaluation",
      category: "technology_research",
      useCase: "Evaluating new tools and software",
      promptText: `Nimbus Roofing is evaluating new technology to improve operations. Research:

**Technology Category:** [TECHNOLOGY_CATEGORY]

1. **Top Solutions** (2026):
   - Leading software/tools in this category
   - Pricing structures and ROI estimates
   - Integration capabilities with existing tools
   - User reviews and satisfaction ratings

2. **Feature Comparison**:
   - Must-have features for roofing contractors
   - AI/automation capabilities
   - Mobile app functionality
   - Reporting and analytics

3. **Implementation Considerations**:
   - Setup time and learning curve
   - Training requirements for team
   - Data migration from current systems
   - Customer support and onboarding

4. **ROI Analysis**:
   - Time savings per project
   - Error reduction and quality improvements
   - Customer satisfaction impact
   - Competitive advantage gained

5. **Roofing Industry Specific**:
   - Tools built specifically for roofers
   - Integration with material suppliers
   - Insurance claim documentation features
   - Aerial measurement and estimation

Recommend the top 3 solutions with pros/cons for each.`,
      customizationFields: JSON.stringify([
        {
          name: "TECHNOLOGY_CATEGORY",
          label: "Technology Category",
          type: "select",
          options: [
            "CRM",
            "Estimating Software",
            "Drone Inspection",
            "Project Management",
            "Other",
          ],
          required: true,
        },
      ]),
      tags: JSON.stringify([
        "technology",
        "software",
        "tools",
        "evaluation",
        "roi",
        "automation",
      ]),
      isFeatured: false,
      isActive: true,
    },
  ];

  await db.insert(promptLibrary).values(prompts);
  console.log(`Seeded ${prompts.length} prompts successfully`);
}
