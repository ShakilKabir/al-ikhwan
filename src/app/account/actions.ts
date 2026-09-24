"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/current-user";
import { ServiceError } from "@/lib/services/common";
import { changeOwnPassword } from "@/lib/services/users";
import { changePasswordSchema, parseForm } from "@/lib/validation";
import type { FormState } from "@/lib/actions";

/** Not behind requireUser(): people who must choose a new password come here to do it. */
export async function changePassword(_previous: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");

  const { data, fieldErrors } = parseForm(changePasswordSchema, formData);
  if (!data) return { fieldErrors };
  try {
    await changeOwnPassword(session.user, data.currentPassword, data.newPassword, session.sessionId);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message };
    throw error;
  }
  revalidatePath("/", "layout");
  redirect("/account?changed=1");
}
