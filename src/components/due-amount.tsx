import { formatMoney } from "@/lib/format";

/**
 * What a member owes: the amount, "Paid up", or an advance they have paid.
 * On phones it is a coloured pill; on larger screens plain text.
 */
export function DueAmount({ due }: { due: number }) {
  const pill = "max-sm:inline-block max-sm:rounded-full max-sm:px-2.5 max-sm:py-0.5 max-sm:text-sm";
  if (due > 0) {
    return (
      <span className={`font-semibold ${pill} max-sm:bg-expense-soft max-sm:text-expense-ink`}>
        {formatMoney(due)}
      </span>
    );
  }
  if (due < 0) {
    return (
      <span className={`text-ink-secondary ${pill} max-sm:bg-income-soft max-sm:text-income-ink`}>
        {formatMoney(-due)} advance
      </span>
    );
  }
  return (
    <span className={`text-success-ink ${pill} max-sm:bg-accent-soft max-sm:font-medium`}>
      <span aria-hidden>✓ </span>Paid up
    </span>
  );
}
