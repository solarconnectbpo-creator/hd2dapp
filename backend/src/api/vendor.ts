/**
 * Vendor API endpoints
 * Allows vendors to deliver leads to the marketplace
 */

interface Env {
  DB: any;
  [key: string]: any;
}

interface Lead {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  notes?: string;
}

/**
 * POST /vendor/delivery
 * Vendors deliver leads to buyers via this endpoint
 *
 * Headers:
 * - Authorization: Bearer <vendor_api_key>
 * - x-company-id: <vendor_id>
 *
 * Body:
 * {
 *   "product_id": "product_123",
 *   "leads": [{ name, phone, email, city, notes }]
 * }
 */
export async function deliverLeads(req: Request, env: Env) {
  try {
    // Get vendor from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const apiKey = authHeader.slice(7);

    // Get vendor company ID from header
    const vendorId = req.headers.get("x-company-id");
    if (!vendorId) {
      return new Response(
        JSON.stringify({ error: "Missing x-company-id header" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify API key belongs to vendor
    const keyResult = await env.DB.prepare(
      "SELECT user_id FROM api_keys WHERE key = ? AND company_id = ? AND active = 1",
    )
      .bind(apiKey, vendorId)
      .first();

    if (!keyResult) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify vendor company exists and is_vendor = 1
    const vendor = await env.DB.prepare(
      "SELECT * FROM companies WHERE id = ? AND is_vendor = 1",
    )
      .bind(vendorId)
      .first();

    if (!vendor) {
      return new Response(JSON.stringify({ error: "Invalid vendor" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { product_id, leads } = body;

    if (!product_id || !Array.isArray(leads) || leads.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing product_id or leads array" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify product exists and belongs to vendor
    const product = await env.DB.prepare(
      "SELECT * FROM vendor_products WHERE id = ? AND vendor_id = ? AND active = 1",
    )
      .bind(product_id, vendorId)
      .first();

    if (!product) {
      return new Response(JSON.stringify({ error: "Invalid product" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process leads based on delivery method
    const deliveryLog: string[] = [];
    let successCount = 0;

    for (const lead of leads) {
      try {
        const leadId = crypto.randomUUID();

        // Insert lead into leads table
        await env.DB.prepare(
          `INSERT INTO leads (
            id, contact_name, phone, email, city, notes, 
            company_id, lead_type, quality_score, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            leadId,
            lead.name,
            lead.phone,
            lead.email || null,
            lead.city || null,
            lead.notes || null,
            vendorId,
            "vendor_delivered",
            0.5, // Default quality score for vendor leads
            "new",
            new Date().toISOString(),
          )
          .run();

        successCount++;
        deliveryLog.push(`Lead ${lead.phone} delivered successfully`);
      } catch (leadError) {
        console.error("Lead insertion error:", leadError);
        deliveryLog.push(`Lead ${lead.phone} failed: ${leadError}`);
      }
    }

    // Create order record
    const orderId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO vendor_product_orders (
        id, buyer_id, vendor_id, product_id, quantity, amount, status, delivery_log, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        orderId,
        vendorId,
        vendorId,
        product_id,
        successCount,
        0, // Amount depends on pricing model, handled by billing system
        "delivered",
        JSON.stringify(deliveryLog),
        new Date().toISOString(),
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        leadsDelivered: successCount,
        leadsTotal: leads.length,
        deliveryLog,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Vendor delivery error:", error);
    return new Response(JSON.stringify({ error: "Failed to deliver leads" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
