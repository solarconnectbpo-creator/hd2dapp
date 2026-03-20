/**
 * Events API endpoints
 * Full Eventbrite-style event management with ticketing and RSVP
 */

import { generateEventDescription } from "../ai/eventModel";
import { generateQR } from "../utils/qr";
import { createICS } from "../utils/ics";

interface Env {
  DB: any;
  OPENAI_API_KEY: string;
  [key: string]: any;
}

interface User {
  id: string;
  email: string;
  role?: string;
  [key: string]: any;
}

/**
 * POST /api/events/create
 * Create a new event (admin only)
 */
export async function createEvent(req: Request, env: Env, user: User) {
  try {
    if (!user || user.role !== "admin") {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    const body = await req.json();
    const id = crypto.randomUUID();

    if (!body.title || !body.date) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // AI generate description if not provided
    const ai = await generateEventDescription(env, body.title);

    await env.DB.prepare(
      `INSERT INTO events (id, title, description, cover_url, location, date, start_time, end_time, capacity, organizer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.title,
      body.description || ai.description,
      body.coverUrl || "",
      body.location || "",
      body.date,
      body.startTime || "09:00",
      body.endTime || "17:00",
      body.capacity || 0,
      user.id
    ).run();

    return new Response(JSON.stringify({
      id,
      description: ai.description,
      tags: ai.tags,
      valueProps: ai.valueProps
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Create event error:", error);
    return new Response(JSON.stringify({ error: "Failed to create event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/events
 * List all events
 */
export async function getEvents(req: Request, env: Env, user: User) {
  try {
    const events = await env.DB.prepare(
      "SELECT * FROM events ORDER BY date ASC"
    ).all();

    return new Response(JSON.stringify(events.results || []), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get events error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/events/:id
 * Get event details
 */
export async function getEvent(req: Request, env: Env, user: User, eventId: string) {
  try {
    const event = await env.DB.prepare(
      "SELECT * FROM events WHERE id = ?"
    ).bind(eventId).first();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify(event), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Get event error:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch event" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/events/rsvp
 * RSVP to an event
 */
export async function rsvpEvent(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { eventId, status } = body;

    if (!eventId || !status) {
      return new Response(JSON.stringify({ error: "Missing eventId or status" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const id = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO event_rsvp (id, event_id, user_id, status)
       VALUES (?, ?, ?, ?)`
    ).bind(id, eventId, user.id, status).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("RSVP error:", error);
    return new Response(JSON.stringify({ error: "Failed to RSVP" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/events/ticket
 * Purchase or claim event ticket
 */
export async function claimTicket(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { eventId, type } = body;

    if (!eventId || !type) {
      return new Response(JSON.stringify({ error: "Missing eventId or type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ticketId = crypto.randomUUID();
    const qr = generateQR(ticketId);

    await env.DB.prepare(
      `INSERT INTO event_tickets (id, event_id, user_id, type, qr_code)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(ticketId, eventId, user.id, type, qr).run();

    return new Response(JSON.stringify({
      ticketId,
      qr,
      type
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Claim ticket error:", error);
    return new Response(JSON.stringify({ error: "Failed to claim ticket" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * POST /api/events/checkin
 * Check in an attendee (scan QR code)
 */
export async function checkInTicket(req: Request, env: Env, user: User) {
  try {
    const body = await req.json();
    const { ticketId } = body;

    if (!ticketId) {
      return new Response(JSON.stringify({ error: "Missing ticketId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await env.DB.prepare(
      "UPDATE event_tickets SET checked_in = 1 WHERE id = ?"
    ).bind(ticketId).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Check-in error:", error);
    return new Response(JSON.stringify({ error: "Failed to check in" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

/**
 * GET /api/events/:id/calendar
 * Download calendar invite (ICS format)
 */
export async function downloadEventCalendar(req: Request, env: Env, user: User, eventId: string) {
  try {
    const event = await env.DB.prepare(
      "SELECT * FROM events WHERE id = ?"
    ).bind(eventId).first();

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const ics = createICS({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time
    });

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar",
        "Content-Disposition": `attachment; filename="${event.title}.ics"`
      }
    });
  } catch (error) {
    console.error("Download calendar error:", error);
    return new Response(JSON.stringify({ error: "Failed to download calendar" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
