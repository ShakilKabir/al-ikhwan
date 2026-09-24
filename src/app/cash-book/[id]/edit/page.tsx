import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/client";
import { Alert, Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { getTransaction, listCategories } from "@/lib/queries/cash-book";
import { listMemberOptions } from "@/lib/queries/members";
import { safePath } from "@/lib/actions";
import { param } from "@/lib/search-params";
import { removeTransaction } from "@/app/cash-book/actions";
import { TransactionForm } from "@/app/cash-book/transaction-form";

export const metadata: Metadata = { title: "Edit cash book entry" };

export default async function EditTransactionPage({
  params,
  searchParams,
}: PageProps<"/cash-book/[id]/edit">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireUser(`/cash-book/${id}/edit`);
  const transaction = await getTransaction(Number(id));
  if (!transaction) notFound();

  const [categories, members] = await Promise.all([listCategories(), listMemberOptions()]);
  const returnTo = safePath(param(sp, "returnTo"), "/cash-book");

  return (
    <>
      <PageHeader
        title="Edit cash book entry"
        description={`${transaction.particulars} · ${formatDate(transaction.date)}`}
        back={{ href: returnTo, label: "Back" }}
        actions={
          <ConfirmButton
            action={removeTransaction.bind(null, transaction.id, returnTo)}
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
        <TransactionForm
          id={transaction.id}
          categories={categories}
          members={members}
          returnTo={returnTo}
          initial={{
            date: transaction.date,
            categoryId: String(transaction.categoryId),
            particulars: transaction.particulars,
            amount: String(transaction.amount),
            memberId: transaction.memberId ? String(transaction.memberId) : "",
            notes: transaction.notes ?? "",
          }}
        />
      </Card>
    </>
  );
}
