/** Display names for member data. Safe to import from client components. */
import type { LedgerKind, MemberCategory } from "@/db/schema";

export const CATEGORY_LABELS: Record<MemberCategory, string> = {
  regular: "Regular",
  executive: "Executive",
  advisor: "Advisor",
  prospective: "Under consideration",
};

export const CATEGORY_CODE_PREFIX: Record<MemberCategory, string> = {
  regular: "R",
  executive: "E",
  advisor: "A",
  prospective: "U",
};

export const LEDGER_KIND_LABELS: Record<LedgerKind, string> = {
  opening_balance: "Opening balance",
  yearly_fee: "Yearly fee",
  charge: "Other charge",
  waiver: "Waiver",
  payment: "Payment",
};

/** Kinds that reduce what a member owes. Everything else increases it. */
export const CREDIT_KINDS: readonly LedgerKind[] = ["waiver", "payment"];
