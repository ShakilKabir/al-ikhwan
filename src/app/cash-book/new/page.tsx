import type { Metadata } from "next";
import { Alert, Card, PageHeader } from "@/components/ui";
import { today } from "@/lib/format";
import { listCategories } from "@/lib/queries/cash-book";
import { listMemberOptions } from "@/lib/queries/members";
import { safePath } from "@/lib/actions";
import { param } from "@/lib/search-params";
import { TransactionForm } from "../transaction-form";

export const metadata: Metadata = { title: "Add cash book entry" };

export default async function NewTransactionPage({ searchParams }: PageProps<"/cash-book/new">) {
  const sp = await searchParams;
  const [categories, members] = await Promise.all([listCategories(), listMemberOptions()]);
  const returnTo = safePath(param(sp, "returnTo"), "/cash-book");

  return (
    <>
      <PageHeader title="Add cash book entry" back={{ href: returnTo, label: "Back" }} />
      {param(sp, "saved") && (
        <div className="mb-4">
          <Alert tone="info">Saved. Add the next entry below.</Alert>
        </div>
      )}
      <Card>
        <TransactionForm
          id={null}
          categories={categories}
          members={members}
          returnTo={returnTo}
          initial={{
            date: param(sp, "date") ?? today(),
            categoryId: param(sp, "categoryId") ?? "",
            particulars: param(sp, "particulars") ?? "",
            amount: param(sp, "amount") ?? "",
            memberId: param(sp, "memberId") ?? "",
            notes: "",
          }}
        />
      </Card>
    </>
  );
}
