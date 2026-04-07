import { hashPassword } from "./password";
import type { AuthRole, AuthUser } from "./token";

export type DbUserRow = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  name: string;
  user_type: AuthRole;
  /** pending | approved | rejected */
  approval_status: string;
  /** unpaid | active | past_due | canceled */
  billing_status: string;
  stripe_customer_id: string | null;
  created_at: number;
  updated_at: number;
};

type D1 = any;

function now(): number {
  return Math.floor(Date.now() / 1000);
}

export async function findUserByEmail(db: D1, email: string): Promise<DbUserRow | null> {
  if (db == null) return null;
  const normalized = email.trim().toLowerCase();
  const row = await db
    .prepare(
      `SELECT id, email, password_hash, salt, name, user_type, approval_status, billing_status, stripe_customer_id, created_at, updated_at FROM users WHERE lower(email) = ? LIMIT 1`,
    )
    .bind(normalized)
    .first<DbUserRow>();
  return row ?? null;
}

export async function findUserById(db: D1, id: string): Promise<DbUserRow | null> {
  if (db == null) return null;
  const row = await db
    .prepare(
      `SELECT id, email, password_hash, salt, name, user_type, approval_status, billing_status, stripe_customer_id, created_at, updated_at FROM users WHERE id = ? LIMIT 1`,
    )
    .bind(id)
    .first<DbUserRow>();
  return row ?? null;
}

export async function insertUser(
  db: D1,
  args: {
    id: string;
    email: string;
    plainPassword: string;
    name: string;
    user_type: AuthRole;
    /** Defaults: admin-created accounts are approved + active. */
    approval_status?: string;
    billing_status?: string;
  },
): Promise<void> {
  const normalized = args.email.trim().toLowerCase();
  const t = now();
  const { saltHex, hashHex } = await hashPassword(args.plainPassword);
  await insertUserHashed(db, {
    id: args.id,
    email: normalized,
    passwordHash: hashHex,
    salt: saltHex,
    name: args.name.trim() || normalized.split("@")[0],
    user_type: args.user_type,
    approval_status: args.approval_status ?? "approved",
    billing_status: args.billing_status ?? "active",
    created_at: t,
    updated_at: t,
  });
}

/** Pre-hashed insert for transactional batch registration with org/rep rows. */
export async function insertUserHashed(
  db: D1,
  args: {
    id: string;
    email: string;
    passwordHash: string;
    salt: string;
    name: string;
    user_type: AuthRole;
    approval_status?: string;
    billing_status?: string;
    created_at: number;
    updated_at: number;
  },
): Promise<void> {
  const approval = args.approval_status ?? "approved";
  const billing = args.billing_status ?? "active";
  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, salt, name, user_type, approval_status, billing_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      args.id,
      args.email,
      args.passwordHash,
      args.salt,
      args.name,
      args.user_type,
      approval,
      billing,
      args.created_at,
      args.updated_at,
    )
    .run();
}

/** After a successful env-based login, persist the account in D1 so admin UI can manage it. */
export async function ensureDbUserFromEnvLogin(
  db: D1,
  user: AuthUser,
  plainPassword: string,
): Promise<void> {
  const existing = await findUserByEmail(db, user.email);
  if (existing) return;
  await insertUser(db, {
    id: user.id,
    email: user.email,
    plainPassword,
    name: user.name,
    user_type: user.user_type,
  });
}

export function rowToAuthUser(row: DbUserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    user_type: row.user_type,
  };
}

export async function listUsersPublic(db: D1): Promise<
  Array<{
    id: string;
    email: string;
    name: string;
    user_type: AuthRole;
    approval_status: string;
    billing_status: string;
    created_at: number;
    updated_at: number;
  }>
> {
  const res = (await db
    .prepare(
      `SELECT id, email, name, user_type, approval_status, billing_status, created_at, updated_at FROM users ORDER BY email ASC`,
    )
    .all()) as {
    results?: Array<{
      id: string;
      email: string;
      name: string;
      user_type: AuthRole;
      approval_status: string;
      billing_status: string;
      created_at: number;
      updated_at: number;
    }>;
  };
  return res.results ?? [];
}

export async function updateUserApprovalStatus(
  db: D1,
  id: string,
  approval_status: "pending" | "approved" | "rejected",
): Promise<boolean> {
  const row = await findUserById(db, id);
  if (!row) return false;
  const t = now();
  await db
    .prepare(`UPDATE users SET approval_status = ?, updated_at = ? WHERE id = ?`)
    .bind(approval_status, t, id)
    .run();
  return true;
}

export async function updateUserBillingAndStripe(
  db: D1,
  id: string,
  patch: { billing_status: string; stripe_customer_id?: string | null },
): Promise<boolean> {
  const row = await findUserById(db, id);
  if (!row) return false;
  const t = now();
  if (patch.stripe_customer_id !== undefined) {
    await db
      .prepare(`UPDATE users SET billing_status = ?, stripe_customer_id = ?, updated_at = ? WHERE id = ?`)
      .bind(patch.billing_status, patch.stripe_customer_id, t, id)
      .run();
  } else {
    await db.prepare(`UPDATE users SET billing_status = ?, updated_at = ? WHERE id = ?`).bind(patch.billing_status, t, id).run();
  }
  return true;
}

/** Metered Stripe Price id for SMS usage (optional); subscription item id stored on user when subscription includes this price. */
export async function getStripeSmsSubscriptionItem(db: D1, userId: string): Promise<string | null> {
  if (db == null) return null;
  const row = await db
    .prepare(`SELECT stripe_subscription_item_sms FROM users WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<{ stripe_subscription_item_sms: string | null }>();
  return row?.stripe_subscription_item_sms?.trim() || null;
}

export async function updateUserStripeSmsSubscriptionItem(db: D1, userId: string, itemId: string | null): Promise<void> {
  const t = now();
  await db
    .prepare(`UPDATE users SET stripe_subscription_item_sms = ?, updated_at = ? WHERE id = ?`)
    .bind(itemId, t, userId)
    .run();
}

export async function findUserIdByStripeCustomerId(db: D1, customerId: string): Promise<string | null> {
  if (db == null) return null;
  const c = customerId.trim();
  if (!c) return null;
  const row = await db
    .prepare(`SELECT id FROM users WHERE stripe_customer_id = ? LIMIT 1`)
    .bind(c)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function updateUserFields(
  db: D1,
  id: string,
  patch: { name?: string; user_type?: AuthRole; plainPassword?: string },
): Promise<boolean> {
  const row = await findUserById(db, id);
  if (!row) return false;
  const t = now();
  if (patch.plainPassword) {
    const { saltHex, hashHex } = await hashPassword(patch.plainPassword);
    await db
      .prepare(`UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?`)
      .bind(hashHex, saltHex, t, id)
      .run();
  }
  if (patch.name !== undefined) {
    await db.prepare(`UPDATE users SET name = ?, updated_at = ? WHERE id = ?`).bind(patch.name.trim(), t, id).run();
  }
  if (patch.user_type !== undefined) {
    await db
      .prepare(`UPDATE users SET user_type = ?, updated_at = ? WHERE id = ?`)
      .bind(patch.user_type, t, id)
      .run();
  }
  return true;
}

export async function deleteUserById(db: D1, id: string): Promise<boolean> {
  const res = (await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run()) as {
    meta?: { changes?: number };
  };
  return (res.meta?.changes ?? 0) > 0;
}
