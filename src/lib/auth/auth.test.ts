import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../../tests/test-db";
import { db } from "@/db";
import { auditLog, sessions, users } from "@/db/schema";
import { ServiceError } from "@/lib/services/common";
import {
  authenticate,
  changeOwnPassword,
  createFirstAdmin,
  createUser,
  hasUsers,
  resetPassword,
  setupFirstAdmin,
  updateUser,
} from "@/lib/services/users";
import { hashPassword, temporaryPassword, verifyPassword } from "./password";
import { createSession, validateSessionToken } from "./sessions";

vi.mock("@/db", () => import("../../../tests/test-db").then((m) => m.createTestDb()));

beforeEach(resetDb);

const admin = () => createFirstAdmin({ name: "Admin", username: "admin", password: "correct horse" });

describe("passwords", () => {
  it("verifies only the right password, without storing it", async () => {
    const hash = await hashPassword("s3cret pass");
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(hash).not.toContain("s3cret");
    expect(await verifyPassword("s3cret pass", hash)).toBe(true);
    expect(await verifyPassword("s3cret pasS", hash)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("makes readable temporary passwords", () => {
    expect(temporaryPassword()).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(temporaryPassword()).not.toBe(temporaryPassword());
  });
});

describe("sessions", () => {
  it("finds the user for a token, and forgets expired sessions", async () => {
    const user = await admin();
    const token = await createSession(user.id);
    expect((await validateSessionToken(token))?.user).toMatchObject({ username: "admin", role: "admin" });
    expect(await validateSessionToken("made-up-token")).toBeNull();

    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validateSessionToken(token)).toBeNull();
    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it("extends a session that is past half its life", async () => {
    const user = await admin();
    const token = await createSession(user.id);
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await db.update(sessions).set({ expiresAt: soon });
    await validateSessionToken(token);
    const [session] = await db.select().from(sessions);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
  });

  it("ends sessions of deactivated users", async () => {
    const user = await admin();
    const token = await createSession(user.id);
    await db.update(users).set({ isActive: false }).where(eq(users.id, user.id));
    expect(await validateSessionToken(token)).toBeNull();
  });
});

describe("first admin", () => {
  it("needs the setup code and only works once", async () => {
    expect(await hasUsers()).toBe(false);
    await expect(
      setupFirstAdmin("WRONG-CODE", { name: "X", username: "x", password: "whatever1" }),
    ).rejects.toThrow("setup code");
    const user = await admin();
    expect(user).toMatchObject({ role: "admin", mustChangePassword: false });
    await expect(admin()).rejects.toThrow("already done");
  });
});

describe("logging in", () => {
  it("accepts the right password, case-insensitive username", async () => {
    await admin();
    expect(await authenticate("  ADMIN ", "correct horse")).toMatchObject({ username: "admin" });
  });

  it("gives the same message for unknown users and wrong passwords", async () => {
    await admin();
    await expect(authenticate("nobody", "x")).rejects.toThrow("Wrong username or password");
    await expect(authenticate("admin", "wrong")).rejects.toThrow("Wrong username or password");
  });

  it("locks the account after five wrong passwords", async () => {
    await admin();
    for (let i = 0; i < 4; i++) await expect(authenticate("admin", "wrong")).rejects.toThrow("Wrong");
    await expect(authenticate("admin", "wrong")).rejects.toThrow("Too many wrong passwords");
    await expect(authenticate("admin", "correct horse")).rejects.toThrow("Too many wrong passwords");

    await db.update(users).set({ lockedUntil: new Date(Date.now() - 1000) });
    expect(await authenticate("admin", "correct horse")).toMatchObject({ username: "admin" });
  });
});

describe("managing users", () => {
  it("adds editors who must choose their own password", async () => {
    const me = await admin();
    const editor = await createUser({ name: "Rana", username: "rana", role: "editor", password: "temp-pass-1" }, me.name);
    expect(editor).toMatchObject({ role: "editor", mustChangePassword: true });
    expect(editor).not.toHaveProperty("passwordHash");
    await expect(
      createUser({ name: "Other", username: "rana", role: "editor", password: "temp-pass-2" }, me.name),
    ).rejects.toThrow("already taken");

    // Nothing in the history reveals a password hash.
    const history = JSON.stringify(await db.select().from(auditLog));
    expect(history).not.toContain("scrypt");
  });

  it("keeps at least one active admin, and admins can't lock themselves out", async () => {
    const me = await admin();
    await expect(updateUser(me.id, { name: "Admin", username: "admin", role: "admin", isActive: false }, me)).rejects.toThrow(
      "your own account",
    );
    await expect(updateUser(me.id, { name: "Admin", username: "admin", role: "editor", isActive: true }, me)).rejects.toThrow(
      "at least one active admin",
    );
    const other = await createUser({ name: "B", username: "b", role: "admin", password: "temp-pass-1" }, me.name);
    await expect(
      updateUser(me.id, { name: "Admin", username: "admin", role: "editor", isActive: true }, me),
    ).resolves.toMatchObject({ role: "editor" });
    expect(other.role).toBe("admin");
  });

  it("deactivating or resetting a user logs them out", async () => {
    const me = await admin();
    const editor = await createUser({ name: "Rana", username: "rana", role: "editor", password: "temp-pass-1" }, me.name);
    const token = await createSession(editor.id);
    await resetPassword(editor.id, "new-temp-pass", me.name);
    expect(await validateSessionToken(token)).toBeNull();
    expect(await authenticate("rana", "new-temp-pass")).toMatchObject({ mustChangePassword: true });

    const token2 = await createSession(editor.id);
    await updateUser(editor.id, { name: "Rana", username: "rana", role: "editor", isActive: false }, me);
    expect(await validateSessionToken(token2)).toBeNull();
    await expect(authenticate("rana", "new-temp-pass")).rejects.toThrow(ServiceError);
  });

  it("changing your own password needs the current one and keeps only this session", async () => {
    const me = await admin();
    const here = await validateSessionToken(await createSession(me.id));
    const elsewhere = await createSession(me.id);
    await expect(changeOwnPassword(me, "wrong", "brand new pass", here!.sessionId)).rejects.toThrow("current password");
    await changeOwnPassword(me, "correct horse", "brand new pass", here!.sessionId);
    expect(await validateSessionToken(elsewhere)).toBeNull();
    expect(await db.select().from(sessions)).toHaveLength(1);
    expect(await authenticate("admin", "brand new pass")).toMatchObject({ mustChangePassword: false });
  });
});
