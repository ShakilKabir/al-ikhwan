/** Small coloured markers shown only on phones, where tables collapse to lists. */
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { MemberCategory } from "@/db/schema";

// Written out in full so Tailwind generates them.
const CATEGORY_CHIP: Record<MemberCategory, string> = {
  regular: "max-sm:bg-accent-soft max-sm:text-accent",
  executive: "max-sm:bg-income-soft max-sm:text-income-ink",
  advisor: "max-sm:bg-violet-soft max-sm:text-violet-ink",
  prospective: "max-sm:bg-surface-muted max-sm:text-ink-secondary",
};

/** A member's ID; on phones a chip in their category's colour. */
export function MemberCode({ code, category }: { code: string; category: MemberCategory }) {
  return (
    <span
      className={`max-sm:inline-block max-sm:rounded-md max-sm:px-1.5 max-sm:py-0.5 max-sm:text-xs max-sm:font-semibold ${CATEGORY_CHIP[category]}`}
    >
      {code}
    </span>
  );
}

/** Arrow in for money received, arrow out for money spent. */
export function FlowIcon({ type }: { type: "income" | "expense" }) {
  const Icon = type === "income" ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      aria-hidden
      className={`flex size-9 shrink-0 items-center justify-center rounded-full sm:hidden ${
        type === "income" ? "bg-income-soft text-income-ink" : "bg-expense-soft text-expense-ink"
      }`}
    >
      <Icon className="size-4" strokeWidth={2.5} />
    </span>
  );
}
