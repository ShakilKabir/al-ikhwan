import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../../../tests/test-db";
import { listAuditLog } from "@/lib/queries/audit";
import { getOverview, listTransactions } from "@/lib/queries/cash-book";
import { listLenders } from "@/lib/queries/loans";
import { getMemberStatement, listMembersWithDues, nextMemberCode } from "@/lib/queries/members";
import { createCategory, updateCategory } from "./categories";
import { ServiceError } from "./common";
import { createLender, createLoanEntry } from "./loans";
import {
  addLedgerEntry,
  chargeYearlyFees,
  createMember,
  deleteMember,
  previewYearlyFees,
} from "./members";
import { createTransaction, deleteTransaction, updateTransaction } from "./transactions";

vi.mock("@/db", () => import("../../../tests/test-db").then((m) => m.createTestDb()));

const ACTOR = "Test";

async function setup() {
  const fees = await createCategory({ name: "Yearly Renewal Fee", type: "income" }, ACTOR);
  const field = await createCategory({ name: "Field rental exp", type: "expense" }, ACTOR);
  const member = await createMember(
    {
      code: "R-01",
      oldCode: null,
      name: "Test Member",
      category: "regular",
      memberType: "General",
      phone: null,
      registeredOn: "2025-01-01",
      yearlyFee: 3600,
      assignedTo: null,
      bloodGroup: null,
      dateOfBirth: null,
      notes: null,
      isActive: true,
    },
    { chargeYearlyFee: false },
    ACTOR,
  );
  return { fees, field, member };
}

beforeEach(resetDb);

describe("cash book", () => {
  it("takes income/expense from the category and totals the position", async () => {
    const { fees, field } = await setup();
    await createTransaction(
      { date: "2026-01-05", particulars: "Fee", categoryId: fees.id, amount: 1000.5, memberId: null, notes: null },
      ACTOR,
    );
    const rent = await createTransaction(
      { date: "2026-02-01", particulars: "Rent", categoryId: field.id, amount: 400, memberId: null, notes: null },
      ACTOR,
    );
    expect(rent.type).toBe("expense");

    expect(await getOverview()).toMatchObject({
      income: 1000.5,
      expense: 400,
      net: 600.5,
      accountsPayable: 0,
      cashAtHand: 600.5,
    });

    const february = await listTransactions({ year: 2026, month: 2 });
    expect(february.rows.map((r) => r.particulars)).toEqual(["Rent"]);
    expect(february).toMatchObject({ count: 1, income: 0, expense: 400, net: -400 });
  });

  it("adds what is owed to lenders to cash at hand", async () => {
    const { field } = await setup();
    // A lender pays a 5,000 bill for the club: it's an expense and a loan, so cash is unchanged.
    await createTransaction(
      { date: "2026-03-01", particulars: "Sand", categoryId: field.id, amount: 5000, memberId: null, notes: null },
      ACTOR,
    );
    const lender = await createLender({ name: "Bike X", notes: null }, ACTOR);
    await createLoanEntry(lender.id, { date: "2026-03-01", kind: "borrowed", amount: 5000, description: "Sand" }, ACTOR);
    expect((await getOverview()).cashAtHand).toBe(0);

    // Paying the lender back 2,000 reduces cash through the loan, not the cash book.
    await createLoanEntry(lender.id, { date: "2026-04-01", kind: "repaid", amount: 2000, description: "Repaid" }, ACTOR);
    expect(await getOverview()).toMatchObject({ accountsPayable: 3000, cashAtHand: -2000 });
    expect((await listLenders())[0]).toMatchObject({ name: "Bike X", outstanding: 3000, borrowed: 5000 });
  });

  it("only links income to members", async () => {
    const { field, member } = await setup();
    await expect(
      createTransaction(
        { date: "2026-03-01", particulars: "x", categoryId: field.id, amount: 1, memberId: member.id, notes: null },
        ACTOR,
      ),
    ).rejects.toThrow(ServiceError);
  });

  it("won't switch a category between income and expense once it has entries", async () => {
    const { fees } = await setup();
    await createTransaction(
      { date: "2026-01-05", particulars: "Fee", categoryId: fees.id, amount: 10, memberId: null, notes: null },
      ACTOR,
    );
    await expect(updateCategory(fees.id, { name: fees.name, type: "expense" }, ACTOR)).rejects.toThrow(
      ServiceError,
    );
    await expect(updateCategory(fees.id, { name: "Renewal fee", type: "income" }, ACTOR)).resolves.toMatchObject({
      name: "Renewal fee",
    });
  });

  it("records every change in the history", async () => {
    const { fees } = await setup();
    const t = await createTransaction(
      { date: "2026-01-05", particulars: "Fee", categoryId: fees.id, amount: 10, memberId: null, notes: null },
      ACTOR,
    );
    await updateTransaction(t.id, { date: "2026-01-05", particulars: "Fee", categoryId: fees.id, amount: 20, memberId: null, notes: null }, "Someone");
    await deleteTransaction(t.id, null);

    const { rows } = await listAuditLog();
    const txRows = rows.filter((r) => r.entity === "transaction");
    expect(txRows.map((r) => r.action)).toEqual(["delete", "update", "create"]);
    expect(txRows[1]).toMatchObject({ actor: "Someone", before: { amount: 10 }, after: { amount: 20 } });
  });
});

