"use server";

import { revalidatePath } from "next/cache";
import { createCategory, deleteCategory, updateCategory } from "@/lib/services/categories";
import { ServiceError } from "@/lib/services/common";
import { categorySchema, parseForm } from "@/lib/validation";
import { getActor, runAndRedirect, typedValues, type FormState } from "@/lib/actions";

/** Categories are edited inline in a list, so errors return to the row instead of redirecting. */
export async function saveCategory(
  id: number | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getActor();
  const { data, fieldErrors, raw } = parseForm(categorySchema, formData);
  const values = typedValues(raw);
  if (!data) return { fieldErrors, values };
  try {
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
