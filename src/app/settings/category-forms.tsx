"use client";

import { useActionState } from "react";
import { ConfirmButton, SubmitButton } from "@/components/client";
import { Input, Select } from "@/components/ui";
import type { FormState } from "@/lib/actions";
import { removeCategory, saveCategory } from "./actions";

type Category = { id: number; name: string; type: "income" | "expense"; transactionCount: number };

export function CategoryRow({ category }: { category: Category }) {
  const [state, action] = useActionState<FormState, FormData>(saveCategory.bind(null, category.id), {});
  const values = { name: category.name, type: category.type, ...state.values };
  const error = state.error ?? Object.values(state.fieldErrors ?? {}).flat()[0];

  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 last:border-b-0">
      <form key={JSON.stringify(state.values ?? {})} action={action} className="flex flex-1 flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`name-${category.id}`}>
          Name
        </label>
        <Input id={`name-${category.id}`} name="name" defaultValue={values.name} required className="min-w-48 flex-1" />
        <label className="sr-only" htmlFor={`type-${category.id}`}>
          Type
        </label>
        <Select
          id={`type-${category.id}`}
          name="type"
          defaultValue={values.type}
          className="w-auto"
          disabled={category.transactionCount > 0}
          title={category.transactionCount > 0 ? "Can't change: this category has entries" : undefined}
        >
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
        {category.transactionCount > 0 && <input type="hidden" name="type" value={category.type} />}
        <span className="w-20 text-xs text-ink-muted">{category.transactionCount} entries</span>
        <SubmitButton variant="secondary" size="sm">
          Save
        </SubmitButton>
      </form>
      {category.transactionCount === 0 && (
        <ConfirmButton action={removeCategory.bind(null, category.id)} confirm={`Delete category "${category.name}"?`}>
          Delete
        </ConfirmButton>
      )}
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </li>
  );
}

export function AddCategoryForm() {
  const [state, action] = useActionState<FormState, FormData>(saveCategory.bind(null, null), {});
  const error = state.error ?? Object.values(state.fieldErrors ?? {}).flat()[0];

  return (
    <form action={action} className="flex flex-wrap items-center gap-2 px-4 py-3">
      <label className="sr-only" htmlFor="new-category-name">
        New category name
      </label>
      <Input id="new-category-name" name="name" placeholder="New category name" required className="min-w-48 flex-1" />
      <label className="sr-only" htmlFor="new-category-type">
        Type
      </label>
      <Select id="new-category-type" name="type" defaultValue="expense" className="w-auto">
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </Select>
      <SubmitButton size="sm">Add category</SubmitButton>
      {error && <p className="w-full text-xs text-danger">{error}</p>}
    </form>
  );
}
