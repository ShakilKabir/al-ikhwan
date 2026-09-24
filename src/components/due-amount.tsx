import { formatMoney } from "@/lib/format";

/** What a member owes: the amount, "Paid up", or an advance they have paid. */
export function DueAmount({ due }: { due: number }) {
  if (due > 0) return <span className="font-semibold">{formatMoney(due)}</span>;
  if (due < 0) return <span className="text-ink-secondary">{formatMoney(-due)} advance</span>;
  return (
    <span className="text-success-ink">
      <span aria-hidden>✓ </span>Paid up
    </span>
  );
}
