import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getLender } from "@/lib/queries/loans";
import { LenderForm } from "@/app/loans/forms";

export const metadata: Metadata = { title: "Edit lender" };

export default async function EditLenderPage({ params }: PageProps<"/loans/[id]/edit">) {
  const lender = await getLender(Number((await params).id));
  if (!lender) notFound();

  return (
    <>
      <PageHeader title={`Edit ${lender.name}`} back={{ href: `/loans/${lender.id}`, label: lender.name }} />
      <Card>
        <LenderForm
          id={lender.id}
          initial={{ name: lender.name, notes: lender.notes ?? "" }}
          cancelHref={`/loans/${lender.id}`}
        />
      </Card>
    </>
  );
}
