/**
 * Builds the "Download Excel backup" workbook: every table the site keeps,
 * one sheet each, readable without the website.
 */
import ExcelJS from "exceljs";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLog,
  categories,
  lenders,
  loanEntries,
  memberLedger,
  members,
  transactions,
} from "@/db/schema";
import { currentYear } from "@/lib/format";
import { CATEGORY_LABELS, LEDGER_KIND_LABELS } from "@/lib/member-labels";
import { listMembersWithDues } from "@/lib/queries/members";

const MONEY = "#,##0.00;(#,##0.00)";

type Column = { header: string; key: string; width: number; money?: boolean };

function addSheet(wb: ExcelJS.Workbook, name: string, columns: Column[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: c.money ? { numFmt: MONEY } : {},
  }));
  ws.getRow(1).font = { bold: true };
  ws.addRows(rows);
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

/** Excel shows real dates for Date values; ours are "YYYY-MM-DD" strings. */
const excelDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

export async function buildBackupWorkbook() {
  const year = currentYear();
  const [cash, dues, ledger, loans, cats, history] = await Promise.all([
    db
      .select({
        date: transactions.date,
        particulars: transactions.particulars,
        category: categories.name,
        type: transactions.type,
        amount: transactions.amount,
        memberCode: members.code,
        notes: transactions.notes,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .leftJoin(members, eq(members.id, transactions.memberId))
      .orderBy(asc(transactions.date), asc(transactions.id)),
    listMembersWithDues(year),
    db
      .select({
        code: members.code,
        name: members.name,
        date: memberLedger.date,
        kind: memberLedger.kind,
        amount: memberLedger.amount,
        description: memberLedger.description,
      })
      .from(memberLedger)
      .innerJoin(members, eq(members.id, memberLedger.memberId))
      .orderBy(asc(members.code), asc(memberLedger.date), asc(memberLedger.id)),
    db
      .select({
        lender: lenders.name,
        date: loanEntries.date,
        kind: loanEntries.kind,
        amount: loanEntries.amount,
        description: loanEntries.description,
      })
      .from(loanEntries)
      .innerJoin(lenders, eq(lenders.id, loanEntries.lenderId))
      .orderBy(asc(lenders.name), asc(loanEntries.date), asc(loanEntries.id)),
    db.select().from(categories).orderBy(asc(categories.type), asc(categories.name)),
    db.select().from(auditLog).orderBy(desc(auditLog.at)),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Al-Ikhwan website";
  wb.created = new Date();

  const cashSheet = addSheet(
    wb,
    "Cash Book",
    [
      { header: "Date", key: "date", width: 12 },
      { header: "Particulars", key: "particulars", width: 40 },
      { header: "Category", key: "category", width: 34 },
      { header: "Cash In", key: "cashIn", width: 14, money: true },
      { header: "Cash Out", key: "cashOut", width: 14, money: true },
      { header: "Member", key: "memberCode", width: 10 },
      { header: "Notes", key: "notes", width: 40 },
    ],
    cash.map((t) => ({
      ...t,
      date: excelDate(t.date),
      cashIn: t.type === "income" ? t.amount : null,
      cashOut: t.type === "expense" ? t.amount : null,
    })),
  );
  cashSheet.getColumn("date").numFmt = "dd-mm-yyyy";

  addSheet(
    wb,
    `Members ${year}`,
    [
      { header: "ID", key: "code", width: 8 },
      { header: "Old ID", key: "oldCode", width: 8 },
      { header: "Name", key: "name", width: 32 },
      { header: "Category", key: "category", width: 18 },
      { header: "Member type", key: "memberType", width: 20 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "Registered", key: "registeredOn", width: 12 },
      { header: "Yearly fee", key: "yearlyFee", width: 12, money: true },
      { header: "Assigned to", key: "assignedTo", width: 16 },
      { header: `Carried from ${year - 1}`, key: "carried", width: 14, money: true },
      { header: `Fees ${year}`, key: "fees", width: 12, money: true },
      { header: "Waived", key: "waived", width: 12, money: true },
      { header: `Paid ${year}`, key: "paid", width: 12, money: true },
      { header: "Due", key: "due", width: 12, money: true },
      { header: "Active", key: "active", width: 8 },
      { header: "Blood group", key: "bloodGroup", width: 10 },
      { header: "Date of birth", key: "dateOfBirth", width: 12 },
      { header: "Notes", key: "notes", width: 40 },
    ],
    dues.map((m) => ({
      ...m,
      category: CATEGORY_LABELS[m.category],
      active: m.isActive ? "Yes" : "No",
    })),
  );

  addSheet(
    wb,
    "Member fees & waivers",
    [
      { header: "ID", key: "code", width: 8 },
      { header: "Name", key: "name", width: 32 },
      { header: "Date", key: "date", width: 12 },
      { header: "Type", key: "kind", width: 18 },
      { header: "Amount", key: "amount", width: 12, money: true },
      { header: "Description", key: "description", width: 50 },
    ],
    ledger.map((l) => ({ ...l, kind: LEDGER_KIND_LABELS[l.kind] })),
  );

  addSheet(
    wb,
    "Loans",
    [
      { header: "Lender", key: "lender", width: 18 },
      { header: "Date", key: "date", width: 12 },
      { header: "Borrowed", key: "borrowed", width: 14, money: true },
      { header: "Repaid", key: "repaid", width: 14, money: true },
      { header: "Description", key: "description", width: 50 },
    ],
    loans.map((l) => ({
      ...l,
      borrowed: l.kind === "borrowed" ? l.amount : null,
      repaid: l.kind === "repaid" ? l.amount : null,
    })),
  );

  addSheet(
    wb,
    "Categories",
    [
      { header: "Name", key: "name", width: 36 },
      { header: "Type", key: "type", width: 10 },
    ],
    cats,
  );

  addSheet(
    wb,
    "Change history",
    [
      { header: "When (UTC)", key: "at", width: 20 },
      { header: "Who", key: "actor", width: 18 },
      { header: "Action", key: "action", width: 10 },
      { header: "What", key: "summary", width: 80 },
    ],
    history,
  );

  return wb.xlsx.writeBuffer();
}
