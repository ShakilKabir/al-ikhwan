"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import { Alert, buttonClass, Field, Input, Select, Textarea } from "@/components/ui";
import type { LoanEntryKind } from "@/db/schema";
import type { FormState } from "@/lib/actions";
import { saveLender, saveLoanEntry } from "./actions";

export function LenderForm({
  id,
  initial,
  cancelHref,
}: {
  id: number | null;
  initial: { name: string; notes: string };
  cancelHref: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveLender.bind(null, id), {});
  const values = { ...initial, ...state.values };
  const errors = state.fieldErrors ?? {};

  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="grid max-w-xl gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" required maxLength={100} defaultValue={values.name} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Notes (optional)" htmlFor="notes" error={errors.notes}>
        <Textarea id="notes" name="notes" maxLength={1000} defaultValue={values.notes} />
      </Field>
      <div className="flex gap-2">
        <SubmitButton>{id ? "Save changes" : "Add lender"}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function LoanEntryForm({
  lenderId,
  entryId,
  initial,
}: {
  lenderId: number;
  entryId: number | null;
  initial: { kind: LoanEntryKind; date: string; amount: string; description: string };
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveLoanEntry.bind(null, lenderId, entryId),
    {},
  );
  const values = { ...initial, ...state.values };
  const errors = state.fieldErrors ?? {};

  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <Field
        label="Type"
        htmlFor="kind"
        error={errors.kind}
        className="sm:col-span-2"
        hint="Borrowed: the lender paid or lent money for the club (also add the expense to the cash book). Repaid: the club paid them back, or a member's fee was settled with them. Don't put repayments in the cash book."
      >
        <Select id="kind" name="kind" defaultValue={values.kind}>
          <option value="borrowed">Borrowed (club owes more)</option>
          <option value="repaid">Repaid (club owes less)</option>
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
          min="0.01"
          required
          defaultValue={values.amount}
          aria-invalid={!!errors.amount}
        />
      </Field>
      <Field label="Description" htmlFor="description" error={errors.description} className="sm:col-span-2">
        <Input
          id="description"
          name="description"
          required
          maxLength={300}
          defaultValue={values.description}
          aria-invalid={!!errors.description}
        />
      </Field>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton>{entryId ? "Save changes" : "Add entry"}</SubmitButton>
        <Link href={`/loans/${lenderId}`} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