describe("member dues", () => {
  it("follows the member list: carried + fees − waived − paid", async () => {
    const { fees, member } = await setup();
    await addLedgerEntry(member.id, { date: "2025-12-31", kind: "opening_balance", amount: 2000, description: null }, ACTOR);
    await addLedgerEntry(member.id, { date: "2026-01-01", kind: "yearly_fee", amount: 3600, description: null }, ACTOR);
    await addLedgerEntry(member.id, { date: "2026-01-01", kind: "waiver", amount: 500, description: null }, ACTOR);
    await addLedgerEntry(member.id, { date: "2026-02-01", kind: "payment", amount: 1000, description: null }, ACTOR);
    // A cash-book payment linked to the member counts too.
    await createTransaction(
      { date: "2026-04-08", particulars: "Test Member", categoryId: fees.id, amount: 1100, memberId: member.id, notes: null },
      ACTOR,
    );

    const [row2026] = await listMembersWithDues(2026);
    expect(row2026).toMatchObject({ carried: 2000, fees: 3600, waived: 500, paid: 2100, due: 3000 });

    // Next year starts from what was left.
    const [row2027] = await listMembersWithDues(2027);
    expect(row2027).toMatchObject({ carried: 3000, fees: 0, waived: 0, paid: 0, due: 3000 });

    const statement = await getMemberStatement(member.id);
    expect(statement.map((l) => [l.source, l.kind, l.balance])).toEqual([
      ["ledger", "opening_balance", 2000],
      ["ledger", "yearly_fee", 5600],
      ["ledger", "waiver", 5100],
      ["ledger", "payment", 4100],
      ["cash-book", "payment", 3000],
    ]);
  });

  it("charges the yearly fee once per year", async () => {
    const { member } = await setup();
    expect((await previewYearlyFees(2026)).map((m) => m.code)).toEqual(["R-01"]);
    expect(await chargeYearlyFees(2026, ACTOR)).toBe(1);
    expect(await chargeYearlyFees(2026, ACTOR)).toBe(0);
    await expect(
      addLedgerEntry(member.id, { date: "2026-06-01", kind: "yearly_fee", amount: 3600, description: null }, ACTOR),
    ).rejects.toThrow("already been charged");
    expect((await listMembersWithDues(2026))[0].due).toBe(3600);
  });

  it("keeps members who have paid through the cash book", async () => {
    const { fees, member } = await setup();
    await createTransaction(
      { date: "2026-04-08", particulars: "Test Member", categoryId: fees.id, amount: 100, memberId: member.id, notes: null },
      ACTOR,
    );
    await expect(deleteMember(member.id, ACTOR)).rejects.toThrow(ServiceError);
  });

  it("suggests the next member ID", async () => {
    await setup();
    expect(await nextMemberCode("regular")).toBe("R-02");
    expect(await nextMemberCode("executive")).toBe("E-01");
  });
});
