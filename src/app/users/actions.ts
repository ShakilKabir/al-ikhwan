"use server";

import { requireAdmin } from "@/lib/auth/current-user";
import { createUser, resetPassword, updateUser } from "@/lib/services/users";
import { newUserSchema, parseForm, resetPasswordSchema, userUpdateSchema } from "@/lib/validation";
import { saveAndRedirect, typedValues, type FormState } from "@/lib/actions";

export async function addUser(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("/users");
  const { data, fieldErrors, raw } = parseForm(newUserSchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };
  return saveAndRedirect(
    () => createUser(data, admin.name),
    values,
    (user) => `/users?added=${encodeURIComponent(user.name)}`,
  );
}

export async function saveUser(id: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("/users");
  const { data, fieldErrors, raw } = parseForm(userUpdateSchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };
  return saveAndRedirect(() => updateUser(id, data, admin), values, "/users");
}

export async function resetUserPassword(id: number, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("/users");
  const { data, fieldErrors } = parseForm(resetPasswordSchema, formData);
  if (!data) return { fieldErrors };
  return saveAndRedirect(() => resetPassword(id, data.password, admin.name), {}, `/users/${id}?reset=1`);
}
