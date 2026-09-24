/**
 * Form input schemas. Server actions parse FormData with these before calling
 * the services in src/lib/services.
 */
import { z } from "zod";
import {
  entryType,
  ledgerKind,
  loanEntryKind,
  memberCategory,
} from "@/db/schema";

const required = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const optionalText = (max = 1000) =>
  z.string().trim().max(max, "Too long").optional().transform((v) => v || null);

const date = z.iso.date({ error: "Enter a valid date" });

const optionalDate = z
  .union([z.literal(""), z.iso.date({ error: "Enter a valid date" })])
  .optional()
  .transform((v) => v || null);

const id = z.coerce.number().int().positive();

const optionalId = z
  .union([z.literal(""), id])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const money = z.coerce
  .number({ error: "Enter an amount" })
  .multipleOf(0.01, "Use at most 2 decimal places")
  .max(9_999_999_999, "Amount is too large");

const positiveMoney = money.positive("Amount must be more than 0");

const optionalMoney = z
  .union([z.literal(""), money.min(0, "Can't be negative")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const transactionSchema = z.object({
  date,
  particulars: required("Particulars"),
  categoryId: id,
  amount: positiveMoney,
  memberId: optionalId,
  notes: optionalText(),
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
  name: required("Name", 100),
  type: z.enum(entryType.enumValues, { error: "Choose income or expense" }),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const memberSchema = z.object({
  code: required("Member ID", 20).transform((v) => v.toUpperCase()),
  oldCode: optionalText(20),
  name: required("Name"),
  category: z.enum(memberCategory.enumValues, { error: "Choose a category" }),
  memberType: optionalText(100),
  phone: optionalText(100),
  registeredOn: optionalDate,
  yearlyFee: optionalMoney,
  assignedTo: optionalText(100),
  bloodGroup: optionalText(10),
  dateOfBirth: optionalDate,
  notes: optionalText(),
  isActive: checkbox,
});
export type MemberInput = z.infer<typeof memberSchema>;

export const ledgerEntrySchema = z
  .object({
    date,
    kind: z.enum(ledgerKind.enumValues, { error: "Choose a type" }),
    amount: money.refine((v) => v !== 0, "Amount can't be 0"),
    description: optionalText(300),
  })
  .refine((e) => e.kind === "opening_balance" || e.amount > 0, {
    path: ["amount"],
    message: "Amount must be more than 0 (only an opening balance can be negative)",
  });
export type LedgerEntryInput = z.infer<typeof ledgerEntrySchema>;

export const lenderSchema = z.object({
  name: required("Name", 100),
  notes: optionalText(),
});
export type LenderInput = z.infer<typeof lenderSchema>;

export const loanEntrySchema = z.object({
  date,
  kind: z.enum(loanEntryKind.enumValues, { error: "Choose borrowed or repaid" }),
  amount: positiveMoney,
  description: required("Description", 300),
});
export type LoanEntryInput = z.infer<typeof loanEntrySchema>;

export type FieldErrors = Partial<Record<string, string[]>>;

/** Parses FormData, returning typed data or per-field messages. */
export function parseForm<T extends z.ZodType>(schema: T, formData: FormData) {
  const raw = Object.fromEntries(
    [...formData.entries()].filter(([key]) => !key.startsWith("$ACTION")),
  );
  const result = schema.safeParse(raw);
  return result.success
    ? { data: result.data as z.infer<T>, raw }
    : { fieldErrors: z.flattenError(result.error).fieldErrors as FieldErrors, raw };
}
