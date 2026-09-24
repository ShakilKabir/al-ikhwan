import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { requireAdmin } from "@/lib/auth/current-user";
import { temporaryPassword } from "@/lib/auth/password";
import { param } from "@/lib/search-params";
import { listUsers } from "@/lib/services/users";
import { AddUserForm } from "./forms";

export const metadata: Metadata = { title: "Users" };

const when = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric" });

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const me = await requireAdmin("/users");
  const [users, sp] = await Promise.all([listUsers(), searchParams]);
  const added = param(sp, "added");

  return (
    <>
      <PageHeader
        title="Users"
        description="People who can log in. Editors can add and change entries; admins can also manage users. Anyone can view without logging in."
      />
      {added && (
        <div className="mb-4">
          <Alert tone="info">
            Added {added}. Send them the site link, their username and the temporary password; they&apos;ll choose their own password when they first log in.
          </Alert>
        </div>
      )}

      <Card padded={false} className="mb-6">
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th className="hidden sm:table-cell">Username</Th>
              <Th>Role</Th>
              <Th className="hidden md:table-cell">Last login</Th>
              <Th>
                <span className="sr-only">Edit</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-muted">
                <Td>
                  <span className="font-medium">{u.name}</span>
                  {u.id === me.id && <span className="ml-1 text-xs text-ink-muted">(you)</span>}
                  <p className="text-xs text-ink-muted sm:hidden">{u.username}</p>
                  {!u.isActive && (
                    <span className="ml-2">
                      <Badge>Deactivated</Badge>
                    </span>
                  )}
                  {u.isActive && u.mustChangePassword && (
                    <span className="ml-2">
                      <Badge>Hasn&apos;t set a password yet</Badge>
                    </span>
                  )}
                </Td>
                <Td className="hidden text-ink-secondary sm:table-cell">{u.username}</Td>
                <Td>{u.role === "admin" ? <Badge tone="accent">Admin</Badge> : "Editor"}</Td>
                <Td className="hidden text-ink-secondary md:table-cell">
                  {u.lastLoginAt ? when.format(u.lastLoginAt) : "Never"}
                </Td>
                <Td>
                  <Link href={`/users/${u.id}`} className="text-sm text-ink-secondary hover:text-ink hover:underline">
                    Edit
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card title="Add a user">
        <AddUserForm suggestedPassword={temporaryPassword()} />
      </Card>
    </>
  );
}
