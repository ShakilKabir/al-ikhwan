import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { today } from "@/lib/format";
import { getMember } from "@/lib/queries/members";
import { LedgerEntryForm } from "../ledger-entry-form";

export const metadata: Metadata = { title: "Add fee or waiver" };

export default async function NewLedgerEntryPage({ params }: PageProps<"/members/[id]/entries/new">) {
  const member = await getMember(Number((await params).id));
  if (!member) notFound();

  return (
    <>
      <PageHeader
        title="Add fee or waiver"
        description={`${member.name} (${member.code})`}
        back={{ href: `/members/${member.id}`, label: member.name }}
      />
      <Card>
        <LedgerEntryForm
          memberId={member.id}
          entryId={null}
          initial={{
            kind: "yearly_fee",
            date: today(),
            amount: member.yearlyFee ? String(member.yearlyFee) : "",
            description: "",
          }}
        />
      </Card>
    </>
  );
}
