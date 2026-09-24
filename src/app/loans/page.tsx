import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, LinkButton, PageHeader, StatTile, Table, Td, Th } from "@/components/ui";
import { formatDate, formatMoney, round2 } from "@/lib/format";
import { listLenders } from "@/lib/queries/loans";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Loans" };

export default async function LoansPage() {
  const [user, lenders] = await Promise.all([getCurrentUser(), listLenders()]);
  const payable = round2(lenders.reduce((s, l) => s + l.outstanding, 0));

  return (
    <>
      <PageHeader
        title="Loans"
        description="Money people have lent the club (accounts payable)."
        actions={
          user && (
            <LinkButton href="/loans/new" variant="primary">
              + Add lender
            </LinkButton>
          )
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile label="Accounts payable" value={`৳ ${formatMoney(payable)}`} hint="What the club owes in total" />
        <div className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-secondary sm:col-span-2">
          <p className="font-medium text-ink">How loans work</p>
          <p className="mt-1">
            When a lender pays a bill for the club, record the <em>expense</em> in the cash book as usual and add it
            here as <strong>borrowed</strong>. When the club pays them back, add it here as <strong>repaid</strong>,
            not in the cash book. Cash at hand = profit/loss + what is still owed here.
          </p>
        </div>
      </div>

      <Card padded={false}>
        {lenders.length === 0 ? (
          <EmptyState>No lenders yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Lender</Th>
                <Th align="right">Borrowed in total</Th>
                <Th align="right">Still owed</Th>
                <Th>Last entry</Th>
              </tr>
            </thead>
            <tbody>
              {lenders.map((l) => (
                <tr key={l.id} className="hover:bg-surface-muted">
                  <Td>
                    <Link href={`/loans/${l.id}`} className="font-medium hover:underline">
                      {l.name}
                    </Link>
                    {l.notes && <p className="text-xs text-ink-muted">{l.notes}</p>}
                  </Td>
                  <Td align="right">{formatMoney(l.borrowed)}</Td>
                  <Td align="right" className="font-semibold">
                    {l.outstanding === 0 ? <span className="font-normal text-success-ink">✓ Settled</span> : formatMoney(l.outstanding)}
                  </Td>
                  <Td className="text-ink-secondary">{formatDate(l.lastEntry)}</Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <Td>Total</Td>
                <Td align="right">{formatMoney(round2(lenders.reduce((s, l) => s + l.borrowed, 0)))}</Td>
                <Td align="right">{formatMoney(payable)}</Td>
                <Td />
              </tr>
            </tfoot>
          </Table>
        )}
      </Card>
    </>
  );
}
