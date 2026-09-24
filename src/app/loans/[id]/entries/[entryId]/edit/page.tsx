import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/client";
import { Alert, Card, PageHeader } from "@/components/ui";
import { getLender, getLoanEntry } from "@/lib/queries/loans";
import { param } from "@/lib/search-params";
import { removeLoanEntry } from "@/app/loans/actions";
import { LoanEntryForm } from "@/app/loans/forms";

export const metadata: Metadata = { title: "Edit loan entry" };

export default async function EditLoanEntryPage({
  params,
  searchParams,
}: PageProps<"/loans/[id]/entries/[entryId]/edit">) {
  const [{ id, entryId }, sp] = await Promise.all([params, searchParams]);
  await requireUser(`/loans/${id}/entries/${entryId}/edit`);
  const [lender, entry] = await Promise.all([getLender(Number(id)), getLoanEntry(Number(entryId))]);
  if (!lender || !entry || entry.lenderId !== lender.id) notFound();

  return (
    <>
      <PageHeader
        title="Edit loan entry"
        description={lender.name}
        back={{ href: `/loans/${lender.id}`, label: lender.name }}
        actions={
          <ConfirmButton
            action={removeLoanEntry.bind(null, lender.id, entry.id)}
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
        <LoanEntryForm
          lenderId={lender.id}
          entryId={entry.id}
          initial={{
            kind: entry.kind,
            date: entry.date,
            amount: String(entry.amount),
            description: entry.description,
          }}
        />
      </Card>
    </>
  );
}
