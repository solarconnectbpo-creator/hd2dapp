import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import {
  listAvailableAppointments,
  listPurchasedAppointments,
  releaseReservationByUser,
  type MarketplaceAppointmentRow,
} from "../marketplace/marketplaceDb";
import { deliverLeadToBuyerCrm } from "../services/crm/orgCrmDelivery";
import { emitSmsEvent, resolveOrgForCompanyUser, type SmsWorkflowEnv } from "../sms/smsWorkflowEngine";
import { ensureSmsContactForOrg } from "../sms/smsDb";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

type MarketplaceEnv = AuthEnv & {
  GHL_PRIVATE_INTEGRATION_TOKEN?: string;
  GHL_LOCATION_ID?: string;
};

/** Hide homeowner contact details until the slot is paid for. */
function toPublicAppointment(row: MarketplaceAppointmentRow, viewerId: string) {
  const owned = row.sold_to === viewerId;
  return {
    id: row.id,
    status: row.status,
    city: row.city,
    state: row.state,
    zip: row.zip,
    scheduledAt: row.scheduled_at,
    priceUsd: row.price_usd,
    reservedUntil: row.reserved_by === viewerId ? row.reserved_until : null,
    owned,
    homeownerName: owned ? row.homeowner_name : null,
    address: owned ? row.address : null,
    notes: owned ? row.notes : null,
    phone: owned ? row.phone : null,
    email: owned ? row.email : null,
  };
}

/**
 * Routes under `/api/leads/marketplace`.
 *
 * Returns `null` when the path is not handled here so index.ts can fall through
 * to its 404 handling.
 */
