/**
 * Who is making this request. Pages, server actions and route handlers that
 * change data must call requireUser() (or requireAdmin()) themselves: hiding a
 * button is not protection.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { validateSessionToken } from "./sessions";

const SESSION_COOKIE = "session";

/** The current session, checked against the database once per request. */
export const getSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? validateSessionToken(token) : null;
});

export async function getCurrentUser() {
  return (await getSession())?.user ?? null;
}

/**
 * The logged-in user, or a redirect: to the login page (coming back to `next`
 * afterwards), or to their account page if they must choose a new password first.
 */
export async function requireUser(next = "/") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (user.mustChangePassword) redirect("/account");
  return user;
}

export async function requireAdmin(next = "/") {
  const user = await requireUser(next);
  if (user.role !== "admin") notFound();
  return user;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // The database decides when a session ends; the cookie only has to outlive it.
    maxAge: 400 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
