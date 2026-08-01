/**
 * Lead marketplace appointment inventory (D1).
 *
 * Lifecycle: `available` → `reserved` (short TTL while Stripe Checkout is open) → `sold`.
 * Reservations carry `reserved_by` + `reserved_until` so a crash or abandoned checkout
 * frees the slot again via {@link releaseExpiredReservations} (called from the cron handler).
 *
 * Schema: migrations/0009_marketplace_appointments.sql
 */

type D1 = any;

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export type MarketplaceAppointmentStatus = "available" | "reserved" | "sold";

export type MarketplaceAppointmentRow = {
  id: string;
  status: MarketplaceAppointmentStatus;
  homeowner_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  scheduled_at: number | null;
  price_usd: number | null;
  notes: string | null;
  reserved_by: string | null;
  reserved_until: number | null;
  sold_to: string | null;
  sold_at: number | null;
  stripe_session_id: string | null;
  created_at: number;
  updated_at: number;
};

function placeholders(n: number): string {
  return new Array(n).fill("?").join(", ");
}

/** Appointments a buyer can see: available now, or already reserved/sold to them. */
export async function listAvailableAppointments(
  db: D1,
  opts: { state?: string | null; limit?: number; userId?: string | null } = {},
): Promise<MarketplaceAppointmentRow[]> {
  const limit = Math.min(Math.max(Number(opts.limit) || 100, 1), 500);
  const t = nowSec();
  const state = (opts.state || "").trim().toUpperCase();
  const userId = (opts.userId || "").trim();

  const where: string[] = [
    `(status = 'available'
       OR (status = 'reserved' AND (reserved_until IS NULL OR reserved_until < ?))
       OR (reserved_by = ?)
       OR (sold_to = ?))`,
  ];
  const binds: unknown[] = [t, userId, userId];

  if (state) {
    where.push(`upper(coalesce(state, '')) = ?`);
    binds.push(state);
  }

  const res = await db
    .prepare(
      `SELECT * FROM marketplace_appointments
        WHERE ${where.join(" AND ")}
        ORDER BY coalesce(scheduled_at, created_at) ASC
        LIMIT ?`,
    )
    .bind(...binds, limit)
    .all();
  return (res.results || []) as MarketplaceAppointmentRow[];
}

/** Appointments this user has paid for. */
export async function listPurchasedAppointments(db: D1, userId: string): Promise<MarketplaceAppointmentRow[]> {
  const res = await db
    .prepare(
      `SELECT * FROM marketplace_appointments
        WHERE status = 'sold' AND sold_to = ?
        ORDER BY coalesce(sold_at, updated_at) DESC
        LIMIT 500`,
    )
    .bind(userId)
    .all();
  return (res.results || []) as MarketplaceAppointmentRow[];
}

/**
 * Atomically hold every requested appointment for one buyer.
 *
 * The UPDATE only matches rows that are still free (available, or a reservation that
 * already lapsed, or this same buyer re-entering checkout), so two buyers racing on the
 * same slot cannot both succeed. If any id fails to lock we roll our own holds back and
 * report `ok: false` with the ids that were taken.
 */
export async function reserveAppointmentsForUser(
  db: D1,
  userId: string,
  appointmentIds: string[],
  reservedUntil: number,
): Promise<{ ok: boolean; unavailableIds: string[] }> {
  const ids = [...new Set(appointmentIds.map((s) => String(s || "").trim()).filter(Boolean))];
  if (ids.length === 0) return { ok: true, unavailableIds: [] };

  const t = nowSec();
  const locked: string[] = [];
  const unavailableIds: string[] = [];

  for (const id of ids) {
    const res = await db
      .prepare(
        `UPDATE marketplace_appointments
            SET status = 'reserved',
                reserved_by = ?,
                reserved_until = ?,
                updated_at = ?
          WHERE id = ?
            AND status != 'sold'
            AND (
                  status = 'available'
                  OR reserved_by = ?
                  OR reserved_until IS NULL
                  OR reserved_until < ?
                )`,
      )
      .bind(userId, reservedUntil, t, id, userId, t)
      .run();

    const changed = Number(res?.meta?.changes ?? res?.changes ?? 0);
    if (changed > 0) locked.push(id);
    else unavailableIds.push(id);
  }

  if (unavailableIds.length > 0) {
    // Partial hold is never useful — give back what we just took.
    if (locked.length > 0) await releaseReservationByUser(db, userId, locked);
    return { ok: false, unavailableIds };
  }

  return { ok: true, unavailableIds: [] };
}

