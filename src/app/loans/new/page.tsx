import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { Card, PageHeader } from "@/components/ui";
import { LenderForm } from "../forms";

export const metadata: Metadata = { title: "Add lender" };

export default async function NewLenderPage() {
  await requireUser("/loans/new");
  return (
    <>
      <PageHeader title="Add lender" back={{ href: "/loans", label: "Loans" }} />
      <Card>
        <LenderForm id={null} initial={{ name: "", notes: "" }} cancelHref="/loans" />
      </Card>
    </>
  );
}
