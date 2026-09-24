/**
 * One-time import of the club spreadsheet into the database.
 *
 *   npm run import:xlsx -- "path/to/Al-Ikhwan Income and expenses.xlsx"
 *   npm run import:xlsx -- "path/to/file.xlsx" --replace   # wipe existing data first
 *
 * Uses DATABASE_URL (from the environment or .env.local). After loading, it
 * recomputes cash at hand and every member's dues with the app's own queries
 * and compares them with the figures in the spreadsheet.
 */
import { basename } from "node:path";
import { count, sql } from "drizzle-orm";

try {
  process.loadEnvFile(".env.local");
} catch {}

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error('Usage: npm run import:xlsx -- "<workbook.xlsx>" [--replace]');
  process.exit(1);
}

async function main() {
  // Imported after the environment is loaded, because @/db connects on import.
  const { db, pool } = await import("@/db");
  const schema = await import("@/db/schema");
  const { parseWorkbook } = await import("./import/parse-workbook");
  const { getOverview } = await import("@/lib/queries/cash-book");
  const { listMembersWithDues } = await import("@/lib/queries/members");
  const { round2 } = await import("@/lib/format");

  const wb = await parseWorkbook(file);

  const [{ existing }] = await db.select({ existing: count() }).from(schema.transactions);
  if (existing > 0 && !flags.includes("--replace")) {
    console.error(`The database already has ${existing} transactions. Re-run with --replace to wipe it first.`);
    await pool.end();
    process.exit(1);
  }

  await db.transaction(async (tx) => {
    if (flags.includes("--replace")) {
      await tx.execute(sql`truncate audit_log, loan_entries, lenders, transactions, categories, member_ledger, members restart identity cascade`);
    }

    const memberRows = await tx
      .insert(schema.members)
      .values(wb.members.map(({ ledger: _l, expectedDue: _d, ...m }) => m))
      .returning({ id: schema.members.id, code: schema.members.code });
    const memberId = new Map(memberRows.map((m) => [m.code, m.id]));
    await tx.insert(schema.memberLedger).values(
      wb.members.flatMap((m) =>
        m.ledger.map((e) => ({ ...e, memberId: memberId.get(m.code)! })),
      ),
    );

    const categoryNames = [...new Map(wb.transactions.map((t) => [t.category, t.type]))];
    const categoryRows = await tx
      .insert(schema.categories)
      .values(categoryNames.map(([name, type]) => ({ name, type })))
      .returning({ id: schema.categories.id, name: schema.categories.name });
    const categoryId = new Map(categoryRows.map((c) => [c.name, c.id]));
    await tx.insert(schema.transactions).values(
      wb.transactions.map(({ category, ...t }) => ({ ...t, categoryId: categoryId.get(category)! })),
    );

    for (const lender of wb.lenders) {
      const [{ id }] = await tx
        .insert(schema.lenders)
        .values({ name: lender.name })
        .returning({ id: schema.lenders.id });
      if (lender.entries.length) {
        await tx.insert(schema.loanEntries).values(lender.entries.map((e) => ({ ...e, lenderId: id })));
      }
    }

    await tx.insert(schema.auditLog).values({
      actor: "Spreadsheet import",
      action: "import",
      entity: "all",
      summary: `Imported ${wb.transactions.length} cash book entries, ${wb.members.length} members and ${wb.lenders.length} lender accounts from "${basename(file)}".`,
      after: { warnings: wb.warnings },
    });
  });

  // ---------------------------------------------------------------------------
  // Check the result against the spreadsheet's own figures
  // ---------------------------------------------------------------------------

  const problems: string[] = [];
  const overview = await getOverview();
  if (overview.cashAtHand !== wb.expected.cashAtHand) {
    problems.push(`Cash at hand is ${overview.cashAtHand}, the spreadsheet says ${wb.expected.cashAtHand}.`);
  }

  const feeYear = Number(wb.members.flatMap((m) => m.ledger).find((e) => e.kind === "yearly_fee")?.date.slice(0, 4));
  const dues = await listMembersWithDues(feeYear);
  for (const m of wb.members) {
    const row = dues.find((d) => d.code === m.code)!;
    if (row.due !== m.expectedDue) problems.push(`${m.code} ${m.name} owes ${row.due}, the spreadsheet says ${m.expectedDue}.`);
  }
  const regularDue = round2(dues.filter((d) => d.category === "regular").reduce((s, d) => s + d.due, 0));
  if (regularDue !== wb.expected.regularMembersDue) {
    problems.push(`Regular members owe ${regularDue} in total, the spreadsheet says ${wb.expected.regularMembersDue}.`);
  }

  console.log(`Imported ${wb.transactions.length} cash book entries, ${wb.members.length} members, ${wb.lenders.length} lenders.`);
  console.log(`Income ${overview.income}, expenses ${overview.expense}, accounts payable ${overview.accountsPayable}, cash at hand ${overview.cashAtHand}.`);
  console.log(`Regular members owe ${regularDue} for ${feeYear}.`);
  for (const w of wb.warnings) console.log(`Note: ${w}`);
  for (const p of problems) console.error(`MISMATCH: ${p}`);
  console.log(problems.length ? "Import finished with mismatches." : "All figures match the spreadsheet.");

  await pool.end();
  process.exit(problems.length ? 1 : 0);
}

void main();
