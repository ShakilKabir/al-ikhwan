"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/client";
import { Alert, buttonClass, Field, Input, Select, Textarea } from "@/components/ui";
import type { FormState } from "@/lib/actions";
import { saveTransaction } from "./actions";

type Category = { id: number; name: string; type: "income" | "expense" };
type MemberOption = { id: number; code: string; name: string; isActive: boolean };

export type TransactionFormValues = {
  date: string;
  categoryId: string;
  particulars: string;
  amount: string;
  memberId: string;
  notes: string;
};

export function TransactionForm({
  id,
  initial,
  categories,
  members,
  returnTo,
}: {
  id: number | null;
  initial: TransactionFormValues;
  categories: Category[];
  members: MemberOption[];
  returnTo: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveTransaction.bind(null, id), {});
  const values = { ...initial, ...state.values } as TransactionFormValues;
  const errors = state.fieldErrors ?? {};
  const [categoryId, setCategoryId] = useState(values.categoryId);
  const isIncome = categories.find((c) => String(c.id) === categoryId)?.type === "income";
  // After a failed save React resets the form; the key re-applies what was typed.
  const formKey = JSON.stringify(state.values ?? {});

  return (
    <form key={formKey} action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="returnTo" value={returnTo} />
      {state.error && (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}

      <Field label="Date" htmlFor="date" error={errors.date}>
        <Input id="date" name="date" type="date" required defaultValue={values.date} aria-invalid={!!errors.date} />
      </Field>

      <Field label="Category" htmlFor="categoryId" error={errors.categoryId}>
        <Select
          id="categoryId"
          name="categoryId"
          required
          defaultValue={values.categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-invalid={!!errors.categoryId}
        >
          <option value="">Choose…</option>
          {(["income", "expense"] as const).map((type) => (
            <optgroup key={type} label={type === "income" ? "Income (cash in)" : "Expenses (cash out)"}>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </Select>
      </Field>

      <Field label="Particulars" htmlFor="particulars" error={errors.particulars} className="sm:col-span-2">
        <Input
          id="particulars"
          name="particulars"
          required
          maxLength={200}
          placeholder="e.g. Rana Bhai, Field rent for Friday"
          defaultValue={values.particulars}
          aria-invalid={!!errors.particulars}
        />
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

      {isIncome ? (
        <Field
          label="Paid by member (optional)"
          htmlFor="memberId"
          error={errors.memberId}
          hint="Choose a member if this pays their dues. It will show on their page."
        >
          <Select id="memberId" name="memberId" defaultValue={values.memberId}>
            <option value="">Not a member payment</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.code}){m.isActive ? "" : " · inactive"}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="hidden sm:block" />
      )}

      <Field label="Notes (optional)" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
        <Textarea id="notes" name="notes" maxLength={1000} defaultValue={values.notes} />
      </Field>

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{id ? "Save changes" : "Save entry"}</SubmitButton>
        {!id && (
          <button type="submit" name="next" value="another" className={buttonClass("secondary")}>
            Save &amp; add another
          </button>
        )}
        <Link href={returnTo} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
