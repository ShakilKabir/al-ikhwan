import type { Metadata } from "next";
import Link from "next/link";
import { FilterForm } from "@/components/client";
import {
  Alert,
  Badge,
  buttonClass,
  Card,
  EmptyState,
  Input,
  LinkButton,
  Money,
  PageHeader,
  Select,
  SignedAmount,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { formatDate, formatMoney, MONTH_NAMES } from "@/lib/format";
import {
  getOverview,
  listCategories,
  listTransactions,
  listYears,
  PAGE_SIZE,
  type TransactionFilters,
} from "@/lib/queries/cash-book";
import { intParam, param, withParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Cash book" };

export default async function CashBookPage({ searchParams }: PageProps<"/cash-book">) {
  const sp = await searchParams;
  const type = param(sp, "type");
  const filters: TransactionFilters = {
    year: intParam(sp, "year"),
    month: intParam(sp, "month"),
    categoryId: intParam(sp, "category"),
    type: type === "income" || type === "expense" ? type : undefined,
    q: param(sp, "q"),
  };
  const page = intParam(sp, "page") ?? 1;

  const [overview, list, categories, years] = await Promise.all([
    getOverview(),
    listTransactions(filters, page),
    listCategories(),
    listYears(),
  ]);
  const filtered = Object.values(filters).some((v) => v !== undefined);
  const here = withParams("/cash-book", sp, {});
  const lastPage = Math.max(1, Math.ceil(list.count / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Cash book"
        description="Every taka in and out of the club."
        actions={
          <>
            <LinkButton href="/export" prefetch={false}>
              Download Excel
            </LinkButton>
            <LinkButton href={`/cash-book/new?returnTo=${encodeURIComponent(here)}`} variant="primary">
              + Add entry
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Cash at hand"
          value={`৳ ${formatMoney(overview.cashAtHand)}`}
          hint="Profit/loss plus money owed to lenders"
        />
        <StatTile
          label="Profit / loss, all time"
          value={`৳ ${formatMoney(overview.net)}`}
          hint={`Income ${formatMoney(overview.income)} · Expenses ${formatMoney(overview.expense)}`}
        />
        <StatTile
          label="Accounts payable"
          value={`৳ ${formatMoney(overview.accountsPayable)}`}
          hint={
            <Link href="/loans" className="underline">
              Owed to lenders
            </Link>
          }
        />
      </div>

      {param(sp, "error") && (
        <div className="mb-4">
          <Alert>{param(sp, "error")}</Alert>
        </div>
      )}

      <Card padded={false}>
        <FilterForm className="flex flex-wrap items-end gap-2 border-b border-line p-3" aria-label="Filter entries">
          <div className="w-full sm:w-56">
            <label htmlFor="q" className="sr-only">
              Search
            </label>
            <Input id="q" name="q" type="search" placeholder="Search particulars or notes" defaultValue={filters.q} />
          </div>
          <FilterSelect name="year" label="Year" value={filters.year}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect name="month" label="Month" value={filters.month}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect name="type" label="In/out" value={filters.type}>
            <option value="income">Cash in</option>
            <option value="expense">Cash out</option>
          </FilterSelect>
          <FilterSelect name="category" label="Category" value={filters.categoryId}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <button type="submit" className={buttonClass("secondary")}>
            Search
          </button>
          {filtered && (
            <Link href="/cash-book" className={buttonClass("ghost")}>
              Clear
            </Link>
          )}
        </FilterForm>

        <p className="border-b border-line px-3 py-2 text-sm text-ink-secondary">
          {list.count} {list.count === 1 ? "entry" : "entries"}
          {filtered ? " match" : ""} · In <Money value={list.income} /> · Out <Money value={list.expense} /> · Net{" "}
          <Money value={list.net} className="font-medium text-ink" />
        </p>

        {list.rows.length === 0 ? (
          <EmptyState>No entries {filtered ? "match these filters" : "yet"}.</EmptyState>
        ) : (
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
              {list.rows.map((t) => (
                <tr key={t.id} className="hover:bg-surface-muted">
                  <Td className="hidden whitespace-nowrap text-ink-secondary sm:table-cell">{formatDate(t.date)}</Td>
                  <Td className="sm:max-w-md">
                    <Link
                      href={`/cash-book/${t.id}/edit?returnTo=${encodeURIComponent(here)}`}
                      className="font-medium hover:underline"
                    >
                      {t.particulars}
                    </Link>
                    {t.memberId && (
                      <span className="ml-2">
                        <Badge tone="accent">
                          <Link href={`/members/${t.memberId}`}>{t.memberCode}</Link>
                        </Badge>
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-ink-muted sm:hidden">
                      {formatDate(t.date)} · {t.categoryName}
                    </p>
                    {t.notes && <p className="mt-0.5 text-xs text-ink-muted">{t.notes}</p>}
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
            {/* On phones the summary line above already shows the totals. */}
            <tfoot className="hidden sm:table-footer-group">
              <tr className="font-semibold">
                <Td colSpan={3}>Total{filtered ? " (filtered)" : ""}</Td>
                <Td align="right">{formatMoney(list.income)}</Td>
                <Td align="right">{formatMoney(list.expense)}</Td>
              </tr>
            </tfoot>
          </Table>
        )}

        {lastPage > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-2 p-3 text-sm">
            <span className="text-ink-muted">
              Page {page} of {lastPage}
            </span>
            <span className="flex gap-2">
              {page > 1 && (
                <LinkButton size="sm" href={withParams("/cash-book", sp, { page: page - 1 })}>
                  ← Newer
                </LinkButton>
              )}
              {page < lastPage && (
                <LinkButton size="sm" href={withParams("/cash-book", sp, { page: page + 1 })}>
                  Older →
                </LinkButton>
              )}
            </span>
          </nav>
        )}
      </Card>
    </>
  );
}

function FilterSelect({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string | number | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium text-ink-secondary">
        {label}
      </label>
      <Select id={name} name={name} defaultValue={value ?? ""} className="w-auto">
        <option value="">All</option>
        {children}
      </Select>
    </div>
  );
}
