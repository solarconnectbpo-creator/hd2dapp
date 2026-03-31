import { invokeLLM } from "./_core/llm";
import { NIMBUS_KNOWLEDGE } from "./nimbusKnowledgeBase";

/**
 * Competitive Headline Generator
 * Mimics top organic and paid ads to create high-performing SEO headlines
 * Based on analysis of top competitors: Yelp, Thryv, CertainTeed, Owens Corning, etc.
 */

// Top performing headline patterns from competitor analysis
const COMPETITOR_PATTERNS = {
  paid_ads: [
    "Claim Your Free {service}",
    "The Ultimate 2025 Guide to {topic}",
    "{Brand}® {Service} - {Benefit}",
    "White Label {Service} Management",
    "Local {Service} Listings - Get Found Fast",
  ],
  organic: [
    "Cost To {Action} in {City}",
    "{Service} Help Starts Here",
    "{Action} Your {Asset} Now",
    "{City}'s Trusted {Service} Experts",
    "Professional {Service} | {Benefit}",
  ],
  urgency: [
    "{Service} - 24/7 Emergency Response",
    "Same-Day {Service} in {City}",
    "Free {Service} Inspection This Month",
    "{Service} Starting at ${price}",
    "Limited Time: {Offer}",
  ],
  authority: [
    "Licensed & Insured {Service} Contractor",
    "{Number}+ Years Serving {City}",
    "Certified {Brand} Preferred Contractor",
    "A+ BBB Rated {Service} Company",
    "{Number}+ 5-Star Reviews",
  ],
};

// SEO-optimized headline formulas
const HEADLINE_FORMULAS = [
  // Question-based (high engagement)
  "How Much Does {service} Cost in {city}? [2025 Guide]",
  "Is Your {asset} Damaged by {problem}? Free Inspection",
  "When Should You {action}? Expert Advice",
  
  // Problem-solution (high intent)
  "{Problem} in {City}? We Fix It Fast",
  "Emergency {Service} - {City} | 24/7 Response",
  "{Service} After {Event} - Same Day Service",
  
  // Local dominance (geographic SEO)
  "{Service} {City} TX | Licensed & Insured",
  "Best {Service} Company in {City} [2025]",
  "{City} {Service} Experts | Free Estimates",
  
  // Benefit-driven (conversion focused)
  "Save ${amount}+ on {Service} with {Company}",
  "{Service} That Lasts {years}+ Years",
  "Get {Benefit} with Professional {Service}",
  
  // Trust-building (credibility)
  "{Number}+ {City} Homeowners Trust {Company}",
  "Why {City} Chooses {Company} for {Service}",
  "{Company}: {City}'s #1 Rated {Service} Company",
];

interface HeadlineGenerationOptions {
  service?: string;
  city?: string;
  problem?: string;
  benefit?: string;
  count?: number;
  includeYear?: boolean;
}

/**
 * Generate competitive headlines based on top performer patterns
 */
