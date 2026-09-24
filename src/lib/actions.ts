/**
 * Helpers for server actions (the functions forms post to).
 *
 * There is no login yet. Editors type their name once (Settings) and it is kept
 * in a cookie so the change history shows who did what. To add real
 * authentication later, check the session in getActor() and refuse when absent:
 * every write goes through it.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ServiceError } from "@/lib/services/common";
import type { FieldErrors } from "@/lib/validation";

export const ACTOR_COOKIE = "editor_name";

export async function getActor() {
  const name = (await cookies()).get(ACTOR_COOKIE)?.value;
  return name ? decodeURIComponent(name) : null;
}

/** What a form shows after a failed save: messages plus what was typed, so nothing is lost. */
export type FormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

export function typedValues(raw: Record<string, FormDataEntryValue>) {
  return Object.fromEntries(
    Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"),
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
