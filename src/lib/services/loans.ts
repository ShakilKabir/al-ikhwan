import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lenders, loanEntries, type LoanEntry } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import type { LenderInput, LoanEntryInput } from "@/lib/validation";
import {
  FOREIGN_KEY_VIOLATION,
  missing,
  pgErrorCode,
  recordAudit,
  ServiceError,
  UNIQUE_VIOLATION,
} from "./common";

function friendly(error: unknown, name?: string): never {
  const code = pgErrorCode(error);
  if (code === UNIQUE_VIOLATION && name) {
    throw new ServiceError(`There is already a lender called "${name}".`);
  }
  if (code === FOREIGN_KEY_VIOLATION) {
    throw new ServiceError("This lender has entries. Delete those first.");
  }
  throw error;
}

export async function createLender(input: LenderInput, actor: string | null) {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(lenders).values(input).returning();
      await recordAudit(tx, {
        actor,
        action: "create",
        entity: "lender",
        entityId: row.id,
        summary: `Added lender "${row.name}"`,
        after: row,
      });
      return row;
    });
  } catch (error) {
    friendly(error, input.name);
  }
}

export async function updateLender(id: number, input: LenderInput, actor: string | null) {
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(lenders).where(eq(lenders.id, id));
      if (!before) missing("Lender");
      const [after] = await tx.update(lenders).set(input).where(eq(lenders.id, id)).returning();
      await recordAudit(tx, {
        actor,
        action: "update",
        entity: "lender",
        entityId: id,
        summary: `Edited lender "${after.name}"`,
        before,
        after,
      });
      return after;
    });
  } catch (error) {
    friendly(error, input.name);
  }
}

export async function deleteLender(id: number, actor: string | null) {
  try {
    await db.transaction(async (tx) => {
      const [before] = await tx.delete(lenders).where(eq(lenders.id, id)).returning();
      if (!before) missing("Lender");
      await recordAudit(tx, {
        actor,
        action: "delete",
        entity: "lender",
        entityId: id,
        summary: `Deleted lender "${before.name}"`,
        before,
      });
    });
  } catch (error) {
    friendly(error);
  }
}

const describe = (e: LoanEntry) =>
  `${e.kind === "borrowed" ? "borrowed" : "repaid"} ${formatMoney(e.amount)} (${e.description}, ${e.date})`;

export async function createLoanEntry(lenderId: number, input: LoanEntryInput, actor: string | null) {
  return db.transaction(async (tx) => {
    const [lender] = await tx.select().from(lenders).where(eq(lenders.id, lenderId));
    if (!lender) missing("Lender");
    const [row] = await tx.insert(loanEntries).values({ ...input, lenderId }).returning();
    await recordAudit(tx, {
      actor,
      action: "create",
      entity: "loan_entry",
      entityId: row.id,
      summary: `${lender.name}: ${describe(row)}`,
      after: row,
    });
    return row;
  });
}

export async function updateLoanEntry(id: number, input: LoanEntryInput, actor: string | null) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(loanEntries).where(eq(loanEntries.id, id));
    if (!before) missing("Loan entry");
    const [after] = await tx
      .update(loanEntries)
      .set(input)
      .where(eq(loanEntries.id, id))
      .returning();
    await recordAudit(tx, {
      actor,
      action: "update",
      entity: "loan_entry",
      entityId: id,
      summary: `Edited loan entry: ${describe(after)}`,
      before,
      after,
    });
    return after;
  });
}

export async function deleteLoanEntry(id: number, actor: string | null) {
  return db.transaction(async (tx) => {
    const [before] = await tx.delete(loanEntries).where(eq(loanEntries.id, id)).returning();
    if (!before) missing("Loan entry");
    await recordAudit(tx, {
      actor,
      action: "delete",
      entity: "loan_entry",
      entityId: id,
      summary: `Deleted loan entry: ${describe(before)}`,
      before,
    });
    return before;
  });
}
