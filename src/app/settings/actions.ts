"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCategory, deleteCategory, updateCategory } from "@/lib/services/categories";
import { ServiceError } from "@/lib/services/common";
import { categorySchema, parseForm } from "@/lib/validation";
import { ACTOR_COOKIE, getActor, runAndRedirect, typedValues, type FormState } from "@/lib/actions";

export async function setEditorName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const store = await cookies();
  if (name) {
    store.set(ACTOR_COOKIE, encodeURIComponent(name), {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    store.delete(ACTOR_COOKIE);
  }
  revalidatePath("/", "layout");
  redirect("/settings?saved=name");
}

/** Categories are edited inline in a list, so errors return to the row instead of redirecting. */
export async function saveCategory(
  id: number | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { data, fieldErrors, raw } = parseForm(categorySchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };
  try {
    const actor = await getActor();
    if (id) await updateCategory(id, data, actor);
    else await createCategory(data, actor);
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message, values };
    throw error;
  }
  revalidatePath("/", "layout");
  // A new category clears the add form; an edited one shows as saved.
  return id ? { values } : {};
}

export async function removeCategory(id: number) {
  const actor = await getActor();
  await runAndRedirect(() => deleteCategory(id, actor), "/settings", "/settings");
}
