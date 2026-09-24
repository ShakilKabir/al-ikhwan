"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/client";
import { Alert, Field, Input } from "@/components/ui";
import type { FormState } from "@/lib/actions";
import { login, setup } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Username" htmlFor="username" error={errors.username}>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={state.values?.username}
          aria-invalid={!!errors.username}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
    </form>
  );
}

export function SetupForm() {
  const [state, action] = useActionState<FormState, FormData>(setup, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Setup code" htmlFor="code" error={errors.code} hint="The one-time code you were given, e.g. ABCD-EFGH-…">
        <Input id="code" name="code" required autoComplete="off" autoCapitalize="characters" aria-invalid={!!errors.code} />
      </Field>
      <Field label="Your name" htmlFor="name" error={errors.name} hint="Shown in the change history">
        <Input id="name" name="name" required defaultValue={state.values?.name} aria-invalid={!!errors.name} />
      </Field>
      <Field label="Username" htmlFor="username" error={errors.username} hint="What you'll type to log in, e.g. your email or phone number">
        <Input
          id="username"
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          defaultValue={state.values?.username}
          aria-invalid={!!errors.username}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!errors.password} />
      </Field>
      <Field label="Password again" htmlFor="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!errors.confirm} />
      </Field>
      <SubmitButton pendingLabel="Setting up…">Create admin account</SubmitButton>
    </form>
  );
}
