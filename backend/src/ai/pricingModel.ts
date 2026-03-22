/**
 * Price Optimization Engine
 * AI-driven dynamic pricing for vendor products
 */

import { runAI } from "../utils/ai";

interface Env {
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface Product {
  id: string;
  name: string;
  price: number;
  type: string;
  [key: string]: any;
}

interface Stats {
  total_orders?: number;
  delivered?: number;
  failed?: number;
  refunds?: number;
  [key: string]: any;
}

interface PricingRecommendation {
  suggestedPrice: number;
  strategy: "raise" | "lower" | "keep";
  reason: string;
}

export async function suggestNewPrice(
  env: Env,
  product: Product,
  stats: Stats,
): Promise<PricingRecommendation> {
  try {
    const prompt = `
You are PriceOptGPT, an AI that optimizes pricing for lead products.

Analyze the following product and performance metrics, then suggest an optimal price.

Consider:
- Current price and market positioning
- Delivery/success rate
- Refund rate
- Customer demand
- Product quality

Return ONLY valid JSON with:
- "suggestedPrice": number (suggested new price)
- "strategy": "raise" | "lower" | "keep"
- "reason": string (brief explanation)

Product:
${JSON.stringify(product)}

Performance Stats:
${JSON.stringify(stats)}

Return ONLY valid JSON, no markdown.`;

    const text = await runAI(env, prompt);
    const parsed = JSON.parse(text);

    return {
      suggestedPrice: parsed.suggestedPrice || product.price,
      strategy: parsed.strategy || "keep",
      reason: parsed.reason || "No change recommended",
    };
  } catch (error) {
    console.error("Pricing model error:", error);
    return {
      suggestedPrice: product.price,
      strategy: "keep",
      reason: "AI parsing error",
    };
  }
}
