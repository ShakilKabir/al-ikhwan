import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/client";
import { Alert, Card, EmptyState, LinkButton, PageHeader, SignedAmount, Table, Td, Th } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { getLender, getLenderStatement } from "@/lib/queries/loans";
import { param } from "@/lib/search-params";
import { removeLender } from "../actions";

export async function generateMetadata({ params }: PageProps<"/loans/[id]">): Promise<Metadata> {
  const lender = await getLender(Number((await params).id));
  return { title: lender?.name ?? "Lender" };
}

export default async function LenderPage({ params, searchParams }: PageProps<"/loans/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const lender = await getLender(Number(id));
  if (!lender) notFound();
  const entries = await getLenderStatement(lender.id);
  const owed = entries.at(-1)?.owed ?? 0;

  return (
    <>
      <PageHeader
        title={lender.name}
        description={owed === 0 ? "Nothing owed" : `The club owes ৳ ${formatMoney(owed)}`}
        back={{ href: "/loans", label: "Loans" }}
        actions={
          <>
            <LinkButton href={`/loans/${lender.id}/entries/new`} variant="primary">
              + Add entry
            </LinkButton>
            <LinkButton href={`/loans/${lender.id}/edit`}>Edit lender</LinkButton>
            {entries.length === 0 && (
              <ConfirmButton action={removeLender.bind(null, lender.id)} confirm={`Delete ${lender.name}?`} size="md">
                Delete lender
              </ConfirmButton>
            )}
          </>
        }
      />
      {param(sp, "error") && (
        <div className="mb-4">
          <Alert>{param(sp, "error")}</Alert>
        </div>
      )}
      {lender.notes && <p className="mb-4 whitespace-pre-line text-sm text-ink-secondary">{lender.notes}</p>}

      <Card padded={false}>
        {entries.length === 0 ? (
          <EmptyState>No entries yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="hidden sm:table-cell">Date</Th>
                <Th>Description</Th>
                <Th align="right" className="hidden sm:table-cell">Borrowed</Th>
                <Th align="right" className="hidden sm:table-cell">Repaid</Th>
                <Th align="right" className="sm:hidden">Amount</Th>
                <Th align="right">Club owes</Th>
                <Th>
                  <span className="sr-only">Edit</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-surface-muted">
                  <Td className="hidden whitespace-nowrap text-ink-secondary sm:table-cell">{formatDate(e.date)}</Td>
                  <Td>
                    <p className="text-xs text-ink-muted sm:hidden">{formatDate(e.date)}</p>
                    {e.description}
                  </Td>
                  <Td align="right" className="hidden sm:table-cell">
                    {e.kind === "borrowed" ? formatMoney(e.amount) : ""}
                  </Td>
                  <Td align="right" className="hidden sm:table-cell">
                    {e.kind === "repaid" ? formatMoney(e.amount) : ""}
                  </Td>
                  <Td align="right" className="sm:hidden">
                    <SignedAmount value={e.amount} negative={e.kind === "repaid"} />
                  </Td>
                  <Td align="right" className="font-medium">
                    {formatMoney(e.owed)}
                  </Td>
                  <Td>
                    <Link
                      href={`/loans/${lender.id}/entries/${e.id}/edit`}
                      className="text-sm text-ink-secondary hover:text-ink hover:underline"
                    >
                      Edit
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
