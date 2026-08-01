import type { AuthEnv } from "./authRoutes";
import { getBearerPayload } from "./authRoutes";
import {
  listAvailableAppointments,
  listPurchasedAppointments,
  releaseReservationByUser,
  type MarketplaceAppointmentRow,
} from "../marketplace/marketplaceDb";

function jsonHeaders(cors: Record<string, string>) {
  return { ...cors, "Content-Type": "application/json" };
}

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
  env: AuthEnv,
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

    return new Response(JSON.stringify({ success: false, error: "Not found." }), { status: 404, headers: j });
  } catch (e) {
    console.error("[marketplace] route error:", e);
    return new Response(JSON.stringify({ success: false, error: "Marketplace is unavailable." }), {
      status: 500,
      headers: j,
    });
  }
}
