import Link from "next/link";
import { ColumnChart } from "@/components/charts";
import { CategoryBars, ChartTable } from "@/components/category-bars";
import { FilterForm } from "@/components/client";
import { Card, LinkButton, PageHeader, Select, SignedAmount, StatTile, Table, Td, Th } from "@/components/ui";
import { currentYear, formatDate, formatMoney, formatTaka, monthLabel, round2 } from "@/lib/format";
import {
  getOverview,
  listTransactions,
  listYears,
  totalsByCategory,
  totalsByMonth,
  totalsByYear,
  totalsForYear,
} from "@/lib/queries/cash-book";
import { listMembersWithDues } from "@/lib/queries/members";
import { intParam } from "@/lib/search-params";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const year = intParam(await searchParams, "year");
  const thisYear = currentYear();

  const [user, overview, members, years, totals, byCategory, recent, periods] = await Promise.all([
    getCurrentUser(),
    getOverview(),
    listMembersWithDues(thisYear),
    listYears(),
    totalsForYear(year),
    totalsByCategory(year),
    listTransactions({}, 1),
    year
      ? totalsByMonth(year).then((rows) =>
          // Every month appears, even ones with no entries.
          Array.from({ length: 12 }, (_, i) => {
            const row = rows.find((r) => r.month === i + 1);
            return { label: monthLabel(i + 1), income: row?.income ?? 0, expense: row?.expense ?? 0 };
          }),
        )
      : totalsByYear().then((rows) => rows.map((r) => ({ label: String(r.year), ...r }))),
  ]);

  const active = members.filter((m) => m.isActive);
  const owed = round2(active.reduce((s, m) => s + Math.max(0, m.due), 0));
  const owing = active.filter((m) => m.due > 0).length;
  const scope = year ? String(year) : "all years";
  const cashBookLink = (categoryId: number) =>
    `/cash-book?category=${categoryId}${year ? `&year=${year}` : ""}`;

  return (
    <>
      <PageHeader
        title="Dashboard"
        actions={
          user && (
            <LinkButton href="/cash-book/new" variant="primary">
              + Add cash book entry
            </LinkButton>
          )
        }
      />

      <section aria-label="Club position today" className="mb-8 grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2">
          <StatTile
            hero
            label="Cash at hand"
            value={formatTaka(overview.cashAtHand)}
            hint={`Profit/loss ${formatTaka(overview.net)} + owed to lenders ${formatTaka(overview.accountsPayable)}`}
          />
        </div>
        <StatTile
          label="Owed to lenders"
          value={formatTaka(overview.accountsPayable)}
          hint={<Link href="/loans" className="underline">See loans</Link>}
        />
        <StatTile
          label={`Members owe (${thisYear})`}
          value={formatTaka(owed)}
          hint={
            <Link href={`/members?owing=on`} className="underline">
              {owing} of {active.length} members
            </Link>
          }
        />
      </section>

      <FilterForm className="mb-4 flex flex-wrap items-end gap-3" aria-label="Choose period">
        <div>
          <label htmlFor="year" className="mb-1 block text-xs font-medium text-ink-secondary">
            Period
          </label>
          <Select id="year" name="year" defaultValue={year ?? ""} className="w-auto">
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        <noscript>
          <button type="submit" className="h-10 rounded-md border border-line-strong px-3 text-sm">
            Show
          </button>
        </noscript>
      </FilterForm>

      <section aria-label={`Totals for ${scope}`} className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label={`Income, ${scope}`} value={formatTaka(totals.income)} />
        <StatTile label={`Expenses, ${scope}`} value={formatTaka(totals.expense)} />
        <StatTile label={`Profit / loss, ${scope}`} value={formatTaka(totals.net)} />
      </section>

      <Card
        title={year ? `Income and expenses by month, ${year}` : "Income and expenses by year"}
        className="mb-6"
      >
        <ColumnChart
          label={year ? `Income and expenses by month in ${year}` : "Income and expenses by year"}
          categories={periods.map((p) => p.label)}
          series={[
            { key: "income", label: "Income", values: periods.map((p) => p.income) },
            { key: "expense", label: "Expenses", values: periods.map((p) => p.expense) },
          ]}
        />
        <ChartTable caption="Income and expenses" rows={periods} />
      </Card>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title={`Income by category, ${scope}`}>
          <CategoryBars
            type="income"
            items={byCategory.filter((c) => c.type === "income")}
            hrefFor={cashBookLink}
          />
        </Card>
        <Card title={`Expenses by category, ${scope}`}>
          <CategoryBars
            type="expense"
            items={byCategory.filter((c) => c.type === "expense")}
            hrefFor={cashBookLink}
          />
        </Card>
      </div>

      <Card
        title="Latest entries"
        actions={
          <LinkButton href="/cash-book" size="sm">
            Open cash book
          </LinkButton>
        }
        padded={false}
      >
        <Table>
          <thead>
            <tr>
              <Th className="hidden sm:table-cell">Date</Th>
              <Th>Particulars</Th>
              <Th className="hidden sm:table-cell">Category</Th>
              <Th align="right" className="hidden sm:table-cell">Cash in</Th>
              <Th align="right" className="hidden sm:table-cell">Cash out</Th>
              <Th align="right" className="sm:hidden">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {recent.rows.slice(0, 8).map((t) => (
              <tr key={t.id}>
                <Td className="hidden whitespace-nowrap text-ink-secondary sm:table-cell">{formatDate(t.date)}</Td>
                <Td>
                  {t.particulars}
                  <p className="text-xs text-ink-muted sm:hidden">
                    {formatDate(t.date)} · {t.categoryName}
                  </p>
                </Td>
                <Td className="hidden text-ink-secondary sm:table-cell">{t.categoryName}</Td>
                <Td align="right" className="hidden sm:table-cell">
                  {t.type === "income" ? formatMoney(t.amount) : ""}
                </Td>
                <Td align="right" className="hidden sm:table-cell">
                  {t.type === "expense" ? formatMoney(t.amount) : ""}
                </Td>
                <Td align="right" className="sm:hidden">
                  <SignedAmount value={t.amount} negative={t.type === "expense"} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
