import { getDb } from "./db";
import { apiKeys, apiRequestLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * API Key Management Service
 * 
 * Handles generation, validation, and management of API keys for external integrations
 */

/**
 * Generate a new API key
 */
export async function generateApiKey(params: {
  name: string;
  description?: string;
  permissions?: string[];
  rateLimit?: number;
  expiresAt?: Date;
  createdBy?: string;
  ipWhitelist?: string[];
}): Promise<{ apiKey: string; id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Generate random API key (32 bytes = 64 hex characters)
  const apiKey = `nmb_${crypto.randomBytes(32).toString("hex")}`;
  
  // Hash the key for storage (we only store the hash, not the actual key)
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Insert into database
  const result = await db.insert(apiKeys).values({
    key: keyHash,
    name: params.name,
    description: params.description || null,
    permissions: params.permissions ? JSON.stringify(params.permissions) : JSON.stringify(["leads:create"]),
    rateLimit: params.rateLimit || 1000,
    isActive: true,
    expiresAt: params.expiresAt || null,
    createdBy: params.createdBy || null,
    ipWhitelist: params.ipWhitelist ? JSON.stringify(params.ipWhitelist) : null,
    totalRequests: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`[API Key] Generated new key: ${params.name} (ID: ${result[0].insertId})`);

  // Return the actual key (this is the ONLY time we return it!)
  return {
    apiKey, // Return unhashed key to user
    id: result[0].insertId,
  };
}

/**
 * Validate an API key
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  keyData?: any;
  error?: string;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Hash the provided key
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    // Look up the key
    const keys = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.key, keyHash))
      .limit(1);

    if (keys.length === 0) {
      return { valid: false, error: "Invalid API key" };
    }

    const keyData = keys[0];

    // Check if key is active
    if (!keyData.isActive) {
      return { valid: false, error: "API key is inactive" };
    }

    // Check expiration
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      return { valid: false, error: "API key has expired" };
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({
        lastUsedAt: new Date(),
        totalRequests: (keyData.totalRequests || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyData.id));

    return {
      valid: true,
      keyData: {
        id: keyData.id,
        name: keyData.name,
        permissions: keyData.permissions ? JSON.parse(keyData.permissions) : [],
        rateLimit: keyData.rateLimit,
        ipWhitelist: keyData.ipWhitelist ? JSON.parse(keyData.ipWhitelist) : null,
      },
    };
  } catch (error) {
    console.error("[API Key] Validation error:", error);
    return { valid: false, error: "Validation failed" };
  }
}

/**
 * Check if API key has permission
 */
export function hasPermission(keyData: any, permission: string): boolean {
  if (!keyData.permissions) return false;
  return keyData.permissions.includes(permission) || keyData.permissions.includes("*");
}

/**
 * Check rate limit
 */
export async function checkRateLimit(keyId: number, limit: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    // Count requests in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const logs = await db
      .select()
      .from(apiRequestLogs)
      .where(eq(apiRequestLogs.apiKeyId, keyId));

    const recentRequests = logs.filter(
      (log) => new Date(log.createdAt) > oneHourAgo
    );

    return recentRequests.length < limit;
  } catch (error) {
    console.error("[API Key] Rate limit check error:", error);
    return false;
  }
}

/**
 * Log API request
 */
export async function logApiRequest(params: {
  apiKeyId: number;
  endpoint: string;
  method: string;
  requestBody?: any;
  responseStatus: number;
  responseBody?: any;
  ipAddress?: string;
  userAgent?: string;
  duration?: number;
  error?: string;
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(apiRequestLogs).values({
      apiKeyId: params.apiKeyId,
      endpoint: params.endpoint,
      method: params.method,
      requestBody: params.requestBody ? JSON.stringify(params.requestBody) : null,
      responseStatus: params.responseStatus,
      responseBody: params.responseBody ? JSON.stringify(params.responseBody) : null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      duration: params.duration || null,
      error: params.error || null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[API Key] Failed to log request:", error);
  }
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(keyId: number): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;

    await db
      .update(apiKeys)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, keyId));

    console.log(`[API Key] Revoked key ID: ${keyId}`);
    return true;
  } catch (error) {
    console.error("[API Key] Failed to revoke key:", error);
    return false;
  }
}

/**
 * List all API keys (admin only)
 */
export async function listApiKeys(): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const keys = await db.select().from(apiKeys);

    // Don't return the actual key hash
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      description: k.description,
      permissions: k.permissions ? JSON.parse(k.permissions) : [],
      rateLimit: k.rateLimit,
      isActive: k.isActive,
      expiresAt: k.expiresAt,
      lastUsedAt: k.lastUsedAt,
      totalRequests: k.totalRequests,
      createdBy: k.createdBy,
      createdAt: k.createdAt,
    }));
  } catch (error) {
    console.error("[API Key] Failed to list keys:", error);
    return [];
  }
}
