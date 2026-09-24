"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import { Alert, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/actions";
import { changePassword } from "./actions";

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid max-w-sm gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword} hint="For a new account, the temporary password you were given">
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={errors.newPassword} hint="At least 8 characters">
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required aria-invalid={!!errors.newPassword} />
      </Field>
      <Field label="New password again" htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!errors.confirm} />
      </Field>
      <SubmitButton>Change password</SubmitButton>
    </form>
  );
}
