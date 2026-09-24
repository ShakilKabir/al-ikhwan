import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/client";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getLedgerEntry, getMember } from "@/lib/queries/members";
import { param } from "@/lib/search-params";
import { removeLedgerEntry } from "@/app/members/actions";
import { LedgerEntryForm } from "@/app/members/[id]/entries/ledger-entry-form";

export const metadata: Metadata = { title: "Edit fee or waiver" };

export default async function EditLedgerEntryPage({
  params,
  searchParams,
}: PageProps<"/members/[id]/entries/[entryId]/edit">) {
  const [{ id, entryId }, sp] = await Promise.all([params, searchParams]);
  await requireUser(`/members/${id}/entries/${entryId}/edit`);
  const [member, entry] = await Promise.all([getMember(Number(id)), getLedgerEntry(Number(entryId))]);
  if (!member || !entry || entry.memberId !== member.id) notFound();

  return (
    <>
      <PageHeader
        title="Edit entry"
        description={`${member.name} (${member.code})`}
        back={{ href: `/members/${member.id}`, label: member.name }}
        actions={
          <ConfirmButton
            action={removeLedgerEntry.bind(null, member.id, entry.id)}
            confirm="Delete this entry? It will be kept in the change history."
          >
            Delete entry
          </ConfirmButton>
        }
      />
      {param(sp, "error") && (
        <div className="mb-4">
          <Alert>{param(sp, "error")}</Alert>
        </div>
      )}
      <Card>
        <LedgerEntryForm
          memberId={member.id}
          entryId={entry.id}
          initial={{
            kind: entry.kind,
            date: entry.date,
            amount: String(entry.amount),
            description: entry.description ?? "",
          }}
        />
      </Card>
    </>
  );
}
