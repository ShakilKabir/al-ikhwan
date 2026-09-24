"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/client";
import { Alert, buttonClass, Field, Input, Select } from "@/components/ui";
import type { LedgerKind } from "@/db/schema";
import type { FormState } from "@/lib/actions";
import { LEDGER_KIND_LABELS } from "@/lib/member-labels";
import { saveLedgerEntry } from "@/app/members/actions";

const HINTS: Record<LedgerKind, string> = {
  yearly_fee: "The fee for one year. A member can be charged it only once per year.",
  charge: "Anything else they owe, e.g. an unpaid registration fee.",
  waiver: "Reduces what they owe, e.g. a 65% waiver for students.",
  payment:
    "Only for money that doesn't go through the cash book (e.g. settled against a loan). For cash received, use \"Record payment\" on the member's page instead.",
  opening_balance: "Dues brought in from before the website. Use a negative amount for an advance.",
};

const ORDER: LedgerKind[] = ["yearly_fee", "charge", "waiver", "payment", "opening_balance"];

export type LedgerEntryFormValues = {
  kind: LedgerKind;
  date: string;
  amount: string;
  description: string;
};

export function LedgerEntryForm({
  memberId,
  entryId,
  initial,
}: {
  memberId: number;
  entryId: number | null;
  initial: LedgerEntryFormValues;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveLedgerEntry.bind(null, memberId, entryId),
    {},
  );
  const values = { ...initial, ...state.values } as LedgerEntryFormValues;
  const errors = state.fieldErrors ?? {};
  const [kind, setKind] = useState<LedgerKind>(values.kind);

  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <Field label="Type" htmlFor="kind" error={errors.kind} hint={HINTS[kind]} className="sm:col-span-2">
        <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as LedgerKind)}>
          {ORDER.map((k) => (
            <option key={k} value={k}>
              {k === "payment" ? "Payment outside the cash book" : LEDGER_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date" htmlFor="date" error={errors.date}>
        <Input id="date" name="date" type="date" required defaultValue={values.date} aria-invalid={!!errors.date} />
      </Field>
      <Field label="Amount (৳)" htmlFor="amount" error={errors.amount}>
        <Input
          id="amount"
          name="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          required
          defaultValue={values.amount}
          aria-invalid={!!errors.amount}
        />
      </Field>
      <Field label="Description (optional)" htmlFor="description" error={errors.description} className="sm:col-span-2">
        <Input id="description" name="description" maxLength={300} defaultValue={values.description} />
      </Field>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{entryId ? "Save changes" : "Add"}</SubmitButton>
        <Link href={`/members/${memberId}`} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
