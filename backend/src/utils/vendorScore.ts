/**
 * Vendor Reputation Score
 * Calculates vendor quality score based on historical leads
 */

interface VendorScore {
  score: number;
  totalLeads: number;
  avgQuality: number;
  riskLevel: "low" | "medium" | "high";
}

interface Env {
  DB: any;
  [key: string]: any;
}

export async function getVendorScore(
  env: Env,
  vendorId: string,
): Promise<VendorScore> {
  try {
    // Get vendor's lead verification stats
    const stats = await env.DB.prepare(
      `SELECT 
        COUNT(*) as totalLeads,
        AVG(quality_score) as avgQuality,
        AVG(risk_score) as avgRisk
       FROM lead_verification 
       WHERE vendor_id = ?`,
    )
      .bind(vendorId)
      .first();

    const totalLeads = stats?.totalLeads || 0;
    const avgQuality = stats?.avgQuality || 50;
    const avgRisk = stats?.avgRisk || 50;

    // Calculate vendor score (0-100)
    let score = 50; // Default baseline

    if (totalLeads > 0) {
      // Quality increases score
      score = avgQuality * 0.7 + (100 - avgRisk) * 0.3;
    }

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" = "medium";
    if (avgRisk < 30) riskLevel = "low";
    if (avgRisk > 70) riskLevel = "high";

    return {
      score: Math.round(score),
      totalLeads,
      avgQuality: Math.round(avgQuality),
      riskLevel,
    };
  } catch (error) {
    console.error("Vendor score error:", error);
    return {
      score: 50,
      totalLeads: 0,
      avgQuality: 50,
      riskLevel: "medium",
    };
  }
}
