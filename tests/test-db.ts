/**
 * An in-memory Postgres (PGlite) with the real migrations applied, standing in
 * for src/db in tests:
 *
 *   vi.mock("@/db", () => import("../../tests/test-db").then((m) => m.createTestDb()));
 */
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle({ client, schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, pool: client };
}

export async function resetDb() {
  const { db } = (await import("@/db")) as unknown as Awaited<ReturnType<typeof createTestDb>>;
  await db.execute(
    sql`truncate audit_log, loan_entries, lenders, transactions, categories, member_ledger, members restart identity cascade`,
  );
}
