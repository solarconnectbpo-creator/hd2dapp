/**
 * POST /api/ghl/submit-lead — create GoHighLevel contact + optional note (summary).
 * Requires wrangler secrets: GHL_PRIVATE_INTEGRATION_TOKEN, GHL_LOCATION_ID
 *
 * @see https://marketplace.gohighlevel.com/docs
 */

interface Env {
  GHL_PRIVATE_INTEGRATION_TOKEN?: string;
  GHL_LOCATION_ID?: string;
}

const GHL_BASE = "https://services.leadconnectorhq.com";

type CustomFieldInput = { id: string; value: string };

type Body = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  tags?: string[];
  /** Long text stored as a contact note after create */
  summaryNote?: string;
  /** Optional GHL custom fields [{ id, value }] */
  customFields?: CustomFieldInput[];
};

function trim(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

export async function handleGhlSubmitLead(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = env.GHL_PRIVATE_INTEGRATION_TOKEN?.trim();
  const locationId = env.GHL_LOCATION_ID?.trim();
  if (!token || !locationId) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "GHL is not configured. Set GHL_PRIVATE_INTEGRATION_TOKEN and GHL_LOCATION_ID on the Worker.",
      }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const email = trim(body.email, 320);
  const phone = trim(body.phone, 40);
  if (!email && !phone) {
    return new Response(
      JSON.stringify({ success: false, error: "Provide at least email or phone for the GHL contact." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const customFields: { id: string; value: string }[] = [];
  if (Array.isArray(body.customFields)) {
    for (const cf of body.customFields) {
      if (!cf || typeof cf.id !== "string") continue;
      const id = cf.id.trim();
      const value = typeof cf.value === "string" ? cf.value.trim().slice(0, 8000) : "";
      if (id && value) customFields.push({ id, value });
    }
  }

  const payload: Record<string, unknown> = {
    locationId,
    firstName: trim(body.firstName, 120) || undefined,
    lastName: trim(body.lastName, 120) || undefined,
    email: email || undefined,
    phone: phone || undefined,
    companyName: trim(body.companyName, 200) || undefined,
    address1: trim(body.address1, 300) || undefined,
    city: trim(body.city, 120) || undefined,
    state: trim(body.state, 80) || undefined,
    postalCode: trim(body.postalCode, 32) || undefined,
    country: trim(body.country, 80) || "US",
    source: trim(body.source, 120) || "Roofing estimator",
    tags: Array.isArray(body.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
      : undefined,
  };

  if (customFields.length) payload.customFields = customFields;

  const contactRes = await fetch(`${GHL_BASE}/contacts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const contactText = await contactRes.text();
  let contactJson: { contact?: { id?: string }; message?: string; meta?: unknown };
  try {
    contactJson = JSON.parse(contactText) as typeof contactJson;
  } catch {
    contactJson = {};
  }

  if (!contactRes.ok) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `GHL contact create failed (${contactRes.status})`,
        detail: contactText.slice(0, 800),
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const contactId =
    contactJson.contact?.id ??
    (typeof (contactJson as { id?: unknown }).id === "string"
      ? ((contactJson as { id: string }).id as string)
      : undefined);
  const summaryNote = trim(body.summaryNote, 12000);

  if (contactId && summaryNote) {
    const noteRes = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ body: summaryNote }),
    });
    if (!noteRes.ok) {
      const noteErr = await noteRes.text();
      return new Response(
        JSON.stringify({
          success: true,
          data: { contactId, noteWarning: `Note failed: ${noteRes.status} ${noteErr.slice(0, 300)}` },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: { contactId: contactId ?? null },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
