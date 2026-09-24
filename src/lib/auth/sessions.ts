/**
 * Database sessions. The browser keeps a random token in a cookie; the
 * database keeps only its SHA-256, so a leaked database can't be used to log in.
 * A session lasts 30 days from the last visit (renewed once half has passed).
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import type { Tx } from "@/lib/services/common";

const DAY = 24 * 60 * 60 * 1000;
const SESSION_LIFETIME = 30 * DAY;

/** What the rest of the app knows about the logged-in user. */
export type SessionUser = Pick<User, "id" | "username" | "name" | "role" | "mustChangePassword">;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_LIFETIME),
  });
  // Tidy up: remove this user's sessions that have run out.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return token;
}

/** The user behind a cookie token, or null if the session is unknown, expired or the account is disabled. */
export async function validateSessionToken(
  token: string,
): Promise<{ sessionId: string; user: SessionUser } | null> {
  const sessionId = hashToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        username: users.username,
        name: users.name,
        role: users.role,
        mustChangePassword: users.mustChangePassword,
        isActive: users.isActive,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId));
  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt.getTime() <= now || !row.user.isActive) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    return null;
  }
  if (row.expiresAt.getTime() - now < SESSION_LIFETIME / 2) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(now + SESSION_LIFETIME) })
      .where(eq(sessions.id, sessionId));
  }
  const { isActive: _isActive, ...user } = row.user;
  return { sessionId, user };
}

export async function deleteSession(sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/** Logs a user out everywhere, optionally keeping the session they are using now. */
export async function deleteUserSessions(userId: number, keepSessionId?: string, tx: Tx | typeof db = db) {
  await tx
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), keepSessionId ? ne(sessions.id, keepSessionId) : undefined));
}
