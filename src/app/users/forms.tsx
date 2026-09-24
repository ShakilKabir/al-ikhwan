"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import { Alert, buttonClass, Field, Input, Select } from "@/components/ui";
import type { UserRole } from "@/db/schema";
import type { FormState } from "@/lib/actions";
import { addUser, resetUserPassword, saveUser } from "./actions";

function RoleSelect({ defaultValue }: { defaultValue: UserRole }) {
  return (
    <Select id="role" name="role" defaultValue={defaultValue}>
      <option value="editor">Editor: can add and change entries</option>
      <option value="admin">Admin: can also manage users</option>
    </Select>
  );
}

/** `suggestedPassword` is generated on the server; the admin shares it with the new user. */
export function AddUserForm({ suggestedPassword }: { suggestedPassword: string }) {
  const [state, action] = useActionState<FormState, FormData>(addUser, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" required defaultValue={state.values?.name} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Username" htmlFor="username" error={errors.username} hint="What they'll type to log in, e.g. email or phone">
        <Input id="username" name="username" required autoCapitalize="none" defaultValue={state.values?.username} aria-invalid={!!errors.username} />
      </Field>
      <Field label="Role" htmlFor="role" error={errors.role}>
        <RoleSelect defaultValue={(state.values?.role as UserRole) ?? "editor"} />
      </Field>
      <Field
        label="Temporary password"
        htmlFor="password"
        error={errors.password}
        hint="Send this to them. They'll choose their own when they first log in."
      >
        <Input id="password" name="password" required defaultValue={suggestedPassword} autoComplete="off" className="font-mono" aria-invalid={!!errors.password} />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton>Add user</SubmitButton>
      </div>
    </form>
  );
}

export function EditUserForm({
  id,
  initial,
}: {
  id: number;
  initial: { name: string; username: string; role: UserRole; isActive: boolean };
}) {
  const [state, action] = useActionState<FormState, FormData>(saveUser.bind(null, id), {});
  const typed = state.values;
  const values = typed
    ? { ...initial, ...typed, role: typed.role as UserRole, isActive: typed.isActive === "on" }
    : initial;
  const errors = state.fieldErrors ?? {};
  return (
    <form key={JSON.stringify(typed ?? {})} action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error && (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" required defaultValue={values.name} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Username" htmlFor="username" error={errors.username}>
        <Input id="username" name="username" required autoCapitalize="none" defaultValue={values.username} aria-invalid={!!errors.username} />
      </Field>
      <Field label="Role" htmlFor="role" error={errors.role}>
        <RoleSelect defaultValue={values.role} />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-4" />
        Can log in (untick to deactivate)
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton>Save changes</SubmitButton>
        <Link href="/users" className={buttonClass("ghost")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ id, suggestedPassword }: { id: number; suggestedPassword: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetUserPassword.bind(null, id), {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {state.error && (
        <div className="w-full">
          <Alert>{state.error}</Alert>
        </div>
      )}
      <Field label="New temporary password" htmlFor="password" error={errors.password} className="min-w-56 flex-1">
        <Input id="password" name="password" required defaultValue={suggestedPassword} autoComplete="off" className="font-mono" />
      </Field>
      <SubmitButton variant="danger" pendingLabel="Resetting…">
        Reset password
      </SubmitButton>
    </form>
  );
}
