import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/client";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getSession } from "@/lib/auth/current-user";
import { param } from "@/lib/search-params";
import { logout } from "@/app/login/actions";
import { ChangePasswordForm } from "./forms";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  const { user } = session;
  const sp = await searchParams;

  return (
    <>
      <PageHeader
        title="Your account"
        description={`${user.name} · logs in as "${user.username}" · ${user.role === "admin" ? "Admin" : "Editor"}`}
        actions={
          <form action={logout}>
            <SubmitButton variant="secondary" pendingLabel="Logging out…">
              Log out
            </SubmitButton>
          </form>
        }
      />
      <div className="mb-4 space-y-2">
        {user.mustChangePassword && (
          <Alert tone="info">Welcome! Choose your own password below before you start editing.</Alert>
        )}
        {param(sp, "changed") && <Alert tone="info">Your password has been changed. You&apos;ve been logged out on other devices.</Alert>}
      </div>
      <Card title="Change password">
        <ChangePasswordForm />
      </Card>
    </>
  );
}
