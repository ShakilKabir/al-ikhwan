import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { LenderForm } from "../forms";

export const metadata: Metadata = { title: "Add lender" };

export default function NewLenderPage() {
  return (
    <>
      <PageHeader title="Add lender" back={{ href: "/loans", label: "Loans" }} />
      <Card>
        <LenderForm id={null} initial={{ name: "", notes: "" }} cancelHref="/loans" />
      </Card>
    </>
  );
}
