import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/client";
import { DueAmount } from "@/components/due-amount";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  SignedAmount,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { FEE_CATEGORY_FOR } from "@/lib/club";
import { currentYear, formatDate, formatMoney } from "@/lib/format";
import { CATEGORY_LABELS, CREDIT_KINDS, LEDGER_KIND_LABELS } from "@/lib/member-labels";
import { listCategories } from "@/lib/queries/cash-book";
import { getMember, getMemberStatement, listMembersWithDues } from "@/lib/queries/members";
import { intParam, param } from "@/lib/search-params";
import { removeMember } from "../actions";

export async function generateMetadata({ params }: PageProps<"/members/[id]">): Promise<Metadata> {
  const member = await getMember(Number((await params).id));
  return { title: member?.name ?? "Member" };
}

export default async function MemberPage({ params, searchParams }: PageProps<"/members/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const member = await getMember(Number(id));
  if (!member) notFound();

  const year = intParam(sp, "year") ?? currentYear();
  const [statement, [dues], categories] = await Promise.all([
    getMemberStatement(member.id),
    listMembersWithDues(year, member.id),
    listCategories(),
  ]);
  const feeCategory = categories.find(
    (c) => c.type === "income" && c.name === FEE_CATEGORY_FOR[member.category],
  );
  const here = `/members/${member.id}`;
  const paymentHref =
    `/cash-book/new?memberId=${member.id}&particulars=${encodeURIComponent(member.name)}` +
    `${feeCategory ? `&categoryId=${feeCategory.id}` : ""}&returnTo=${encodeURIComponent(here)}`;

  return (
    <>
      <PageHeader
        title={member.name}
        description={
          <>
            {member.code} · {CATEGORY_LABELS[member.category]}
            {member.memberType ? ` · ${member.memberType}` : ""}
            {!member.isActive && (
              <span className="ml-2">
                <Badge>Inactive</Badge>
              </span>
            )}
          </>
        }
        back={{ href: `/members?year=${year}`, label: "Members" }}
        actions={
          <>
            <LinkButton href={paymentHref} variant="primary">
              Record payment
            </LinkButton>
            <LinkButton href={`${here}/entries/new`}>Add fee or waiver</LinkButton>
            <LinkButton href={`${here}/edit`}>Edit details</LinkButton>
          </>
        }
      />

      {param(sp, "error") && (
        <div className="mb-4">
          <Alert>{param(sp, "error")}</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section aria-label={`Dues for ${year}`}>
            <h2 className="mb-2 text-sm font-semibold text-ink-secondary">Dues for {year}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label={`Carried from ${year - 1}`} value={formatMoney(dues.carried)} />
              <StatTile label={`Fees ${year}`} value={formatMoney(dues.fees)} />
              <StatTile
                label={`Paid ${year}`}
                value={formatMoney(dues.paid)}
                hint={dues.waived ? `Waived ${formatMoney(dues.waived)}` : undefined}
              />
              <StatTile label="Due now" value={<DueAmount due={dues.due} />} />
            </div>
          </section>

          <Card
            title="Statement"
            description="Fees, waivers and payments, oldest first. Cash-book payments linked to this member appear here automatically."
            padded={false}
          >
            {statement.length === 0 ? (
              <EmptyState>Nothing recorded for this member yet.</EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th className="hidden sm:table-cell">Date</Th>
                    <Th>Details</Th>
                    <Th align="right" className="hidden sm:table-cell">Charged</Th>
                    <Th align="right" className="hidden sm:table-cell">Paid / waived</Th>
                    <Th align="right" className="sm:hidden">Amount</Th>
                    <Th align="right">Owes</Th>
                    <Th>
                      <span className="sr-only">Edit</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {statement.map((line) => {
                    const credit = CREDIT_KINDS.includes(line.kind);
                    return (
                      <tr key={`${line.source}-${line.id}`} className="hover:bg-surface-muted">
                        <Td className="hidden whitespace-nowrap text-ink-secondary sm:table-cell">
                          {formatDate(line.date)}
                        </Td>
                        <Td>
                          <p className="text-xs text-ink-muted sm:hidden">{formatDate(line.date)}</p>
                          <span className="font-medium">{LEDGER_KIND_LABELS[line.kind]}</span>
                          {line.source === "cash-book" && (
                            <span className="ml-2">
                              <Badge tone="accent">Cash book</Badge>
                            </span>
                          )}
                          {line.description && (
                            <p className="text-xs text-ink-muted">{line.description}</p>
                          )}
                        </Td>
                        <Td align="right" className="hidden sm:table-cell">
                          {credit ? "" : formatMoney(line.amount)}
                        </Td>
                        <Td align="right" className="hidden sm:table-cell">
                          {credit ? formatMoney(line.amount) : ""}
                        </Td>
                        <Td align="right" className="sm:hidden">
                          <SignedAmount value={line.amount} negative={credit} />
                        </Td>
                        <Td align="right" className="font-medium">
                          {formatMoney(line.balance)}
                        </Td>
                        <Td>
                          <Link
                            className="text-sm text-ink-secondary hover:text-ink hover:underline"
                            href={
                              line.source === "ledger"
                                ? `${here}/entries/${line.id}/edit`
                                : `/cash-book/${line.id}/edit?returnTo=${encodeURIComponent(here)}`
                            }
                          >
                            Edit
                          </Link>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <Card title="Details" className="h-fit">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <Detail label="Phone" value={member.phone} />
            <Detail label="Yearly fee" value={member.yearlyFee ? `৳ ${formatMoney(member.yearlyFee)}` : "None"} />
            <Detail label="Assigned to" value={member.assignedTo} />
            <Detail label="Registered" value={formatDate(member.registeredOn)} />
            <Detail label="Old ID" value={member.oldCode} />
            <Detail label="Blood group" value={member.bloodGroup} />
            <Detail label="Date of birth" value={formatDate(member.dateOfBirth)} />
          </dl>
          {member.notes && (
            <p className="mt-4 whitespace-pre-line border-t border-line pt-3 text-sm text-ink-secondary">
              {member.notes}
            </p>
          )}
          <div className="mt-4 border-t border-line pt-3">
            <ConfirmButton
              action={removeMember.bind(null, member.id)}
              confirm={`Delete ${member.name} and their fees/waivers? This is kept in the change history. (To keep their record, untick "Active" instead.)`}
            >
              Delete member
            </ConfirmButton>
          </div>
        </Card>
      </div>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-ink-muted">{label}</dt>
      <dd>{value || "—"}</dd>
    </>
  );
}
