import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  loanEntries,
  members,
  transactions,
  type EntryType,
} from "@/db/schema";
import { round2 } from "@/lib/format";

const income = sql<number>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'income'), 0)`.mapWith(Number);
const expense = sql<number>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = 'expense'), 0)`.mapWith(Number);

/** What the club owes lenders: everything borrowed minus everything repaid. */
export const accountsPayableSum = sql<number>`coalesce(sum(case when ${loanEntries.kind} = 'borrowed' then ${loanEntries.amount} else -${loanEntries.amount} end), 0)`.mapWith(Number);

/**
 * The club's overall position, all time.
 *
 * Cash at hand = income − expenses + accounts payable. Money a lender spent for
 * the club is in the cash book as an expense and in the lender's account as
 * borrowed, so it nets out; repaying a lender reduces cash only through the loans.
 */
export async function getOverview() {
  const [[cash], [loans]] = await Promise.all([
    db.select({ income, expense }).from(transactions),
    db.select({ payable: accountsPayableSum }).from(loanEntries),
  ]);
  const net = round2(cash.income - cash.expense);
  return {
    income: cash.income,
    expense: cash.expense,
    net,
    accountsPayable: loans.payable,
    cashAtHand: round2(net + loans.payable),
  };
}

export type TransactionFilters = {
  year?: number;
  month?: number;
  categoryId?: number;
  type?: EntryType;
  memberId?: number;
  q?: string;
};

function where(f: TransactionFilters): SQL | undefined {
  const search = f.q ? `%${f.q.replace(/[\\%_]/g, "\\$&")}%` : undefined;
  return and(
    f.year ? sql`extract(year from ${transactions.date}) = ${f.year}` : undefined,
    f.month ? sql`extract(month from ${transactions.date}) = ${f.month}` : undefined,
    f.categoryId ? eq(transactions.categoryId, f.categoryId) : undefined,
    f.type ? eq(transactions.type, f.type) : undefined,
    f.memberId ? eq(transactions.memberId, f.memberId) : undefined,
    search
      ? or(ilike(transactions.particulars, search), ilike(transactions.notes, search))
      : undefined,
  );
}

export const PAGE_SIZE = 100;

/** Newest first, with totals for everything matching the filters (not just this page). */
export async function listTransactions(filters: TransactionFilters, page = 1) {
  const condition = where(filters);
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: transactions.id,
        date: transactions.date,
        particulars: transactions.particulars,
        type: transactions.type,
        amount: transactions.amount,
        notes: transactions.notes,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        memberId: transactions.memberId,
        memberName: members.name,
        memberCode: members.code,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(members, eq(members.id, transactions.memberId))
      .where(condition)
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ count: count(), income, expense }).from(transactions).where(condition),
  ]);
  return { rows, ...totals, net: round2(totals.income - totals.expense) };
}

export type TransactionRow = Awaited<ReturnType<typeof listTransactions>>["rows"][number];

export async function getTransaction(id: number) {
  const [row] = await db.select().from(transactions).where(eq(transactions.id, id));
  return row;
}

export async function listCategories() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      type: categories.type,
      transactionCount: count(transactions.id),
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.type), asc(categories.name));
}

/** Years that have transactions, newest first. */
export async function listYears() {
  const rows = await db
    .selectDistinct({ year: sql<number>`extract(year from ${transactions.date})`.mapWith(Number) })
    .from(transactions)
    .orderBy(desc(sql`1`));
  return rows.map((r) => r.year);
}

// ---------------------------------------------------------------------------
// Dashboard summaries
// ---------------------------------------------------------------------------

export async function totalsByYear() {
  const year = sql<number>`extract(year from ${transactions.date})`.mapWith(Number);
  return db
    .select({ year, income, expense })
    .from(transactions)
    .groupBy(year)
    .orderBy(year);
}

export async function totalsByMonth(forYear: number) {
  const month = sql<number>`extract(month from ${transactions.date})`.mapWith(Number);
  return db
    .select({ month, income, expense })
    .from(transactions)
    .where(sql`extract(year from ${transactions.date}) = ${forYear}`)
    .groupBy(month)
    .orderBy(month);
}

export async function totalsByCategory(forYear?: number) {
  const total = sql<number>`sum(${transactions.amount})`.mapWith(Number);
  return db
    .select({ id: categories.id, name: categories.name, type: categories.type, total })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(forYear ? sql`extract(year from ${transactions.date}) = ${forYear}` : undefined)
    .groupBy(categories.id)
    .orderBy(desc(total));
}

export async function totalsForYear(forYear?: number) {
  const [row] = await db
    .select({ income, expense })
    .from(transactions)
    .where(forYear ? sql`extract(year from ${transactions.date}) = ${forYear}` : undefined);
  return { ...row, net: round2(row.income - row.expense) };
}
