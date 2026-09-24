"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearSessionCookie,
  getSession,
  setSessionCookie,
} from "@/lib/auth/current-user";
import { createSession, deleteSession, type SessionUser } from "@/lib/auth/sessions";
import { ServiceError } from "@/lib/services/common";
import { authenticate, setupFirstAdmin } from "@/lib/services/users";
import { loginSchema, parseForm, setupSchema } from "@/lib/validation";
import { safePath, typedValues, type FormState } from "@/lib/actions";

async function startSession(user: SessionUser, next: string): Promise<never> {
  await setSessionCookie(await createSession(user.id));
  revalidatePath("/", "layout");
  redirect(user.mustChangePassword ? "/account" : next);
}

export async function login(_previous: FormState, formData: FormData): Promise<FormState> {
  const { data, fieldErrors, raw } = parseForm(loginSchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };

  let user: SessionUser;
  try {
    user = await authenticate(data.username, data.password);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message, values };
    throw error;
  }
  return startSession(user, safePath(formData.get("next"), "/"));
}

/** Creates the first admin account on a fresh site (see /setup). */
export async function setup(_previous: FormState, formData: FormData): Promise<FormState> {
  const { data, fieldErrors, raw } = parseForm(setupSchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };

  let user: SessionUser;
  try {
    user = await setupFirstAdmin(data.code, data);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message, values };
    throw error;
  }
  return startSession(user, "/users");
}

export async function logout() {
  const session = await getSession();
  if (session) await deleteSession(session.sessionId);
  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/");
}
