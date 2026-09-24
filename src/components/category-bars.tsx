import Link from "next/link";
import { formatMoney } from "@/lib/format";

/** Categories ranked by total, one colour per chart (income blue, expenses orange). */
export function CategoryBars({
  items,
  type,
  hrefFor,
}: {
  items: { id: number; name: string; total: number }[];
  type: "income" | "expense";
  hrefFor: (id: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.total));
  const color = type === "income" ? "var(--income)" : "var(--expense)";
  if (items.length === 0) return <p className="py-6 text-center text-sm text-ink-muted">Nothing in this period.</p>;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={hrefFor(item.id)} className="group block">
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink-secondary group-hover:text-ink group-hover:underline">{item.name}</span>
              <span className="tabular font-medium">{formatMoney(item.total)}</span>
            </div>
            <div className="h-2.5 w-full">
              <div
                className="h-full rounded-r-[4px]"
                style={{ width: `${Math.max(0.5, (item.total / max) * 100)}%`, background: color }}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The accessible twin of a chart: the same numbers as a table. */
export function ChartTable({
  caption,
  rows,
}: {
  caption: string;
  rows: { label: string; income: number; expense: number }[];
}) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-ink-secondary hover:text-ink">Show as table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-left text-xs text-ink-secondary">
              <th scope="col" className="py-1 pr-3 font-semibold">Period</th>
              <th scope="col" className="py-1 pr-3 text-right font-semibold">Income</th>
              <th scope="col" className="py-1 pr-3 text-right font-semibold">Expenses</th>
              <th scope="col" className="py-1 text-right font-semibold">Net</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line">
                <th scope="row" className="py-1 pr-3 text-left font-normal">{r.label}</th>
                <td className="py-1 pr-3 text-right">{formatMoney(r.income)}</td>
                <td className="py-1 pr-3 text-right">{formatMoney(r.expense)}</td>
                <td className="py-1 text-right">{formatMoney(r.income - r.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