export async function generateCompetitiveHeadlines(
  options: HeadlineGenerationOptions
): Promise<string[]> {
  const {
    service = "Roofing",
    city = "McKinney",
    problem = "Storm Damage",
    benefit = "Insurance Claim Assistance",
    count = 10,
    includeYear = true,
  } = options;

  const year = new Date().getFullYear();
  
  // Build context from knowledge base
  const context = `
You are an expert SEO copywriter analyzing top-performing roofing ads.

COMPETITOR ANALYSIS:
Paid Ads: Yelp ("Claim Your Free Yelp Listing"), Thryv ("Business Software"), Semrush ("Local Business Listings")
Organic: CertainTeed ("Replace Your Roof Now"), Owens Corning ("Roofing Help Starts Here"), T-Rock Roofing, Greystone Roofing

WINNING PATTERNS:
1. Urgency: "Now", "Free", "24/7", "Same-Day"
2. Authority: "Licensed", "Certified", "Trusted", "Expert"
3. Local: City name + service + benefit
4. Year: Include "${year}" for freshness
5. Numbers: Specific prices, years, reviews
6. Questions: "How Much", "When Should", "Is Your"

NIMBUS ROOFING DATA:
- Service Area: ${city}, TX and 83+ DFW cities
- Specialties: ${service}, ${problem} restoration, insurance claims
- Unique Value: AI-powered roofing agent, $4,200+ average claim value increase
- Certifications: Owens Corning Preferred Contractor, Licensed Texas Adjuster
- Experience: 10+ years serving ${city}

TASK: Generate ${count} high-performing SEO headlines that:
1. Mimic the patterns of top organic and paid ads
2. Include specific ${city} geographic targeting
3. Highlight ${service} and ${problem} keywords
4. Use power words: Free, Certified, Expert, Trusted, Professional
5. Include ${year} where appropriate for freshness
6. Are 50-70 characters (optimal for Google SERPs)
7. Have clear CTAs or benefits

Return ONLY the headlines, one per line, no numbering or explanation.
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an expert SEO copywriter who writes headlines that rank #1 on Google.",
        },
        {
          role: "user",
          content: context,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    const headlines = content
      .split("\n")
      .map((h) => h.trim())
      .filter((h) => h.length > 0 && h.length <= 100)
      .slice(0, count);

    return headlines;
  } catch (error) {
    console.error("[Competitive Headlines] Generation failed:", error);
    // Fallback to template-based headlines
    return generateFallbackHeadlines(options);
  }
}

/**
 * Generate fallback headlines using templates (no AI required)
 */
function generateFallbackHeadlines(
  options: HeadlineGenerationOptions
): string[] {
  const {
    service = "Roofing",
    city = "McKinney",
    problem = "Storm Damage",
    count = 10,
  } = options;

  const year = new Date().getFullYear();

  const templates = [
    `${service} ${city} TX | Licensed & Insured [${year}]`,
    `Emergency ${problem} Repair ${city} - 24/7 Response`,
    `How Much Does ${service} Cost in ${city}? [${year} Guide]`,
    `${city}'s Trusted ${service} Experts | Free Estimates`,
    `${problem} ${service} ${city} | Same-Day Service`,
    `Best ${service} Company in ${city} [${year}]`,
    `Professional ${service} ${city} TX | 10+ Years Experience`,
    `${service} After ${problem} - ${city} Specialists`,
    `Free ${service} Inspection ${city} | Call Today`,
    `${city} ${service} Contractor | A+ BBB Rated`,
  ];

  return templates.slice(0, count);
}

/**
 * Optimize existing headline for better SEO performance
 */
export async function optimizeHeadline(
  originalHeadline: string,
  targetKeyword: string,
  city: string = "McKinney"
): Promise<string> {
  const context = `
Optimize this headline for SEO while maintaining its meaning:

ORIGINAL: "${originalHeadline}"
TARGET KEYWORD: "${targetKeyword}"
CITY: ${city}

REQUIREMENTS:
1. Include the target keyword naturally
2. Keep it 50-70 characters
3. Add the city name if missing
4. Include current year if relevant
5. Use power words: Free, Expert, Certified, Professional, Trusted
6. Make it click-worthy and benefit-driven

Return ONLY the optimized headline, nothing else.
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are an SEO expert optimizing headlines for maximum click-through rate.",
        },
        {
          role: "user",
          content: context,
        },
      ],
    });

    return response.choices[0]?.message?.content?.trim() || originalHeadline;
  } catch (error) {
    console.error("[Headline Optimization] Failed:", error);
    return originalHeadline;
  }
}

/**
 * Generate A/B test variants of a headline
 */
export async function generateHeadlineVariants(
  baseHeadline: string,
  variantCount: number = 3
): Promise<string[]> {
  const context = `
Create ${variantCount} A/B test variants of this headline:

BASE HEADLINE: "${baseHeadline}"

Each variant should:
1. Test different angles (urgency vs authority vs benefit)
2. Maintain the same core message
3. Be 50-70 characters
4. Use different power words
5. Be optimized for click-through rate

Return ONLY the variant headlines, one per line.
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a conversion optimization expert creating A/B test variants.",
        },
        {
          role: "user",
          content: context,
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "";
    return content
      .split("\n")
      .map((h) => h.trim())
      .filter((h) => h.length > 0)
      .slice(0, variantCount);
  } catch (error) {
    console.error("[Headline Variants] Generation failed:", error);
    return [baseHeadline];
  }
}
