"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addLedgerEntry,
  chargeYearlyFees,
  createMember,
  deleteLedgerEntry,
  deleteMember,
  updateLedgerEntry,
  updateMember,
} from "@/lib/services/members";
import { ledgerEntrySchema, memberSchema, parseForm } from "@/lib/validation";
import {
  getActor,
  runAndRedirect,
  saveAndRedirect,
  typedValues,
  type FormState,
} from "@/lib/actions";

export async function saveMember(
  id: number | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { data, fieldErrors, raw } = parseForm(memberSchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };

  const actor = await getActor();
  const chargeYearlyFee = formData.get("chargeYearlyFee") === "on";
  return saveAndRedirect(
    () =>
      id
        ? updateMember(id, data, actor)
        : createMember(data, { chargeYearlyFee }, actor),
    values,
    (member) => `/members/${member.id}`,
  );
}

export async function removeMember(id: number) {
  const actor = await getActor();
  await runAndRedirect(() => deleteMember(id, actor), "/members", `/members/${id}`);
}

export async function saveLedgerEntry(
  memberId: number,
  entryId: number | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { data, fieldErrors, raw } = parseForm(ledgerEntrySchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };

  const actor = await getActor();
  return saveAndRedirect(
    () =>
      entryId
        ? updateLedgerEntry(entryId, data, actor)
        : addLedgerEntry(memberId, data, actor),
    values,
    `/members/${memberId}`,
  );
}

export async function removeLedgerEntry(memberId: number, entryId: number) {
  const actor = await getActor();
  await runAndRedirect(
    () => deleteLedgerEntry(entryId, actor),
    `/members/${memberId}`,
    `/members/${memberId}/entries/${entryId}/edit`,
  );
}

export async function chargeFees(year: number) {
  const charged = await chargeYearlyFees(year, await getActor());
  revalidatePath("/", "layout");
  redirect(`/members?year=${year}&charged=${charged}`);
}
