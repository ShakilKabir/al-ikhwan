"use server";

import {
  createLender,
  createLoanEntry,
  deleteLender,
  deleteLoanEntry,
  updateLender,
  updateLoanEntry,
} from "@/lib/services/loans";
import { lenderSchema, loanEntrySchema, parseForm } from "@/lib/validation";
import {
  getActor,
  runAndRedirect,
  saveAndRedirect,
  typedValues,
  type FormState,
} from "@/lib/actions";

export async function saveLender(
  id: number | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getActor();
  const { data, fieldErrors, raw } = parseForm(lenderSchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };

  return saveAndRedirect(
    () => (id ? updateLender(id, data, actor) : createLender(data, actor)),
    values,
    (lender) => `/loans/${lender.id}`,
  );
}

export async function removeLender(id: number) {
  const actor = await getActor();
  await runAndRedirect(() => deleteLender(id, actor), "/loans", `/loans/${id}`);
}

export async function saveLoanEntry(
  lenderId: number,
  entryId: number | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getActor();
  const { data, fieldErrors, raw } = parseForm(loanEntrySchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };

  return saveAndRedirect(
    () => (entryId ? updateLoanEntry(entryId, data, actor) : createLoanEntry(lenderId, data, actor)),
    values,
    `/loans/${lenderId}`,
  );
}

export async function removeLoanEntry(lenderId: number, entryId: number) {
  const actor = await getActor();
  await runAndRedirect(
    () => deleteLoanEntry(entryId, actor),
    `/loans/${lenderId}`,
    `/loans/${lenderId}/entries/${entryId}/edit`,
  );
}