export async function handleMarketplaceRoutes(
  request: Request,
  env: MarketplaceEnv,
  path: string,
  corsHeaders: Record<string, string>,
): Promise<Response | null> {
  const j = jsonHeaders(corsHeaders);
  const base = "/api/leads/marketplace";
  const p = path.replace(/\/+$/, "") || "/";
  if (p !== base && !p.startsWith(`${base}/`)) return null;

  const payload = await getBearerPayload(request, env);
  if (!payload) {
    return new Response(JSON.stringify({ success: false, error: "Sign in required." }), { status: 401, headers: j });
  }

  const rest = p.slice(base.length).replace(/^\//, "");
  const segments = rest.split("/").filter(Boolean);

  try {
    // GET /api/leads/marketplace?state=MO&limit=100
    if (segments.length === 0 && request.method === "GET") {
      const url = new URL(request.url);
      const appointments = await listAvailableAppointments(env.DB, {
        state: url.searchParams.get("state"),
        limit: Number(url.searchParams.get("limit")) || 100,
        userId: payload.sub,
      });
      return new Response(
        JSON.stringify({
          success: true,
          appointments: appointments.map((r) => toPublicAppointment(r, payload.sub)),
        }),
        { status: 200, headers: j },
      );
    }

    // GET /api/leads/marketplace/purchased — full details for slots this user bought.
    if (segments.length === 1 && segments[0] === "purchased" && request.method === "GET") {
      const rows = await listPurchasedAppointments(env.DB, payload.sub);
      return new Response(
        JSON.stringify({
          success: true,
          appointments: rows.map((r) => toPublicAppointment(r, payload.sub)),
        }),
        { status: 200, headers: j },
      );
    }

    // POST /api/leads/marketplace/release — body { appointmentIds: string[] }
    if (segments.length === 1 && segments[0] === "release" && request.method === "POST") {
      let body: { appointmentIds?: unknown } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
          status: 400,
          headers: j,
        });
      }
      const ids = Array.isArray(body.appointmentIds)
        ? body.appointmentIds.map((x) => String(x || "").trim()).filter(Boolean)
        : [];
      if (ids.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "appointmentIds is required." }), {
          status: 400,
          headers: j,
        });
      }
      const released = await releaseReservationByUser(env.DB, payload.sub, ids);
      return new Response(JSON.stringify({ success: true, released }), { status: 200, headers: j });
    }

    // POST /api/leads/marketplace/push-crm — body { appointmentIds: string[] }
    if (segments.length === 1 && segments[0] === "push-crm" && request.method === "POST") {
      let body: { appointmentIds?: unknown } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
          status: 400,
          headers: j,
        });
      }
      const ids = Array.isArray(body.appointmentIds)
        ? body.appointmentIds.map((x) => String(x || "").trim()).filter(Boolean)
        : [];
      if (ids.length === 0) {
        return new Response(JSON.stringify({ success: false, error: "appointmentIds is required." }), {
          status: 400,
          headers: j,
        });
      }
      const purchased = await listPurchasedAppointments(env.DB, payload.sub);
      const byId = new Map(purchased.map((r) => [r.id, r]));
      const results: Array<{ id: string; ok: boolean; channel?: string; error?: string }> = [];
      for (const id of ids) {
        const row = byId.get(id);
        if (!row) {
          results.push({ id, ok: false, error: "Not found in your purchases." });
          continue;
        }
        const del = await deliverLeadToBuyerCrm(
          env.DB,
          payload.sub,
          {
            source: "HD2D Buy Leads",
            name: row.homeowner_name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            city: row.city,
            state: row.state,
            zip: row.zip,
            notes: row.notes,
            scheduledAt: row.scheduled_at,
            appointmentId: row.id,
            stripeSessionId: row.stripe_session_id,
          },
          env,
        );
        results.push({
          id,
          ok: del.ok,
          channel: del.channel,
          error: del.error,
        });
      }
      const okCount = results.filter((r) => r.ok).length;
      return new Response(JSON.stringify({ success: okCount > 0, pushed: okCount, results }), {
        status: 200,
        headers: j,
      });
    }

    // POST /api/leads/marketplace/to-sms — body { appointmentId, startWorkflow?: boolean, event?: string }
    if (segments.length === 1 && segments[0] === "to-sms" && request.method === "POST") {
      let body: { appointmentId?: string; startWorkflow?: boolean; event?: string } = {};
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
          status: 400,
          headers: j,
        });
      }
      const appointmentId = String(body.appointmentId || "").trim();
      if (!appointmentId) {
        return new Response(JSON.stringify({ success: false, error: "appointmentId is required." }), {
          status: 400,
          headers: j,
        });
      }
      const purchased = await listPurchasedAppointments(env.DB, payload.sub);
      const row = purchased.find((r) => r.id === appointmentId);
      if (!row) {
        return new Response(JSON.stringify({ success: false, error: "Not found in your purchases." }), {
          status: 404,
          headers: j,
        });
      }
      const phone = (row.phone || "").trim();
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: "This lead has no phone number on file." }),
          { status: 400, headers: j },
        );
      }
      const oid = await resolveOrgForCompanyUser(env.DB, payload.sub, payload.user_type);
      if (!oid) {
        return new Response(
          JSON.stringify({ success: false, error: "Join a company org to use SMS follow-up." }),
          { status: 403, headers: j },
        );
      }
      const t = Math.floor(Date.now() / 1000);
      const contactId = await ensureSmsContactForOrg(env.DB, {
        orgId: oid,
        phoneE164: phone,
        name: row.homeowner_name || "",
        address: [row.address, row.city, row.state, row.zip].filter(Boolean).join(", "),
        t,
      });
      let started = 0;
      if (body.startWorkflow !== false) {
        const wfEnv: SmsWorkflowEnv = {
          DB: env.DB,
          TELNYX_API_KEY: (env as { TELNYX_API_KEY?: string }).TELNYX_API_KEY,
          TELNYX_FROM_NUMBER: (env as { TELNYX_FROM_NUMBER?: string }).TELNYX_FROM_NUMBER,
          TWILIO_ACCOUNT_SID: (env as { TWILIO_ACCOUNT_SID?: string }).TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: (env as { TWILIO_AUTH_TOKEN?: string }).TWILIO_AUTH_TOKEN,
          TWILIO_FROM_NUMBER: (env as { TWILIO_FROM_NUMBER?: string }).TWILIO_FROM_NUMBER,
          STRIPE_SECRET_KEY: (env as { STRIPE_SECRET_KEY?: string }).STRIPE_SECRET_KEY,
          AUTH_SKIP_ACCESS_GATE: (env as { AUTH_SKIP_ACCESS_GATE?: string }).AUTH_SKIP_ACCESS_GATE,
        };
        const ev = await emitSmsEvent(
          wfEnv,
          oid,
          (body.event || "lead.created").trim() || "lead.created",
          contactId,
        );
        started = ev.started;
      }
      return new Response(
        JSON.stringify({ success: true, contact_id: contactId, started }),
        { status: 200, headers: j },
      );
    }

    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  } catch (e) {
    console.error("[marketplace] route error:", e);
    return new Response(JSON.stringify({ success: false, error: "Marketplace is unavailable." }), {
      status: 500,
      headers: j,
    });
  }
}
