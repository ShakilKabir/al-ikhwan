import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { safePath } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { param } from "@/lib/search-params";
import { hasUsers } from "@/lib/services/users";
import { LoginForm } from "./forms";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safePath(param(await searchParams, "next"), "/");
  if (await getCurrentUser()) redirect(next);
  if (!(await hasUsers())) redirect("/setup");

  return (
    <AuthCard title="Log in" description="Log in to add or change entries. Anyone can view the accounts without logging in.">
      <LoginForm next={next} />
    </AuthCard>
  );
}
