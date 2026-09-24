import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, members, transactions, type Transaction } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import type { TransactionInput } from "@/lib/validation";
import { missing, recordAudit, ServiceError, type Tx } from "./common";

/** The entry's type (income/expense) always comes from its category. */
async function resolveType(tx: Tx, input: TransactionInput) {
  const [category] = await tx
    .select()
    .from(categories)
    .where(eq(categories.id, input.categoryId));
  if (!category) missing("Category");

  if (input.memberId) {
    if (category.type !== "income") {
      throw new ServiceError("Only income can be linked to a member.");
    }
    const [member] = await tx
      .select({ id: members.id })
      .from(members)
      .where(eq(members.id, input.memberId));
    if (!member) missing("Member");
  }
  return category.type;
}

const describe = (t: Transaction) =>
  `${t.type === "income" ? "income" : "expense"} ${formatMoney(t.amount)} (${t.particulars}, ${t.date})`;

export async function createTransaction(input: TransactionInput, actor: string | null) {
  return db.transaction(async (tx) => {
    const type = await resolveType(tx, input);
    const [row] = await tx
      .insert(transactions)
      .values({ ...input, type })
      .returning();
    await recordAudit(tx, {
      actor,
      action: "create",
      entity: "transaction",
      entityId: row.id,
      summary: `Added ${describe(row)}`,
      after: row,
    });
    return row;
  });
}

export async function updateTransaction(
  id: number,
  input: TransactionInput,
  actor: string | null,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(transactions).where(eq(transactions.id, id));
    if (!before) missing("Cash book entry");
    const type = await resolveType(tx, input);
    const [after] = await tx
      .update(transactions)
      .set({ ...input, type })
      .where(eq(transactions.id, id))
      .returning();
    await recordAudit(tx, {
      actor,
      action: "update",
      entity: "transaction",
      entityId: id,
      summary: `Edited ${describe(after)}`,
      before,
      after,
    });
    return after;
  });
}

export async function deleteTransaction(id: number, actor: string | null) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning();
    if (!before) missing("Cash book entry");
    await recordAudit(tx, {
      actor,
      action: "delete",
      entity: "transaction",
      entityId: id,
      summary: `Deleted ${describe(before)}`,
      before,
    });
  });
}
