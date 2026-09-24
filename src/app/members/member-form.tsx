"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/client";
import { Alert, buttonClass, Field, Input, Select, Textarea } from "@/components/ui";
import type { MemberCategory } from "@/db/schema";
import type { FormState } from "@/lib/actions";
import { BLOOD_GROUPS, DEFAULT_YEARLY_FEE, MEMBER_TYPES } from "@/lib/club";
import { CATEGORY_LABELS } from "@/lib/member-labels";
import { saveMember } from "./actions";

export type MemberFormValues = {
  code: string;
  oldCode: string;
  name: string;
  category: MemberCategory;
  memberType: string;
  phone: string;
  registeredOn: string;
  yearlyFee: string;
  assignedTo: string;
  bloodGroup: string;
  dateOfBirth: string;
  notes: string;
  isActive: boolean;
};

export function MemberForm({
  id,
  initial,
  nextCodes,
  assignees,
  cancelHref,
}: {
  id: number | null;
  initial: MemberFormValues;
  /** Suggested IDs per category, used when adding a member. */
  nextCodes?: Record<MemberCategory, string>;
  assignees: string[];
  cancelHref: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveMember.bind(null, id), {});
  const typed = state.values;
  const values: MemberFormValues = typed
    ? { ...initial, ...typed, category: typed.category as MemberCategory, isActive: typed.isActive === "on" }
    : initial;
  const errors = state.fieldErrors ?? {};

  // For a new member, the ID and yearly fee follow the category until edited by hand.
  const [category, setCategory] = useState(values.category);
  const [code, setCode] = useState(values.code);
  const [fee, setFee] = useState(values.yearlyFee);
  const [codeEdited, setCodeEdited] = useState(id !== null);
  const [feeEdited, setFeeEdited] = useState(id !== null);

  function changeCategory(next: MemberCategory) {
    setCategory(next);
    if (!codeEdited && nextCodes) setCode(nextCodes[next]);
    if (!feeEdited) setFee(String(DEFAULT_YEARLY_FEE[next] ?? ""));
  }

  return (
    <form key={JSON.stringify(typed ?? {})} action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}

      <Field label="Name" htmlFor="name" error={errors.name} className="sm:col-span-2">
        <Input id="name" name="name" required maxLength={200} defaultValue={values.name} aria-invalid={!!errors.name} />
      </Field>

      <Field label="Category" htmlFor="category" error={errors.category}>
        <Select
          id="category"
          name="category"
          value={category}
          onChange={(e) => changeCategory(e.target.value as MemberCategory)}
        >
          {(Object.keys(CATEGORY_LABELS) as MemberCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Member ID" htmlFor="code" error={errors.code} hint="R- regular, E- executive, A- advisor, U- under consideration">
        <Input
          id="code"
          name="code"
          required
          maxLength={20}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setCodeEdited(true);
          }}
          aria-invalid={!!errors.code}
        />
      </Field>

      <Field label="Member type" htmlFor="memberType" error={errors.memberType}>
        <Input id="memberType" name="memberType" list="member-types" defaultValue={values.memberType} />
        <datalist id="member-types">
          {MEMBER_TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>

      <Field label="Yearly fee (৳)" htmlFor="yearlyFee" error={errors.yearlyFee} hint="Leave empty if they pay no yearly fee">
        <Input
          id="yearlyFee"
          name="yearlyFee"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={fee}
          onChange={(e) => {
            setFee(e.target.value);
            setFeeEdited(true);
          }}
          aria-invalid={!!errors.yearlyFee}
        />
      </Field>

      <Field label="Phone" htmlFor="phone" error={errors.phone}>
        <Input id="phone" name="phone" type="tel" defaultValue={values.phone} />
      </Field>

      <Field label="Registered on" htmlFor="registeredOn" error={errors.registeredOn}>
        <Input id="registeredOn" name="registeredOn" type="date" defaultValue={values.registeredOn} />
      </Field>

      <Field label="Assigned to" htmlFor="assignedTo" error={errors.assignedTo} hint="Committee member who follows up on dues">
        <Input id="assignedTo" name="assignedTo" list="assignees" defaultValue={values.assignedTo} />
        <datalist id="assignees">
          {assignees.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </Field>

      <Field label="Old ID" htmlFor="oldCode" error={errors.oldCode}>
        <Input id="oldCode" name="oldCode" maxLength={20} defaultValue={values.oldCode} />
      </Field>

      <Field label="Blood group" htmlFor="bloodGroup" error={errors.bloodGroup}>
        <Select id="bloodGroup" name="bloodGroup" defaultValue={values.bloodGroup}>
          <option value="">Unknown</option>
          {BLOOD_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth}>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={values.dateOfBirth} />
      </Field>

      <Field label="Notes" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
        <Textarea id="notes" name="notes" maxLength={1000} defaultValue={values.notes} />
      </Field>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-4" />
          Active member
        </label>
        {id === null && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="chargeYearlyFee" defaultChecked className="size-4" />
            Charge this year&apos;s yearly fee now
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <SubmitButton>{id ? "Save changes" : "Add member"}</SubmitButton>
        <Link href={cancelHref} className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
