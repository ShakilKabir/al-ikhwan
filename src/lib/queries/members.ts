import { and, asc, eq, getTableColumns, isNotNull, sql, type SQL } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  categories,
  memberLedger,
  members,
  transactions,
  type LedgerKind,
  type MemberCategory,
} from "@/db/schema";
import { round2 } from "@/lib/format";
import { CATEGORY_CODE_PREFIX, CREDIT_KINDS } from "@/lib/member-labels";

/**
 * Every change to what members owe, as one signed amount per row (positive = owes more):
 * the member ledger plus cash-book income linked to a member, which counts as a payment.
 */
function movements() {
  return unionAll(
    db
      .select({
        memberId: memberLedger.memberId,
        date: memberLedger.date,
        kind: sql<string>`${memberLedger.kind}::text`.as("kind"),
        signed: sql<number>`case when ${memberLedger.kind} in ('waiver', 'payment') then -${memberLedger.amount} else ${memberLedger.amount} end`.as("signed"),
      })
      .from(memberLedger),
    db
      .select({
        memberId: sql<number>`${transactions.memberId}`.as("member_id"),
        date: transactions.date,
        kind: sql<string>`'payment'`.as("kind"),
        signed: sql<number>`-${transactions.amount}`.as("signed"),
      })
      .from(transactions)
      .where(isNotNull(transactions.memberId)),
  ).as("movements");
}

/**
 * Members with their dues for one year, in the shape of the club's member list:
 * carried forward from earlier years, fees charged this year, waived, paid, and due.
 */
export async function listMembersWithDues(year: number, memberId?: number) {
  const m = movements();
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const inYear = sql`${m.date} >= ${start} and ${m.date} < ${end}`;
  const total = (filter: SQL) =>
    sql<number>`coalesce(sum(${m.signed}) filter (where ${filter}), 0)`.mapWith(Number);
  // Waivers and payments are negative in `signed`; report them as positive amounts.
  const credited = (filter: SQL) =>
    sql<number>`coalesce(sum(-${m.signed}) filter (where ${filter}), 0)`.mapWith(Number);

  return db
    .select({
      ...getTableColumns(members),
      // An opening balance entered during the year also counts as carried forward.
      carried: total(sql`${m.date} < ${start} or (${m.kind} = 'opening_balance' and ${inYear})`),
      fees: total(sql`${m.kind} in ('yearly_fee', 'charge') and ${inYear}`),
      waived: credited(sql`${m.kind} = 'waiver' and ${inYear}`),
      paid: credited(sql`${m.kind} = 'payment' and ${inYear}`),
      due: total(sql`${m.date} < ${end}`),
    })
    .from(members)
    .leftJoin(m, eq(m.memberId, members.id))
    .where(memberId ? eq(members.id, memberId) : undefined)
    .groupBy(members.id)
    .orderBy(asc(members.code));
}

export type MemberWithDues = Awaited<ReturnType<typeof listMembersWithDues>>[number];

export async function getMember(id: number) {
  const [member] = await db.select().from(members).where(eq(members.id, id));
  return member;
}

export type StatementLine = {
  /** "ledger" rows are edited on the member page; "cash-book" rows in the cash book. */
  source: "ledger" | "cash-book";
  id: number;
  date: string;
  kind: LedgerKind;
  amount: number;
  description: string | null;
  balance: number;
};

/** A member's full history, oldest first, with the running amount they owe. */
export async function getMemberStatement(memberId: number): Promise<StatementLine[]> {
  const [ledger, payments] = await Promise.all([
    db
      .select({
        id: memberLedger.id,
        date: memberLedger.date,
        kind: memberLedger.kind,
        amount: memberLedger.amount,
        description: memberLedger.description,
        createdAt: memberLedger.createdAt,
      })
      .from(memberLedger)
      .where(eq(memberLedger.memberId, memberId)),
    db
      .select({
        id: transactions.id,
        date: transactions.date,
        amount: transactions.amount,
        particulars: transactions.particulars,
        category: categories.name,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(eq(transactions.memberId, memberId)),
  ]);

  const lines = [
    ...ledger.map((l) => ({ ...l, source: "ledger" as const })),
    ...payments.map((p) => ({
      id: p.id,
      date: p.date,
      kind: "payment" as const,
      amount: p.amount,
      description: `${p.category}: ${p.particulars}`,
      createdAt: p.createdAt,
      source: "cash-book" as const,
    })),
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      // On the same day, charges before payments, then in the order entered.
      Number(CREDIT_KINDS.includes(a.kind)) - Number(CREDIT_KINDS.includes(b.kind)) ||
      a.createdAt.getTime() - b.createdAt.getTime(),
  );

  let balance = 0;
  return lines.map(({ createdAt: _createdAt, ...line }) => {
    balance = round2(balance + (CREDIT_KINDS.includes(line.kind) ? -line.amount : line.amount));
    return { ...line, balance };
  });
}

export async function getLedgerEntry(id: number) {
  const [entry] = await db.select().from(memberLedger).where(eq(memberLedger.id, id));
  return entry;
}

/** Next free code for a category, e.g. "R-43". */
export async function nextMemberCode(category: MemberCategory) {
  const prefix = CATEGORY_CODE_PREFIX[category];
  const [row] = await db
    .select({
      max: sql<number>`coalesce(max(nullif(regexp_replace(${members.code}, '\\D', '', 'g'), '')::int), 0)`.mapWith(Number),
    })
    .from(members)
    .where(sql`${members.code} like ${prefix + "-%"}`);
  return `${prefix}-${String(row.max + 1).padStart(2, "0")}`;
}

/** Everyone currently assigned to follow up on dues, for suggestions in forms. */
export async function listAssignees() {
  const rows = await db
    .selectDistinct({ name: members.assignedTo })
    .from(members)
    .where(and(isNotNull(members.assignedTo), sql`${members.assignedTo} <> ''`))
    .orderBy(asc(members.assignedTo));
  return rows.map((r) => r.name!);
}

/** For choosing who a cash-book payment is from. */
export async function listMemberOptions() {
  return db
    .select({ id: members.id, code: members.code, name: members.name, isActive: members.isActive })
    .from(members)
    .orderBy(asc(members.name));
}
