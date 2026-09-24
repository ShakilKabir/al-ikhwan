import type { Metadata } from "next";
import Link from "next/link";
import { FilterForm } from "@/components/client";
import {
  Alert,
  Badge,
  buttonClass,
  Card,
  EmptyState,
  Input,
  LinkButton,
  PageHeader,
  Select,
  StatTile,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { DueAmount } from "@/components/due-amount";
import type { MemberCategory } from "@/db/schema";
import { DEFAULT_YEARLY_FEE, REGISTRATION_FEE } from "@/lib/club";
import { currentYear, formatMoney, formatTaka, round2 } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/member-labels";
import { listAssignees, listMembersWithDues, type MemberWithDues } from "@/lib/queries/members";
import { intParam, param } from "@/lib/search-params";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Members" };

const FIRST_YEAR = 2025;

export default async function MembersPage({ searchParams }: PageProps<"/members">) {
  const sp = await searchParams;
  const thisYear = currentYear();
  const year = intParam(sp, "year") ?? thisYear;
  const q = param(sp, "q")?.toLowerCase();
  const assigned = param(sp, "assigned");
  const owingOnly = param(sp, "owing") === "on";
  const showInactive = param(sp, "inactive") === "on";

  const [user, all, assignees] = await Promise.all([
    getCurrentUser(),
    listMembersWithDues(year),
    listAssignees(),
  ]);
  // Phone numbers and notes are only shown to people who are logged in.
  const showPersonal = Boolean(user);
  const rows = all.filter(
    (m) =>
      (showInactive || m.isActive) &&
      (!owingOnly || m.due > 0) &&
      (!assigned || m.assignedTo === assigned) &&
      (!q ||
        [m.name, m.code, m.oldCode ?? "", showPersonal ? (m.phone ?? "") : ""].some((v) =>
          v.toLowerCase().includes(q),
        )),
  );
  const active = all.filter((m) => m.isActive);
  const sum = (list: MemberWithDues[], key: "due" | "paid" | "waived") =>
    round2(list.reduce((s, m) => s + m[key], 0));
  const filtered = Boolean(q || assigned || owingOnly || showInactive);
  const years = Array.from({ length: thisYear + 2 - FIRST_YEAR }, (_, i) => thisYear + 1 - i);
  const charged = param(sp, "charged");

  return (
    <>
      <PageHeader
        title="Members"
        description={`Dues for ${year}. Payments linked in the cash book count automatically.`}
        actions={
          user && (
            <>
              <LinkButton href={`/members/fees?year=${year}`}>Charge {year} yearly fees</LinkButton>
              <LinkButton href="/members/new" variant="primary">
                + Add member
              </LinkButton>
            </>
          )
        }
      />

      {charged !== undefined && (
        <div className="mb-4">
          <Alert tone="info">
            {charged === "0"
              ? `Everyone had already been charged the ${year} yearly fee.`
              : `Charged the ${year} yearly fee to ${charged} member(s).`}
          </Alert>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Active members"
          value={active.length}
          hint={[
            `${active.filter((m) => m.category === "regular").length} regular`,
            `${active.filter((m) => m.category === "executive").length} executive`,
            `${active.filter((m) => m.category === "advisor").length} advisors`,
            `${active.filter((m) => m.category === "prospective").length} under consideration`,
          ].join(" · ")}
        />
        <StatTile
          label={`Owed to the club, end of ${year}`}
          value={formatTaka(sum(active, "due"))}
          hint={`Regular members ${formatTaka(sum(active.filter((m) => m.category === "regular"), "due"))}`}
        />
        <StatTile
          label={`Collected from members in ${year}`}
          value={formatTaka(sum(all, "paid"))}
          hint={`Waived ${formatTaka(sum(all, "waived"))}`}
        />
      </div>

      <Card padded={false} className="mb-6">
        <FilterForm className="flex flex-wrap items-end gap-3 p-3" aria-label="Filter members">
          <div>
            <label htmlFor="year" className="mb-1 block text-xs font-medium text-ink-secondary">
              Year
            </label>
            <Select id="year" name="year" defaultValue={year} className="w-auto">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-56">
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-ink-secondary">
              Search
            </label>
            <Input
              id="q"
              name="q"
              type="search"
              placeholder={showPersonal ? "Name, ID or phone" : "Name or ID"}
              defaultValue={param(sp, "q")}
            />
          </div>
          <div>
            <label htmlFor="assigned" className="mb-1 block text-xs font-medium text-ink-secondary">
              Assigned to
            </label>
            <Select id="assigned" name="assigned" defaultValue={assigned ?? ""} className="w-auto">
              <option value="">Anyone</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="owing" defaultChecked={owingOnly} className="size-4" />
            Only members who owe
          </label>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input type="checkbox" name="inactive" defaultChecked={showInactive} className="size-4" />
            Include inactive
          </label>
          <button type="submit" className={buttonClass("secondary")}>
            Search
          </button>
          {filtered && (
            <Link href={`/members?year=${year}`} className={buttonClass("ghost")}>
              Clear
            </Link>
          )}
        </FilterForm>
      </Card>

      {rows.length === 0 && (
        <Card>
          <EmptyState>No members match these filters.</EmptyState>
        </Card>
      )}

      <div className="space-y-6">
        {(Object.keys(CATEGORY_LABELS) as MemberCategory[]).map((category) => {
          const list = rows.filter((m) => m.category === category);
          if (list.length === 0) return null;
          return category === "prospective" ? (
            <ProspectiveSection key={category} members={list} showPersonal={showPersonal} />
          ) : (
            <DuesSection key={category} category={category} year={year} members={list} showPersonal={showPersonal} />
          );
        })}
      </div>

      <p className="mt-6 text-xs text-ink-muted">
        Yearly fees started in 2026: regular members ৳{DEFAULT_YEARLY_FEE.regular}, executive members ৳
        {DEFAULT_YEARLY_FEE.executive}. First-time club registration is ৳{REGISTRATION_FEE}.
      </p>
    </>
  );
}

function DuesSection({
  category,
  year,
  members,
  showPersonal,
}: {
  category: MemberCategory;
  year: number;
  members: MemberWithDues[];
  showPersonal: boolean;
}) {
  const total = (key: "carried" | "fees" | "waived" | "paid" | "due") =>
    round2(members.reduce((s, m) => s + m[key], 0));

  return (
    <Card title={`${CATEGORY_LABELS[category]} members`} description={`${members.length} shown`} padded={false}>
      <Table>
        <thead>
          <tr>
            <Th className="hidden sm:table-cell">ID</Th>
            <Th>Name</Th>
            <Th className="hidden sm:table-cell">Assigned to</Th>
            <Th align="right" className="hidden lg:table-cell">From {year - 1}</Th>
            <Th align="right" className="hidden lg:table-cell">Fees {year}</Th>
            <Th align="right" className="hidden lg:table-cell">Waived</Th>
            <Th align="right" className="hidden md:table-cell">Paid {year}</Th>
            <Th align="right">Due</Th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-surface-muted">
              <Td className="hidden whitespace-nowrap text-ink-secondary sm:table-cell">{m.code}</Td>
              <Td>
                <Link href={`/members/${m.id}?year=${year}`} className="font-medium hover:underline">
                  {m.name}
                </Link>
                {!m.isActive && (
                  <span className="ml-2">
                    <Badge>Inactive</Badge>
                  </span>
                )}
                <p className="text-xs text-ink-muted">
                  <span className="sm:hidden">{m.code} · </span>
                  {[m.memberType, showPersonal && m.phone].filter(Boolean).join(" · ")}
                  {m.assignedTo && <span className="sm:hidden"> · {m.assignedTo}</span>}
                </p>
              </Td>
              <Td className="hidden text-ink-secondary sm:table-cell">{m.assignedTo}</Td>
              <Td align="right" className="hidden lg:table-cell">{formatMoney(m.carried)}</Td>
              <Td align="right" className="hidden lg:table-cell">{formatMoney(m.fees)}</Td>
              <Td align="right" className="hidden lg:table-cell">{m.waived ? formatMoney(m.waived) : ""}</Td>
              <Td align="right" className="hidden md:table-cell">{m.paid ? formatMoney(m.paid) : ""}</Td>
              <Td align="right" className="whitespace-nowrap">
                <DueAmount due={m.due} />
              </Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <Td className="hidden sm:table-cell" />
            <Td>Total</Td>
            <Td className="hidden sm:table-cell" />
            <Td align="right" className="hidden lg:table-cell">{formatMoney(total("carried"))}</Td>
            <Td align="right" className="hidden lg:table-cell">{formatMoney(total("fees"))}</Td>
            <Td align="right" className="hidden lg:table-cell">{formatMoney(total("waived"))}</Td>
            <Td align="right" className="hidden md:table-cell">{formatMoney(total("paid"))}</Td>
            <Td align="right">{formatMoney(total("due"))}</Td>
          </tr>
        </tfoot>
      </Table>
    </Card>
  );
}

function ProspectiveSection({ members, showPersonal }: { members: MemberWithDues[]; showPersonal: boolean }) {
  return (
    <Card
      title="Under consideration"
      description="People who have shown interest in joining"
      padded={false}
    >
      <Table>
        <thead>
          <tr>
            <Th className="hidden sm:table-cell">ID</Th>
            <Th>Name</Th>
            <Th className="hidden sm:table-cell">Assigned to</Th>
            {showPersonal && <Th className="hidden md:table-cell">Notes</Th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="hover:bg-surface-muted">
              <Td className="hidden whitespace-nowrap text-ink-secondary sm:table-cell">{m.code}</Td>
              <Td>
                <Link href={`/members/${m.id}`} className="font-medium hover:underline">
                  {m.name}
                </Link>
                <p className="text-xs text-ink-muted">
                  {[m.memberType, showPersonal && m.phone].filter(Boolean).join(" · ")}
                </p>
              </Td>
              <Td className="hidden text-ink-secondary sm:table-cell">{m.assignedTo}</Td>
              {showPersonal && (
                <Td className="hidden max-w-sm whitespace-pre-line text-ink-secondary md:table-cell">{m.notes}</Td>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
