import { and, count, eq, gt, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { memberLedger, members, transactions } from "@/db/schema";
import { formatMoney, today } from "@/lib/format";
import { LEDGER_KIND_LABELS } from "@/lib/member-labels";
import type { LedgerEntryInput, MemberInput } from "@/lib/validation";
import {
  missing,
  pgErrorCode,
  recordAudit,
  ServiceError,
  UNIQUE_VIOLATION,
  type Tx,
} from "./common";

function duplicateCode(error: unknown, code: string): never {
  if (pgErrorCode(error) === UNIQUE_VIOLATION) {
    throw new ServiceError(`Member ID ${code} is already used by someone else.`);
  }
  throw error;
}

export async function createMember(
  input: MemberInput,
  options: { chargeYearlyFee: boolean },
  actor: string | null,
) {
  try {
    return await db.transaction(async (tx) => {
      const [member] = await tx.insert(members).values(input).returning();
      await recordAudit(tx, {
        actor,
        action: "create",
        entity: "member",
        entityId: member.id,
        summary: `Added member ${member.code} ${member.name}`,
        after: member,
      });
      if (options.chargeYearlyFee && member.yearlyFee) {
        const year = today().slice(0, 4);
        await insertLedgerEntry(tx, member.id, {
          date: today(),
          kind: "yearly_fee",
          amount: member.yearlyFee,
          description: `Yearly fee ${year}`,
        }, actor);
      }
      return member;
    });
  } catch (error) {
    duplicateCode(error, input.code);
  }
}

export async function updateMember(id: number, input: MemberInput, actor: string | null) {
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(members).where(eq(members.id, id));
      if (!before) missing("Member");
      const [after] = await tx.update(members).set(input).where(eq(members.id, id)).returning();
      await recordAudit(tx, {
        actor,
        action: "update",
        entity: "member",
        entityId: id,
        summary: `Edited member ${after.code} ${after.name}`,
        before,
        after,
      });
      return after;
    });
  } catch (error) {
    duplicateCode(error, input.code);
  }
}

/** Only members with no cash-book payments can be deleted; others should be marked inactive. */
export async function deleteMember(id: number, actor: string | null) {
  await db.transaction(async (tx) => {
    const [{ payments }] = await tx
      .select({ payments: count() })
      .from(transactions)
      .where(eq(transactions.memberId, id));
    if (payments > 0) {
      throw new ServiceError(
        `This member has ${payments} payment(s) in the cash book, so they can't be deleted. Untick "Active" instead.`,
      );
    }
    const ledger = await tx.select().from(memberLedger).where(eq(memberLedger.memberId, id));
    const [before] = await tx.delete(members).where(eq(members.id, id)).returning();
    if (!before) missing("Member");
    await recordAudit(tx, {
      actor,
      action: "delete",
      entity: "member",
      entityId: id,
      summary: `Deleted member ${before.code} ${before.name}`,
      before: { ...before, ledger },
    });
  });
}

// ---------------------------------------------------------------------------
// Member ledger: fees, waivers, opening balances, payments outside the cash book
// ---------------------------------------------------------------------------

async function insertLedgerEntry(
  tx: Tx,
  memberId: number,
  input: LedgerEntryInput,
  actor: string | null,
) {
  const [member] = await tx.select().from(members).where(eq(members.id, memberId));
  if (!member) missing("Member");
  try {
    const [entry] = await tx
      .insert(memberLedger)
      .values({ ...input, memberId })
      .returning();
    await recordAudit(tx, {
      actor,
      action: "create",
      entity: "member_ledger",
      entityId: entry.id,
      summary: `Added ${LEDGER_KIND_LABELS[entry.kind].toLowerCase()} ${formatMoney(entry.amount)} for ${member.code} ${member.name}`,
      after: entry,
    });
    return entry;
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) {
      throw new ServiceError(
        `${member.name} has already been charged the yearly fee for ${input.date.slice(0, 4)}.`,
      );
    }
    throw error;
  }
}

export async function addLedgerEntry(memberId: number, input: LedgerEntryInput, actor: string | null) {
  return db.transaction((tx) => insertLedgerEntry(tx, memberId, input, actor));
}

export async function updateLedgerEntry(id: number, input: LedgerEntryInput, actor: string | null) {
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(memberLedger).where(eq(memberLedger.id, id));
      if (!before) missing("Entry");
      const [after] = await tx
        .update(memberLedger)
        .set(input)
        .where(eq(memberLedger.id, id))
        .returning();
      await recordAudit(tx, {
        actor,
        action: "update",
        entity: "member_ledger",
        entityId: id,
        summary: `Edited ${LEDGER_KIND_LABELS[after.kind].toLowerCase()} ${formatMoney(after.amount)} (member #${after.memberId})`,
        before,
        after,
      });
      return after;
    });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) {
      throw new ServiceError(`There is already a yearly fee for ${input.date.slice(0, 4)}.`);
    }
    throw error;
  }
}

export async function deleteLedgerEntry(id: number, actor: string | null) {
  return db.transaction(async (tx) => {
    const [before] = await tx.delete(memberLedger).where(eq(memberLedger.id, id)).returning();
    if (!before) missing("Entry");
    await recordAudit(tx, {
      actor,
      action: "delete",
      entity: "member_ledger",
      entityId: id,
      summary: `Deleted ${LEDGER_KIND_LABELS[before.kind].toLowerCase()} ${formatMoney(before.amount)} (member #${before.memberId})`,
      before,
    });
    return before;
  });
}

// ---------------------------------------------------------------------------
// Yearly fees
// ---------------------------------------------------------------------------

/** Active members with a yearly fee who haven't been charged for `year` yet. */
function membersDueForYearlyFee(tx: Tx | typeof db, year: number) {
  return tx
    .select({ id: members.id, code: members.code, name: members.name, yearlyFee: members.yearlyFee })
    .from(members)
    .where(
      and(
        eq(members.isActive, true),
        gt(members.yearlyFee, 0),
        notExists(
          tx
            .select({ id: memberLedger.id })
            .from(memberLedger)
            .where(
              and(
                eq(memberLedger.memberId, members.id),
                eq(memberLedger.kind, "yearly_fee"),
                sql`extract(year from ${memberLedger.date}) = ${year}`,
              ),
            ),
        ),
      ),
    )
    .orderBy(members.code);
}

export async function previewYearlyFees(year: number) {
  return membersDueForYearlyFee(db, year);
}

/** Charges the yearly fee (dated 1 January) to everyone who owes it. Safe to run twice. */
export async function chargeYearlyFees(year: number, actor: string | null) {
  return db.transaction(async (tx) => {
    const due = await membersDueForYearlyFee(tx, year);
    if (due.length === 0) return 0;
    const entries = await tx
      .insert(memberLedger)
      .values(
        due.map((m) => ({
          memberId: m.id,
          date: `${year}-01-01`,
          kind: "yearly_fee" as const,
          amount: m.yearlyFee!,
          description: `Yearly fee ${year}`,
        })),
      )
      .returning({ id: memberLedger.id });
    await recordAudit(tx, {
      actor,
      action: "create",
      entity: "member_ledger",
      summary: `Charged the ${year} yearly fee to ${due.length} member(s)`,
      after: { year, members: due, entryIds: entries.map((e) => e.id) },
    });
    return due.length;
  });
}
