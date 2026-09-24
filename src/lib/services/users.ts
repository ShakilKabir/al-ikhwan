/**
 * Accounts: logging in, the one-time setup of the first admin, and admins
 * managing users. Password hashes never leave this file or reach the history.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { deleteUserSessions, type SessionUser } from "@/lib/auth/sessions";
import type { NewUserInput, UserUpdateInput } from "@/lib/validation";
import {
  missing,
  pgErrorCode,
  recordAudit,
  ServiceError,
  UNIQUE_VIOLATION,
  type Tx,
} from "./common";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

/**
 * SHA-256 of the one-time code that creates the first admin account (on /setup).
 * Only used while there are no users at all.
 */
const SETUP_CODE_SHA256 = "b1fd1a89893c642b0cc41b7e5f0d6a883e44dae8dd961d78a6a6104ed37bc253";

/** What the history may record about a user: never the password hash. */
function snapshot(user: User) {
  const { passwordHash: _hash, failedLogins: _f, lockedUntil: _l, ...rest } = user;
  return rest;
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}

function duplicateUsername(error: unknown, username: string): never {
  if (pgErrorCode(error) === UNIQUE_VIOLATION) {
    throw new ServiceError(`The username "${username}" is already taken.`);
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Logging in
// ---------------------------------------------------------------------------

let dummyHash: Promise<string> | undefined;

/** Checks a username and password. Five wrong passwords lock the account for 15 minutes. */
export async function authenticate(username: string, password: string): Promise<SessionUser> {
  const wrong = new ServiceError("Wrong username or password.");
  const [user] = await db.select().from(users).where(eq(users.username, username.trim().toLowerCase()));

  if (!user || !user.isActive) {
    // Take as long as a real check, so response times don't reveal which usernames exist.
    dummyHash ??= hashPassword("not a real password");
    await verifyPassword(password, await dummyHash);
    throw wrong;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new ServiceError(`Too many wrong passwords. Try again after ${LOCK_MINUTES} minutes.`);
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    const failedLogins = user.failedLogins + 1;
    const locked = failedLogins >= MAX_FAILED_LOGINS;
    await db
      .update(users)
      .set({
        failedLogins: locked ? 0 : failedLogins,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
      })
      .where(eq(users.id, user.id));
    throw locked ? new ServiceError(`Too many wrong passwords. Try again after ${LOCK_MINUTES} minutes.`) : wrong;
  }

  await db
    .update(users)
    .set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));
  return toSessionUser(user);
}

// ---------------------------------------------------------------------------
// First admin
// ---------------------------------------------------------------------------

export async function hasUsers() {
  const [{ total }] = await db.select({ total: count() }).from(users);
  return total > 0;
}

function setupCodeMatches(code: string) {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const given = createHash("sha256").update(normalized).digest();
  return timingSafeEqual(given, Buffer.from(SETUP_CODE_SHA256, "hex"));
}

type FirstAdminInput = Pick<NewUserInput, "name" | "username" | "password">;

/** Creates the first account (an admin) with the setup code. Works only while there are no users. */
export async function setupFirstAdmin(code: string, input: FirstAdminInput): Promise<SessionUser> {
  if (!setupCodeMatches(code)) throw new ServiceError("That setup code isn't right.");
  return createFirstAdmin(input);
}

/** Use setupFirstAdmin(); this is separate so tests don't need the real setup code. */
export async function createFirstAdmin(input: FirstAdminInput): Promise<SessionUser> {
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    // Serialise concurrent attempts so only one first admin can be created.
    await tx.execute(sql`lock table users in exclusive mode`);
    const [{ total }] = await tx.select({ total: count() }).from(users);
    if (total > 0) throw new ServiceError("Setup is already done. Log in instead.");
    const [user] = await tx
      .insert(users)
      .values({
        username: input.username,
        name: input.name,
        passwordHash,
        role: "admin",
        mustChangePassword: false,
        lastLoginAt: new Date(),
      })
      .returning();
    await recordAudit(tx, {
      actor: user.name,
      action: "create",
      entity: "user",
      entityId: user.id,
      summary: `Set up the site; ${user.name} (${user.username}) is the first admin`,
      after: snapshot(user),
    });
    return toSessionUser(user);
  });
}

// ---------------------------------------------------------------------------
// Admins managing users
// ---------------------------------------------------------------------------

export async function listUsers() {
  return db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(users.name);
}

export async function getUser(id: number) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ? snapshot(user) : undefined;
}

/** A new account must choose their own password when they first log in. */
export async function createUser(input: NewUserInput, actor: string) {
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ username: input.username, name: input.name, role: input.role, passwordHash })
        .returning();
      await recordAudit(tx, {
        actor,
        action: "create",
        entity: "user",
        entityId: user.id,
        summary: `Added ${user.role} ${user.name} (${user.username})`,
        after: snapshot(user),
      });
      return snapshot(user);
    });
  } catch (error) {
    duplicateUsername(error, input.username);
  }
}

async function otherActiveAdmins(tx: Tx, userId: number) {
  const [{ total }] = await tx
    .select({ total: count() })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, userId)));
  return total;
}

export async function updateUser(id: number, input: UserUpdateInput, actor: SessionUser) {
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(users).where(eq(users.id, id));
      if (!before) missing("User");
      if (id === actor.id && !input.isActive) {
        throw new ServiceError("You can't deactivate your own account.");
      }
      const staysAdmin = input.role === "admin" && input.isActive;
      if (before.role === "admin" && !staysAdmin && (await otherActiveAdmins(tx, id)) === 0) {
        throw new ServiceError("The site needs at least one active admin.");
      }
      const [after] = await tx.update(users).set(input).where(eq(users.id, id)).returning();
      if (!after.isActive) await deleteUserSessions(id, undefined, tx);
      await recordAudit(tx, {
        actor: actor.name,
        action: "update",
        entity: "user",
        entityId: id,
        summary: `Edited user ${after.name} (${after.username})${after.isActive ? "" : ", deactivated"}`,
        before: snapshot(before),
        after: snapshot(after),
      });
      return snapshot(after);
    });
  } catch (error) {
    duplicateUsername(error, input.username);
  }
}

/** Sets a temporary password; the user must replace it when they next log in. */
export async function resetPassword(id: number, temporaryPassword: string, actor: string) {
  const passwordHash = await hashPassword(temporaryPassword);
  await db.transaction(async (tx) => {
    const [user] = await tx
      .update(users)
      .set({ passwordHash, mustChangePassword: true, failedLogins: 0, lockedUntil: null })
      .where(eq(users.id, id))
      .returning();
    if (!user) missing("User");
    await deleteUserSessions(id, undefined, tx);
    await recordAudit(tx, {
      actor,
      action: "update",
      entity: "user",
      entityId: id,
      summary: `Reset the password of ${user.name} (${user.username})`,
    });
  });
}

/** A user changing their own password. Logs them out on their other devices. */
export async function changeOwnPassword(
  user: SessionUser,
  currentPassword: string,
  newPassword: string,
  currentSessionId: string,
) {
  const [stored] = await db.select().from(users).where(eq(users.id, user.id));
  if (!stored || !(await verifyPassword(currentPassword, stored.passwordHash))) {
    throw new ServiceError("Your current password isn't right.");
  }
  const passwordHash = await hashPassword(newPassword);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, mustChangePassword: false }).where(eq(users.id, user.id));
    await deleteUserSessions(user.id, currentSessionId, tx);
    await recordAudit(tx, {
      actor: user.name,
      action: "update",
      entity: "user",
      entityId: user.id,
      summary: `${user.name} changed their password`,
    });
  });
}
