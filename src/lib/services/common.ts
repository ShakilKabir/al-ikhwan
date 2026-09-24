import { db } from "@/db";
import { auditLog } from "@/db/schema";

/** A problem the person editing can fix; its message is shown in the form. */
export class ServiceError extends Error {}

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type AuditEntry = Omit<typeof auditLog.$inferInsert, "id" | "at">;

/** Every change is recorded with before/after snapshots so mistakes can be traced and undone. */
export async function recordAudit(tx: Tx, entry: AuditEntry) {
  await tx.insert(auditLog).values(entry);
}

/** The Postgres error code (e.g. 23505 unique violation), also when wrapped by Drizzle. */
export function pgErrorCode(error: unknown): string | undefined {
  let e: unknown = error;
  while (e && typeof e === "object") {
    if ("code" in e && typeof e.code === "string") return e.code;
    e = "cause" in e ? e.cause : undefined;
  }
  return undefined;
}

export const UNIQUE_VIOLATION = "23505";
export const FOREIGN_KEY_VIOLATION = "23503";

export function missing(what: string): never {
  throw new ServiceError(`${what} not found. It may have been deleted.`);
}
