import { asc, eq, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { lenders, loanEntries } from "@/db/schema";
import { round2 } from "@/lib/format";
import { accountsPayableSum } from "./cash-book";

export async function listLenders() {
  return db
    .select({
      id: lenders.id,
      name: lenders.name,
      notes: lenders.notes,
      outstanding: accountsPayableSum,
      borrowed: sql<number>`coalesce(sum(${loanEntries.amount}) filter (where ${loanEntries.kind} = 'borrowed'), 0)`.mapWith(Number),
      lastEntry: max(loanEntries.date),
    })
    .from(lenders)
    .leftJoin(loanEntries, eq(loanEntries.lenderId, lenders.id))
    .groupBy(lenders.id)
    .orderBy(asc(lenders.name));
}

export async function getLender(id: number) {
  const [lender] = await db.select().from(lenders).where(eq(lenders.id, id));
  return lender;
}

/** A lender's account, oldest first, with what the club owes after each entry. */
export async function getLenderStatement(lenderId: number) {
  const entries = await db
    .select()
    .from(loanEntries)
    .where(eq(loanEntries.lenderId, lenderId))
    .orderBy(asc(loanEntries.date), asc(loanEntries.id));

  let owed = 0;
  return entries.map((e) => {
    owed = round2(owed + (e.kind === "borrowed" ? e.amount : -e.amount));
    return { ...e, owed };
  });
}

export async function getLoanEntry(id: number) {
  const [entry] = await db.select().from(loanEntries).where(eq(loanEntries.id, id));
  return entry;
}
