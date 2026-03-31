import type { Express, Request, Response, NextFunction } from "express";
import { getDb } from "./db";
import { leads } from "../drizzle/schema";
import { validateApiKey, hasPermission, checkRateLimit, logApiRequest } from "./apiKeyService";
import { sendUrgentLeadSms } from "./smsService";
import { notifyOwner } from "./_core/notification";

/**
 * Public REST API
 * 
 * Provides public endpoints for external integrations
 * Requires API key authentication
 */

/**
 * API Key authentication middleware
 */
async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  try {
    // Get API key from header
    const apiKey = req.headers["x-api-key"] as string;
    
    if (!apiKey) {
      await logApiRequest({
        apiKeyId: 0,
        endpoint: req.path,
        method: req.method,
        responseStatus: 401,
        responseBody: { error: "API key required" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        duration: Date.now() - startTime,
        error: "Missing API key",
      });
      
      return res.status(401).json({
        error: "API key required",
        message: "Please provide an API key in the X-API-Key header",
      });
    }

    // Validate API key
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      await logApiRequest({
        apiKeyId: 0,
        endpoint: req.path,
        method: req.method,
        responseStatus: 401,
        responseBody: { error: validation.error },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        duration: Date.now() - startTime,
        error: validation.error,
      });
      
      return res.status(401).json({
        error: "Invalid API key",
        message: validation.error,
      });
    }

    // Check rate limit
    const withinLimit = await checkRateLimit(
      validation.keyData.id,
      validation.keyData.rateLimit
    );
    
    if (!withinLimit) {
      await logApiRequest({
        apiKeyId: validation.keyData.id,
        endpoint: req.path,
        method: req.method,
        responseStatus: 429,
        responseBody: { error: "Rate limit exceeded" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        duration: Date.now() - startTime,
        error: "Rate limit exceeded",
      });
      
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: `Maximum ${validation.keyData.rateLimit} requests per hour`,
      });
    }

    // Attach key data to request
    (req as any).apiKey = validation.keyData;
    (req as any).apiStartTime = startTime;
    
    next();
  } catch (error) {
    console.error("[Public API] Authentication error:", error);
    res.status(500).json({
      error: "Authentication failed",
      message: "Internal server error",
    });
  }
}

/**
 * Setup public API routes
 */
export function setupPublicApi(app: Express) {
  console.log("[Public API] Setting up routes...");

  // Health check (no auth required)
  app.get("/api/v1/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  });

  // Create lead endpoint
  app.post("/api/v1/leads", authenticateApiKey, async (req: Request, res: Response) => {
    const startTime = (req as any).apiStartTime;
    const apiKey = (req as any).apiKey;

    try {
      // Check permission
      if (!hasPermission(apiKey, "leads:create")) {
        await logApiRequest({
          apiKeyId: apiKey.id,
          endpoint: req.path,
          method: req.method,
          requestBody: req.body,
          responseStatus: 403,
          responseBody: { error: "Permission denied" },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          duration: Date.now() - startTime,
          error: "Insufficient permissions",
        });

        return res.status(403).json({
          error: "Permission denied",
          message: "API key does not have leads:create permission",
        });
      }

      // Validate required fields
      const { name, phone, email, serviceType, urgency, message, address, city, zipCode } = req.body;

      if (!name || !phone) {
        await logApiRequest({
          apiKeyId: apiKey.id,
          endpoint: req.path,
          method: req.method,
          requestBody: req.body,
          responseStatus: 400,
          responseBody: { error: "Missing required fields" },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
          duration: Date.now() - startTime,
          error: "Validation failed",
        });

        return res.status(400).json({
          error: "Validation failed",
          message: "Name and phone are required fields",
          required: ["name", "phone"],
          optional: ["email", "serviceType", "urgency", "message", "address", "city", "zipCode"],
        });
      }

      // Create lead in database
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const result = await db.insert(leads).values({
        name,
        email: email || null,
        phone,
        address: address || null,
        city: city || null,
        zipCode: zipCode || null,
        serviceType: serviceType || null,
        urgency: urgency || "medium",
        message: message || null,
        source: `API: ${apiKey.name}`,
        status: "new",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const leadId = result[0].insertId;

      // Send notifications for urgent leads
      if (urgency === "high" || urgency === "emergency") {
        try {
          await sendUrgentLeadSms({
            name,
            phone,
            urgency,
            message: message || "No message provided",
          });
          await notifyOwner({
            title: "Urgent Lead from API",
            content: `${name} (${phone}) - ${urgency}`,
          });
        } catch (error) {
          console.error("[Public API] Failed to send urgent notifications:", error);
        }
      }

      // Log successful request
      await logApiRequest({
        apiKeyId: apiKey.id,
        endpoint: req.path,
        method: req.method,
        requestBody: req.body,
        responseStatus: 201,
        responseBody: { leadId },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        duration: Date.now() - startTime,
      });

      console.log(`[Public API] Lead created: ${leadId} (${name}) via ${apiKey.name}`);

      res.status(201).json({
        success: true,
        leadId,
        message: "Lead created successfully",
      });
    } catch (error) {
      console.error("[Public API] Lead creation error:", error);

      await logApiRequest({
        apiKeyId: apiKey.id,
        endpoint: req.path,
        method: req.method,
        requestBody: req.body,
        responseStatus: 500,
        responseBody: { error: "Internal server error" },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        duration: Date.now() - startTime,
        error: String(error),
      });

      res.status(500).json({
        error: "Internal server error",
        message: "Failed to create lead",
      });
    }
  });

  // Get API key info (for testing)
  app.get("/api/v1/key-info", authenticateApiKey, async (req: Request, res: Response) => {
    const apiKey = (req as any).apiKey;
    
    res.json({
      name: apiKey.name,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
    });
  });

  console.log("[Public API] Routes registered:");
  console.log("  GET  /api/v1/health");
  console.log("  POST /api/v1/leads");
  console.log("  GET  /api/v1/key-info");
}
