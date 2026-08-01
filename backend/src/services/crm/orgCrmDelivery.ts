/**
 * Push a purchased lead / contact into the buyer's CRM:
 * 1) Org-configured webhook URL (preferred)
 * 2) Org GHL Private Integration token + location
 * 3) Platform GHL secrets (fallback)
 */

type D1 = any;

export type CrmLeadPayload = {
  source: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  notes?: string | null;
  scheduledAt?: number | null;
  appointmentId?: string | null;
  stripeSessionId?: string | null;
};

export type OrgCrmSettings = {
  orgId: string;
  crmWebhookUrl: string | null;
  ghlApiToken: string | null;
  ghlLocationId: string | null;
};

const GHL_BASE = "https://services.leadconnectorhq.com";

export async function loadOrgCrmSettings(db: D1, userId: string): Promise<OrgCrmSettings | null> {
  const mem = await db
    .prepare(`SELECT org_id FROM org_members WHERE user_id = ? LIMIT 1`)
    .bind(userId)
    .first<{ org_id: string }>();
  if (!mem?.org_id) return null;
  const profile = await db
    .prepare(
      `SELECT crm_webhook_url, ghl_api_token, ghl_location_id FROM org_profiles WHERE org_id = ?`,
    )
    .bind(mem.org_id)
    .first<{
      crm_webhook_url: string | null;
      ghl_api_token: string | null;
      ghl_location_id: string | null;
    }>();
  return {
    orgId: mem.org_id,
    crmWebhookUrl: profile?.crm_webhook_url?.trim() || null,
    ghlApiToken: profile?.ghl_api_token?.trim() || null,
    ghlLocationId: profile?.ghl_location_id?.trim() || null,
  };
}

async function pushWebhook(url: string, payload: CrmLeadPayload): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ event: "hd2d.lead.purchased", lead: payload }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `Webhook HTTP ${res.status}: ${t.slice(0, 180)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "webhook_failed" };
  }
}

async function pushGhl(
  token: string,
  locationId: string,
  lead: CrmLeadPayload,
): Promise<{ ok: boolean; error?: string; contactId?: string }> {
  const name = (lead.name || "").trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || "";
  const phone = (lead.phone || "").trim();
  const email = (lead.email || "").trim();
  if (!phone && !email) {
    return { ok: false, error: "Lead needs phone or email for GHL." };
  }
  const body: Record<string, unknown> = {
    locationId,
    firstName: firstName.slice(0, 80) || undefined,
    lastName: lastName.slice(0, 80) || undefined,
    phone: phone || undefined,
    email: email || undefined,
    address1: (lead.address || "").trim().slice(0, 200) || undefined,
    city: (lead.city || "").trim().slice(0, 80) || undefined,
    state: (lead.state || "").trim().slice(0, 40) || undefined,
    postalCode: (lead.zip || "").trim().slice(0, 20) || undefined,
    source: (lead.source || "HD2D Buy Leads").slice(0, 100),
    tags: ["hd2d-purchased-lead"],
  };
  try {
    const res = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        Version: "2021-07-28",
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json: { contact?: { id?: string }; id?: string; message?: string } = {};
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return { ok: false, error: json.message || text.slice(0, 180) || `GHL HTTP ${res.status}` };
    }
    const contactId = json.contact?.id || json.id;
    const note = [lead.notes, lead.scheduledAt ? `Appt unix: ${lead.scheduledAt}` : "", lead.appointmentId ? `HD2D id: ${lead.appointmentId}` : ""]
      .filter(Boolean)
      .join("\n")
      .trim();
    if (contactId && note) {
      await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({ body: note.slice(0, 5000) }),
      }).catch(() => null);
    }
    return { ok: true, contactId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "ghl_failed" };
  }
}

export type CrmEnv = {
  GHL_PRIVATE_INTEGRATION_TOKEN?: string;
  GHL_LOCATION_ID?: string;
};

/** Deliver one lead using org settings, then platform GHL fallback. */
export async function deliverLeadToBuyerCrm(
  db: D1,
  buyerUserId: string,
  lead: CrmLeadPayload,
  env: CrmEnv,
): Promise<{ ok: boolean; channel?: "webhook" | "ghl_org" | "ghl_platform"; error?: string }> {
  const settings = await loadOrgCrmSettings(db, buyerUserId);
  if (settings?.crmWebhookUrl) {
    const r = await pushWebhook(settings.crmWebhookUrl, lead);
    if (r.ok) return { ok: true, channel: "webhook" };
    // fall through to GHL if webhook fails
    if (!settings.ghlApiToken && !(env.GHL_PRIVATE_INTEGRATION_TOKEN || "").trim()) {
      return { ok: false, error: r.error };
    }
  }
  if (settings?.ghlApiToken && settings.ghlLocationId) {
    const r = await pushGhl(settings.ghlApiToken, settings.ghlLocationId, lead);
    if (r.ok) return { ok: true, channel: "ghl_org" };
    return { ok: false, error: r.error };
  }
  const platToken = (env.GHL_PRIVATE_INTEGRATION_TOKEN || "").trim();
  const platLoc = (env.GHL_LOCATION_ID || "").trim();
  if (platToken && platLoc) {
    const r = await pushGhl(platToken, platLoc, lead);
    if (r.ok) return { ok: true, channel: "ghl_platform" };
    return { ok: false, error: r.error };
  }
  return {
    ok: false,
    error: "No CRM delivery configured. Set a webhook or GHL keys under Buy leads → CRM delivery.",
  };
}
