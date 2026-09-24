import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { hasUsers } from "@/lib/services/users";
import { SetupForm } from "@/app/login/forms";

export const metadata: Metadata = { title: "Set up logins" };

/** Only works once: creates the first admin on a site that has no accounts yet. */
export default async function SetupPage() {
  if (await hasUsers()) redirect("/login");

  return (
    <AuthCard
      title="Set up logins"
      description="Create the first admin account. Admins add everyone else from the Users page."
    >
      <SetupForm />
    </AuthCard>
  );
}
