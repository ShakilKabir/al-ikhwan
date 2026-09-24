/**
 * Reads the club's "Income and expenses" Excel workbook into plain data.
 * Used once, by scripts/import-excel.ts, to move the spreadsheet into the database.
 */
import ExcelJS from "exceljs";
import type {
  EntryType,
  LedgerKind,
  LoanEntryKind,
  MemberCategory,
} from "../../src/db/schema";

export type ParsedTransaction = {
  date: string;
  particulars: string;
  category: string;
  type: EntryType;
  amount: number;
  notes: string | null;
};

export type ParsedLedgerEntry = {
  date: string;
  kind: LedgerKind;
  amount: number;
  description: string | null;
};

export type ParsedMember = {
  code: string;
  oldCode: string | null;
  name: string;
  category: MemberCategory;
  memberType: string | null;
  phone: string | null;
  registeredOn: string | null;
  yearlyFee: number | null;
  assignedTo: string | null;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  ledger: ParsedLedgerEntry[];
  /** "Total Running Dues" as the spreadsheet computed it, for verification. */
  expectedDue: number;
};

export type ParsedLender = {
  name: string;
  entries: {
    date: string;
    kind: LoanEntryKind;
    amount: number;
    description: string;
  }[];
  /** What the club owes this lender according to the sheet. */
  expectedOutstanding: number;
};

export type ParsedWorkbook = {
  transactions: ParsedTransaction[];
  members: ParsedMember[];
  lenders: ParsedLender[];
  /** Figures the spreadsheet itself shows, used to check the import. */
  expected: { cashAtHand: number; regularMembersDue: number };
  warnings: string[];
};

const ACCOUNTS_PAYABLE = "Accounts Payable";

