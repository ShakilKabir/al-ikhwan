import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { today } from "@/lib/format";
import { getLender } from "@/lib/queries/loans";
import { LoanEntryForm } from "@/app/loans/forms";

export const metadata: Metadata = { title: "Add loan entry" };

export default async function NewLoanEntryPage({ params }: PageProps<"/loans/[id]/entries/new">) {
  const { id } = await params;
  await requireUser(`/loans/${id}/entries/new`);
  const lender = await getLender(Number(id));
  if (!lender) notFound();

  return (
    <>
      <PageHeader title={`Add entry for ${lender.name}`} back={{ href: `/loans/${lender.id}`, label: lender.name }} />
      <Card>
        <LoanEntryForm
          lenderId={lender.id}
          entryId={null}
          initial={{ kind: "borrowed", date: today(), amount: "", description: "" }}
        />
      </Card>
    </>
  );
}
