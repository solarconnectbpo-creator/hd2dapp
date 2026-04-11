type D1 = any;

export async function sha256HexOfString(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function deletePasswordResetTokensForUser(db: D1, userId: string): Promise<void> {
  if (db == null) return;
  await db.prepare(`DELETE FROM password_reset_tokens WHERE user_id = ?`).bind(userId).run();
}

export async function insertPasswordResetToken(
  db: D1,
  args: { id: string; userId: string; tokenHash: string; expiresAt: number; createdAt: number },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(args.id, args.userId, args.tokenHash, args.expiresAt, args.createdAt)
    .run();
}

export async function findPasswordResetByTokenHash(
  db: D1,
  tokenHash: string,
): Promise<{ id: string; user_id: string; expires_at: number } | null> {
  if (db == null) return null;
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      `SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token_hash = ? AND expires_at > ? LIMIT 1`,
    )
    .bind(tokenHash, now)
    .first<{ id: string; user_id: string; expires_at: number }>();
  return row ?? null;
}

export async function deletePasswordResetTokenById(db: D1, id: string): Promise<void> {
  if (db == null) return;
  await db.prepare(`DELETE FROM password_reset_tokens WHERE id = ?`).bind(id).run();
}
