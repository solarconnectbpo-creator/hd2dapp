/**
 * Company Middleware
 * Handles multi-tenant company context validation
 */

interface Env {
  DB: any;
  [key: string]: any;
}

interface Company {
  id: string;
  name: string;
  industry?: string;
  logo_url?: string;
  created_at?: string;
}

/**
 * Get company from request header
 * Returns null if no company_id header provided
 */
export async function requireCompany(
  req: Request,
  env: Env,
): Promise<Company | null> {
  try {
    const companyId = req.headers.get("x-company-id");

    if (!companyId) {
      return null;
    }

    const company = await env.DB.prepare("SELECT * FROM companies WHERE id = ?")
      .bind(companyId)
      .first();

    return company || null;
  } catch (error) {
    console.error("Company middleware error:", error);
    return null;
  }
}

/**
 * Verify user belongs to company
 */
export async function verifyUserInCompany(
  env: Env,
  userId: string,
  companyId: string,
): Promise<boolean> {
  try {
    const result = await env.DB.prepare(
      "SELECT id FROM users WHERE id = ? AND company_id = ?",
    )
      .bind(userId, companyId)
      .first();

    return !!result;
  } catch (error) {
    console.error("User company verification error:", error);
    return false;
  }
}

/**
 * Create new company
 */
export async function createCompany(
  env: Env,
  name: string,
  industry?: string,
  logoUrl?: string,
): Promise<Company> {
  const id = crypto.randomUUID();

  await env.DB.prepare(
    "INSERT INTO companies (id, name, industry, logo_url) VALUES (?, ?, ?, ?)",
  )
    .bind(id, name, industry || null, logoUrl || null)
    .run();

  return {
    id,
    name,
    industry,
    logo_url: logoUrl,
  };
}
