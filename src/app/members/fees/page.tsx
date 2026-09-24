import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import Link from "next/link";
import { SubmitButton } from "@/components/client";
import { Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { currentYear, formatMoney, round2 } from "@/lib/format";
import { previewYearlyFees } from "@/lib/services/members";
import { intParam } from "@/lib/search-params";
import { chargeFees } from "../actions";

export const metadata: Metadata = { title: "Charge yearly fees" };

export default async function ChargeFeesPage({ searchParams }: PageProps<"/members/fees">) {
  await requireUser("/members/fees");
  const year = intParam(await searchParams, "year") ?? currentYear();
  const due = await previewYearlyFees(year);
  const total = round2(due.reduce((s, m) => s + (m.yearlyFee ?? 0), 0));

  return (
    <>
      <PageHeader
        title={`Charge the ${year} yearly fee`}
        description="Adds each active member's yearly fee to what they owe, dated 1 January. Members already charged for this year are skipped, so running it twice is safe."
        back={{ href: `/members?year=${year}`, label: "Members" }}
      />
      <Card padded={false}>
        {due.length === 0 ? (
          <EmptyState>
            Every active member with a yearly fee has already been charged for {year}.{" "}
            <Link href={`/members?year=${year}`} className="underline">
              Back to members
            </Link>
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>ID</Th>
                  <Th>Name</Th>
                  <Th align="right">Yearly fee</Th>
                </tr>
              </thead>
              <tbody>
                {due.map((m) => (
                  <tr key={m.id}>
                    <Td className="text-ink-secondary">{m.code}</Td>
                    <Td>{m.name}</Td>
                    <Td align="right">{formatMoney(m.yearlyFee ?? 0)}</Td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <Td colSpan={2}>{due.length} member(s)</Td>
                  <Td align="right">{formatMoney(total)}</Td>
                </tr>
              </tfoot>
            </Table>
            <form action={chargeFees.bind(null, year)} className="flex gap-2 p-4">
              <SubmitButton pendingLabel="Charging…">
                Charge {due.length} member(s) for {year}
              </SubmitButton>
            </form>
          </>
        )}
      </Card>
    </>
  );
}
