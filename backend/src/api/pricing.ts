/**
 * Dynamic Pricing API
 * AI-driven price optimization for vendor products
 */

import { suggestNewPrice } from "../ai/pricingModel";
import { requirePermission } from "../middleware/rbac";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  [key: string]: any;
}

/**
 * POST /api/admin/pricing/recalculate
 * Recalculate pricing for all active vendor products using AI
 */
export async function recalculatePricing(req: Request, env: Env, user: User) {
  try {
    // Check permission
    const allowed = await requirePermission(env, user.id, "admin.pricing.manage");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get all active vendor products
    const productsResult = await env.DB.prepare(
      "SELECT * FROM vendor_products WHERE active = 1"
    ).all();

    const products = productsResult.results || [];
    const results: any[] = [];

    for (const product of products) {
      try {
        // Get product statistics
        const stats = await env.DB.prepare(
          `SELECT 
            COUNT(*) AS total_orders,
            SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
           FROM vendor_product_orders
           WHERE product_id = ?`
        ).bind(product.id).first();

        // Get AI recommendation
        const recommendation = await suggestNewPrice(env, product, stats || {});

        // Update product if price changed
        if (recommendation.suggestedPrice !== product.price) {
          await env.DB.prepare(
            "UPDATE vendor_products SET price = ? WHERE id = ?"
          ).bind(recommendation.suggestedPrice, product.id).run();

          // Log pricing history
          await env.DB.prepare(
            `INSERT INTO vendor_pricing_history (id, product_id, old_price, new_price, reason, strategy)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).bind(
            crypto.randomUUID(),
            product.id,
            product.price,
            recommendation.suggestedPrice,
            recommendation.reason,
            recommendation.strategy
          ).run();
        }

        results.push({
          productId: product.id,
          productName: product.name,
          oldPrice: product.price,
          newPrice: recommendation.suggestedPrice,
          strategy: recommendation.strategy,
          reason: recommendation.reason
        });
      } catch (error) {
        console.error(`Error pricing product ${product.id}:`, error);
        results.push({
          productId: product.id,
          productName: product.name,
          error: "Failed to recalculate"
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Pricing recalculation error:", error);
    return new Response(JSON.stringify({ error: "Failed to recalculate pricing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