/** Release holds this user owns (checkout cancelled or Stripe call failed). Never touches sold rows. */
export async function releaseReservationByUser(
  db: D1,
  userId: string,
  appointmentIds: string[],
): Promise<number> {
  const ids = [...new Set(appointmentIds.map((s) => String(s || "").trim()).filter(Boolean))];
  if (ids.length === 0) return 0;

  const t = nowSec();
  const res = await db
    .prepare(
      `UPDATE marketplace_appointments
          SET status = 'available',
              reserved_by = NULL,
              reserved_until = NULL,
              updated_at = ?
        WHERE reserved_by = ?
          AND status = 'reserved'
          AND id IN (${placeholders(ids.length)})`,
    )
    .bind(t, userId, ...ids)
    .run();

  return Number(res?.meta?.changes ?? res?.changes ?? 0);
}

/** Cron sweep: free reservations whose TTL lapsed. Returns rows released. */
export async function releaseExpiredReservations(db: D1): Promise<number> {
  const t = nowSec();
  const res = await db
    .prepare(
      `UPDATE marketplace_appointments
          SET status = 'available',
              reserved_by = NULL,
              reserved_until = NULL,
              updated_at = ?
        WHERE status = 'reserved'
          AND reserved_until IS NOT NULL
          AND reserved_until < ?`,
    )
    .bind(t, t)
    .run();

  return Number(res?.meta?.changes ?? res?.changes ?? 0);
}

/**
 * Mark appointments sold after `checkout.session.completed`.
 *
 * Idempotent: Stripe retries webhooks, so rows already sold under the same session id are
 * treated as success. Sold rows belonging to a *different* session/buyer are left alone and
 * reported so the caller can log the conflict.
 */
export async function finalizePurchaseFromStripe(
  db: D1,
  buyerUserId: string,
  appointmentIds: string[],
  stripeSessionId: string,
): Promise<{ ok: boolean; soldIds: string[]; conflictIds: string[] }> {
  const ids = [...new Set(appointmentIds.map((s) => String(s || "").trim()).filter(Boolean))];
  const soldIds: string[] = [];
  const conflictIds: string[] = [];
  if (ids.length === 0 || !buyerUserId) return { ok: false, soldIds, conflictIds };

  const t = nowSec();

  for (const id of ids) {
    const res = await db
      .prepare(
        `UPDATE marketplace_appointments
            SET status = 'sold',
                sold_to = ?,
                sold_at = ?,
                stripe_session_id = ?,
                reserved_by = NULL,
                reserved_until = NULL,
                updated_at = ?
          WHERE id = ?
            AND (status != 'sold' OR (sold_to = ? AND stripe_session_id = ?))`,
      )
      .bind(buyerUserId, t, stripeSessionId, t, id, buyerUserId, stripeSessionId)
      .run();

    const changed = Number(res?.meta?.changes ?? res?.changes ?? 0);
    if (changed > 0) {
      soldIds.push(id);
      continue;
    }

    // No row updated: either already finalized by an earlier webhook delivery, or taken.
    const row = await db
      .prepare(`SELECT sold_to, stripe_session_id FROM marketplace_appointments WHERE id = ?`)
      .bind(id)
      .first<{ sold_to: string | null; stripe_session_id: string | null }>();

    if (row && row.sold_to === buyerUserId && row.stripe_session_id === stripeSessionId) soldIds.push(id);
    else conflictIds.push(id);
  }

  return { ok: conflictIds.length === 0, soldIds, conflictIds };
}
