import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Alert, Card, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current-user";
import { temporaryPassword } from "@/lib/auth/password";
import { param } from "@/lib/search-params";
import { getUser } from "@/lib/services/users";
import { EditUserForm, ResetPasswordForm } from "@/app/users/forms";

export const metadata: Metadata = { title: "Edit user" };

export default async function EditUserPage({ params, searchParams }: PageProps<"/users/[id]">) {
  await requireAdmin("/users");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const user = await getUser(Number(id));
  if (!user) notFound();

  return (
    <>
      <PageHeader title={`Edit ${user.name}`} back={{ href: "/users", label: "Users" }} />
      {param(sp, "reset") && (
        <div className="mb-4">
          <Alert tone="info">
            Password reset and {user.name} was logged out everywhere. Send them the new temporary password; they&apos;ll choose their own when they log in.
          </Alert>
        </div>
      )}
      <Card title="Details" className="mb-6">
        <EditUserForm
          id={user.id}
          initial={{ name: user.name, username: user.username, role: user.role, isActive: user.isActive }}
        />
      </Card>
      <Card
        title="Reset password"
        description="For when they've forgotten it. They'll have to choose a new one when they log in."
      >
        <ResetPasswordForm id={user.id} suggestedPassword={temporaryPassword()} />
      </Card>
    </>
  );
}
