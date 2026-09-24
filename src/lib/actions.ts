/**
 * Helpers for server actions (the functions forms post to). Every action that
 * changes data starts with getActor(), which refuses anyone who isn't logged in.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/current-user";
import { ServiceError } from "@/lib/services/common";
import type { FieldErrors } from "@/lib/validation";

/** The logged-in user's name, for the change history. Sends anyone else to the login page. */
export async function getActor() {
  return (await requireUser()).name;
}

/** What a form shows after a failed save: messages plus what was typed, so nothing is lost. */
export type FormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

/** Fields that are never sent back to the browser, even after a failed save. */
const SECRET_FIELDS = new Set(["password", "confirm", "currentPassword", "newPassword", "code"]);

export function typedValues(raw: Record<string, FormDataEntryValue>) {
  return Object.fromEntries(
    Object.entries(raw).filter(
      (e): e is [string, string] => typeof e[1] === "string" && !SECRET_FIELDS.has(e[0]),
    ),
  );
}

/** Only allow redirects back into this site. */
export function safePath(value: FormDataEntryValue | null | undefined, fallback: string) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}

/**
 * Runs a save. A ServiceError (something the editor can fix) comes back as a
 * form error; on success every page is refreshed and the browser moves on.
 */
export async function saveAndRedirect<T>(
  save: () => Promise<T>,
  values: Record<string, string>,
  to: string | ((saved: T) => string),
): Promise<FormState> {
  let saved: T;
  try {
    saved = await save();
  } catch (error) {
    if (error instanceof ServiceError) return { error: error.message, values };
    throw error;
  }
  revalidatePath("/", "layout");
  redirect(typeof to === "function" ? to(saved) : to);
}

/** For buttons without a form to show errors in: report the problem via ?error= on `from`. */
export async function runAndRedirect(action: () => Promise<unknown>, to: string, from: string) {
  try {
    await action();
  } catch (error) {
    if (error instanceof ServiceError) {
      redirect(`${from}${from.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  revalidatePath("/", "layout");
  redirect(to);
}
