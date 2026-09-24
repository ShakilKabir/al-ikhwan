import { count, desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export const AUDIT_PAGE_SIZE = 50;

export async function listAuditLog(page = 1) {
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .orderBy(desc(auditLog.at), desc(auditLog.id))
      .limit(AUDIT_PAGE_SIZE)
      .offset((page - 1) * AUDIT_PAGE_SIZE),
    db.select({ total: count() }).from(auditLog),
  ]);
  return { rows, total };
}