export async function parseWorkbook(path: string): Promise<ParsedWorkbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const warnings: string[] = [];

  const cashBook = sheetStartingWith(wb, "Cash Book");
  const memberSheet = sheetStartingWith(wb, "Member list", "Active");
  const idCardSheet = wb.worksheets.find((ws) => ws.name.includes("ID card"));

  const { transactions, cashAtHand } = parseCashBook(cashBook, warnings);
  const { members, regularMembersDue } = parseMembers(memberSheet, warnings);
  if (idCardSheet) addIdCardDetails(idCardSheet, members);
  const lenders = wb.worksheets
    .filter(isLenderSheet)
    .map((ws) => parseLender(ws, warnings));

  return {
    transactions,
    members,
    lenders,
    expected: { cashAtHand, regularMembersDue },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Cash book
// ---------------------------------------------------------------------------

function parseCashBook(ws: ExcelJS.Worksheet, warnings: string[]) {
  const header = findRow(ws, (row) => text(row.getCell(2)) === "Date");
  const col = headerColumns(ws.getRow(header));
  const [dateCol, particularsCol, categoryCol, inCol, outCol] = [
    col("Date"),
    col("Particulars"),
    col("Category"),
    col("Cash In"),
    col("Cash Out"),
  ];

  const transactions: ParsedTransaction[] = [];
  for (let r = header + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const date = isoDate(value(row.getCell(dateCol)));
    if (!date) continue;

    const category = text(row.getCell(categoryCol));
    const cashIn = number(row.getCell(inCol));
    const cashOut = number(row.getCell(outCol));
    const particulars = text(row.getCell(particularsCol));

    // The loan balance is kept in the lender sheets and becomes the Loans page.
    if (category === ACCOUNTS_PAYABLE) {
      warnings.push(
        `Cash book row ${r} ("${particulars}", ${cashIn}) skipped: loans are tracked on the Loans page.`,
      );
      continue;
    }
    if (!cashIn === !cashOut) {
      throw new Error(`Cash book row ${r} needs exactly one of Cash In / Cash Out.`);
    }

    const notes = [...Array(ws.columnCount).keys()]
      .map((i) => noteText(row.getCell(i + 1)))
      .filter(Boolean);
    transactions.push({
      date,
      particulars,
      category,
      type: cashIn ? "income" : "expense",
      amount: cashIn || cashOut,
      notes: notes.join("; ") || null,
    });
  }

  // The sheet's headline figure: the number to the right of the "Cash at Hand" label.
  const labelRow = ws.getRow(findRow(ws, (row) => rowHasText(row, "Cash at Hand")));
  const cells: ExcelJS.Cell[] = [];
  labelRow.eachCell((c) => cells.push(c));
  const labelIndex = cells.findIndex((c) => text(c) === "Cash at Hand");
  const cashAtHand = number(
    cells.slice(labelIndex + 1).find((c) => typeof value(c) === "number")!,
  );

  return { transactions, cashAtHand };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

const MEMBER_COLUMNS = {
  oldCode: "B",
  code: "D",
  name: "E",
  registeredOn: "F",
  memberType: "G",
  yearlyFee: "H",
  phone: "I",
  membership: "J",
  openingDue: "K",
  waiver: "P",
  totalDue: "V",
  assignedTo: "W",
} as const;

/** Columns holding payments received, in the order they were filled in. */
const PAYMENT_COLUMNS = ["L", "M", "N", "O", "S", "T", "U"];

const CATEGORY_BY_PREFIX: Record<string, MemberCategory> = {
  R: "regular",
  E: "executive",
  A: "advisor",
  U: "prospective",
};

function parseMembers(ws: ExcelJS.Worksheet, warnings: string[]) {
  const headerRow = ws.getRow(
    findRow(ws, (row) => text(row.getCell(MEMBER_COLUMNS.code)) === "New ID"),
  );
  expectHeader(headerRow, MEMBER_COLUMNS.openingDue, "Dues Till");
  expectHeader(headerRow, MEMBER_COLUMNS.waiver, "Waiver");
  expectHeader(headerRow, MEMBER_COLUMNS.totalDue, "Total Running Dues");

  const feeYear = Number(/\((\d{4})\)/.exec(ws.name)?.[1]);
  if (!feeYear) throw new Error(`No year in sheet name "${ws.name}".`);
  const openingDate = lastDayOfMonth(
    monthFromHeader(text(headerRow.getCell(MEMBER_COLUMNS.openingDue))),
  );
  const paymentMonths = new Map(
    PAYMENT_COLUMNS.map((c) => [c, monthFromHeader(text(headerRow.getCell(c)))]),
  );

  const members: ParsedMember[] = [];
  ws.eachRow((row, r) => {
    const code = text(row.getCell(MEMBER_COLUMNS.code));
    const match = /^([RAEU])-\d+$/.exec(code);
    if (!match) return;
    const cell = (c: string) => row.getCell(c);

    const notes: string[] = [];
    const nameNote = noteText(cell(MEMBER_COLUMNS.name));
    if (nameNote) notes.push(nameNote);
    const membership = text(cell(MEMBER_COLUMNS.membership));
    // For people under consideration this column names who referred them.
    if (membership && !["Active", "Advisor", "Executive"].includes(membership)) {
      notes.push(`Referred by ${membership}`);
    }

    const ledger: ParsedLedgerEntry[] = [];
    const openingDue = number(cell(MEMBER_COLUMNS.openingDue));
    if (openingDue) {
      ledger.push({
        date: openingDate,
        kind: "opening_balance",
        amount: openingDue,
        description: `Dues carried forward (member list)`,
      });
    }

    const yearlyFee = number(cell(MEMBER_COLUMNS.yearlyFee)) || null;
    if (yearlyFee) {
      ledger.push({
        date: `${feeYear}-01-01`,
        kind: "yearly_fee",
        amount: yearlyFee,
        description: `Yearly fee ${feeYear}`,
      });
    }

    // A negative waiver in the sheet is an extra charge (e.g. unpaid registration).
    const waiver = number(cell(MEMBER_COLUMNS.waiver));
    const waiverNote = noteText(cell(MEMBER_COLUMNS.waiver));
    if (waiver) {
      ledger.push({
        date: `${feeYear}-01-01`,
        kind: waiver > 0 ? "waiver" : "charge",
        amount: Math.abs(waiver),
        description: waiverNote ?? (waiver > 0 ? "Waiver" : "Adjustment"),
      });
    }

    ledger.push(...parsePayments(row, paymentMonths));

    const expectedDue = number(cell(MEMBER_COLUMNS.totalDue));
    const computedDue = round2(
      ledger.reduce(
        (sum, e) =>
          e.kind === "waiver" || e.kind === "payment" ? sum - e.amount : sum + e.amount,
        0,
      ),
    );
    if (computedDue !== expectedDue) {
      warnings.push(
        `Member ${code}: dues from the sheet's columns (${computedDue}) differ from its "Total Running Dues" (${expectedDue}) on row ${r}.`,
      );
    }

    members.push({
      code,
      oldCode: text(cell(MEMBER_COLUMNS.oldCode)) || null,
      name: text(cell(MEMBER_COLUMNS.name)),
      category: CATEGORY_BY_PREFIX[match[1]],
      memberType: text(cell(MEMBER_COLUMNS.memberType)) || null,
      phone: text(cell(MEMBER_COLUMNS.phone)).split(/\s*\n\s*/).join(", ") || null,
      registeredOn: isoDate(value(cell(MEMBER_COLUMNS.registeredOn))),
      yearlyFee,
      assignedTo: normalizeName(text(cell(MEMBER_COLUMNS.assignedTo))),
      bloodGroup: null,
      dateOfBirth: null,
      notes: notes.join("\n") || null,
      ledger,
      expectedDue,
    });
  });

  // The sheet's "Total receivables" only adds up the regular members.
  const regularMembersDue = round2(
    members
      .filter((m) => m.category === "regular")
      .reduce((sum, m) => sum + m.expectedDue, 0),
  );
  return { members, regularMembersDue };
}

/**
 * Each payment column holds the total received in one month. Cell comments
 * often give the real date(s), e.g. "9/4/26-1800  17/4/26-1800".
 * A comment left on an empty payment cell belongs to a later payment in the row.
 */
function parsePayments(
  row: ExcelJS.Row,
  months: Map<string, { year: number; month: number }>,
): ParsedLedgerEntry[] {
  const cells = PAYMENT_COLUMNS.map((c) => ({
    column: c,
    amount: number(row.getCell(c)),
    note: noteText(row.getCell(c)),
  }));
  const orphanNotes = cells.filter((c) => !c.amount && c.note).map((c) => c.note!);
  const paid = cells.filter((c) => c.amount);
  for (const note of orphanNotes) {
    const target = paid.findLast((c) => !c.note);
    if (target) target.note = note;
  }

  return paid.flatMap((c) => {
    const { year, month } = months.get(c.column)!;
    const fallbackDate = `${year}-${pad(month)}-01`;
    return splitPayment(c.amount, c.note, fallbackDate).map((p) => ({
      date: p.date,
      kind: "payment" as const,
      amount: p.amount,
      description: c.note ?? `Member list: ${MONTHS[month - 1]} ${year}`,
    }));
  });
}

const DATE_IN_TEXT = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g;

/**
 * Splits one payment cell into dated payments using its comment. Dates are
 * day-first. When a comment lists several dated amounts that add up to the
 * cell, each becomes its own payment; otherwise the first date is used.
 */
export function splitPayment(
  amount: number,
  note: string | null,
  fallbackDate: string,
): { date: string; amount: number }[] {
  const matches = note ? [...note.matchAll(DATE_IN_TEXT)] : [];
  const dated = matches
    .map((m, i) => {
      const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
      const date = validDate(year, Number(m[2]), Number(m[1]));
      const until = matches[i + 1]?.index ?? note!.length;
      const after = note!.slice(m.index! + m[0].length, until);
      const figure = /\d[\d,]*(?:\.\d+)?/.exec(after)?.[0];
      return { date, amount: figure ? Number(figure.replace(/,/g, "")) : null };
    })
    .filter((d): d is { date: string; amount: number | null } => d.date !== null);

  if (dated.length === 0) return [{ date: fallbackDate, amount }];
  if (dated.length === 1) return [{ date: dated[0].date, amount }];

  const known = dated.reduce((sum, d) => sum + (d.amount ?? 0), 0);
  const missing = dated.filter((d) => d.amount === null);
  if (missing.length === 1 && known < amount) missing[0].amount = amount - known;
  if (dated.every((d) => d.amount !== null) && round2(known + (missing[0]?.amount ?? 0)) === amount) {
    return dated as { date: string; amount: number }[];
  }
  return [{ date: dated[0].date, amount }];
}

/** Date of birth and blood group live on the (hidden) ID card sheet; match by phone. */
function addIdCardDetails(ws: ExcelJS.Worksheet, members: ParsedMember[]) {
  const header = ws.getRow(findRow(ws, (row) => rowHasText(row, "Blood Group")));
  const col = headerColumns(header);
  const [phoneCol, dobCol, bloodCol] = [
    col("Contact Number"),
    col("Date of Birth"),
    col("Blood Group"),
  ];
  ws.eachRow((row) => {
    const phone = text(row.getCell(phoneCol));
    const member = phone && members.find((m) => m.phone === phone);
    if (!member) return;
    member.dateOfBirth = isoDate(value(row.getCell(dobCol)));
    member.bloodGroup = text(row.getCell(bloodCol)) || null;
  });
}

// ---------------------------------------------------------------------------
// Lenders (Bike X, Rana Bhai, …): each sheet is one lender's running account
// ---------------------------------------------------------------------------

function isLenderSheet(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(3);
  return (
    text(header.getCell("A")) === "DATE" &&
    text(header.getCell("C")) === "ADVANCE" &&
    text(header.getCell("D")) === "BILL DEPOSIT"
  );
}

function parseLender(ws: ExcelJS.Worksheet, warnings: string[]): ParsedLender {
  const name = text(ws.getCell("B1")) || ws.name;
  const entries: ParsedLender["entries"] = [];
  let lastDate: string | null = null;
  let expectedOutstanding = 0;

  for (let r = 4; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const description = text(row.getCell("B"));
    const advance = number(row.getCell("C"));
    const deposit = number(row.getCell("D"));

    // The totals row sums the columns; its balance is what the club owes (negated).
    if (!description && String(formula(row.getCell("C"))).startsWith("SUM(")) {
      expectedOutstanding = -number(row.getCell("E"));
      break;
    }
    if (!description || (!advance && !deposit)) continue;

    const date: string | null = isoDate(value(row.getCell("A"))) ?? lastDate;
    if (!date) throw new Error(`${ws.name} row ${r} has no date.`);
    if (date === lastDate && !value(row.getCell("A"))) {
      warnings.push(`${ws.name} row ${r} ("${description}") has no date; used ${date}.`);
    }
    lastDate = date;

    const remark = text(row.getCell("F"));
    const full = remark ? `${description} (${remark})` : description;
    // BILL DEPOSIT = money the lender put in for the club; ADVANCE = paid back to them.
    if (deposit) entries.push({ date, kind: "borrowed", amount: deposit, description: full });
    if (advance) entries.push({ date, kind: "repaid", amount: advance, description: full });
  }
  return { name, entries, expectedOutstanding };
}

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function sheetStartingWith(wb: ExcelJS.Workbook, prefix: string, suffix = "") {
  const ws = wb.worksheets.find((w) => w.name.startsWith(prefix) && w.name.endsWith(suffix));
  if (!ws) throw new Error(`No sheet named "${prefix}…${suffix}" in the workbook.`);
  return ws;
}

function findRow(ws: ExcelJS.Worksheet, test: (row: ExcelJS.Row) => boolean) {
  for (let r = 1; r <= ws.rowCount; r++) if (test(ws.getRow(r))) return r;
  throw new Error(`Expected row not found in sheet "${ws.name}".`);
}

function rowHasText(row: ExcelJS.Row, wanted: string) {
  let found = false;
  row.eachCell((c) => (found ||= text(c) === wanted));
  return found;
}

/** Returns a lookup from a header's leading text to its column number. */
function headerColumns(row: ExcelJS.Row) {
  const headers: [string, number][] = [];
  row.eachCell((c, i) => headers.push([text(c), i]));
  return (startsWith: string) => {
    const hit = headers.find(([h]) => h.startsWith(startsWith));
    if (!hit) throw new Error(`Column "${startsWith}" not found.`);
    return hit[1];
  };
}

function expectHeader(row: ExcelJS.Row, column: string, startsWith: string) {
  if (!text(row.getCell(column)).startsWith(startsWith)) {
    throw new Error(
      `Member list layout changed: column ${column} should be "${startsWith}…".`,
    );
  }
}

/** Plain value of a cell, using the cached result for formulas. */
function value(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === "object" && !(v instanceof Date)) {
    if ("result" in v) return v.result;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
  }
  return v;
}

function formula(cell: ExcelJS.Cell) {
  const v = cell.value;
  return v && typeof v === "object" && "formula" in v ? v.formula : "";
}

function text(cell: ExcelJS.Cell): string {
  const v = value(cell);
  return v === null || v === undefined ? "" : String(v).trim();
}

function number(cell: ExcelJS.Cell): number {
  const v = value(cell);
  return typeof v === "number" ? round2(v) : 0;
}

/** Cell comment without its "Author:" prefix. */
function noteText(cell: ExcelJS.Cell): string | null {
  const note = cell.note;
  if (!note) return null;
  const runs = typeof note === "string" ? [{ text: note, font: {} }] : (note.texts ?? []);
  const withoutAuthor =
    runs.length > 1 && runs[0].font?.bold && runs[0].text.trim().endsWith(":")
      ? runs.slice(1)
      : runs;
  const joined = withoutAuthor
    .map((r) => r.text)
    .join("")
    .split(/\s*\n\s*/)
    .filter(Boolean)
    .join(" ")
    .trim();
  return joined || null;
}

function isoDate(v: unknown): string | null {
  // Excel dates arrive as UTC midnight.
  return v instanceof Date ? v.toISOString().slice(0, 10) : null;
}

function validDate(year: number, month: number, day: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, day));
  const ok = d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
  return ok && year >= 2020 && year <= 2100 ? d.toISOString().slice(0, 10) : null;
}

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/** "February\n2026", "Received in July 2026", "Dues Till Dec 2025" → { year, month }. */
function monthFromHeader(header: string) {
  const m = /([A-Za-z]{3,})\s+(\d{4})/.exec(header.replace(/\s+/g, " "));
  const month = m && MONTH_NAMES.findIndex((n) => n.startsWith(m[1].toLowerCase())) + 1;
  if (!m || !month) throw new Error(`No month in header "${header}".`);
  return { year: Number(m[2]), month };
}

function lastDayOfMonth({ year, month }: { year: number; month: number }) {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** "Tishan bhia" → "Tishan Bhai", "JAS Bhai" → "Jas Bhai". */
function normalizeName(name: string): string | null {
  if (!name) return null;
  return name
    .replace(/\bbhia\b/i, "bhai")
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const pad = (n: number) => String(n).padStart(2, "0");
const round2 = (n: number) => Math.round(n * 100) / 100;
