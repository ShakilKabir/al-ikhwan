"use server";

import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/services/transactions";
import { parseForm, transactionSchema } from "@/lib/validation";
import {
  getActor,
  runAndRedirect,
  safePath,
  saveAndRedirect,
  typedValues,
  type FormState,
} from "@/lib/actions";

export async function saveTransaction(
  id: number | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getActor();
  const { data, fieldErrors, raw } = parseForm(transactionSchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };

  const returnTo = safePath(formData.get("returnTo"), "/cash-book");
  // "Save & add another" keeps the date and category for quick entry of a batch.
  const next =
    formData.get("next") === "another"
      ? `/cash-book/new?date=${data.date}&categoryId=${data.categoryId}&returnTo=${encodeURIComponent(returnTo)}&saved=1`
      : returnTo;

  return saveAndRedirect(
    () => (id ? updateTransaction(id, data, actor) : createTransaction(data, actor)),
    values,
    next,
  );
}

export async function removeTransaction(id: number, returnTo: string) {
  const actor = await getActor();
  await runAndRedirect(
    () => deleteTransaction(id, actor),
    safePath(returnTo, "/cash-book"),
    `/cash-book/${id}/edit`,
  );
}
