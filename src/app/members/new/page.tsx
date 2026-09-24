import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { Card, PageHeader } from "@/components/ui";
import type { MemberCategory } from "@/db/schema";
import { DEFAULT_YEARLY_FEE } from "@/lib/club";
import { today } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/member-labels";
import { listAssignees, nextMemberCode } from "@/lib/queries/members";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Add member" };

export default async function NewMemberPage() {
  await requireUser("/members/new");
  const categories = Object.keys(CATEGORY_LABELS) as MemberCategory[];
  const [codes, assignees] = await Promise.all([
    Promise.all(categories.map(nextMemberCode)),
    listAssignees(),
  ]);
  const nextCodes = Object.fromEntries(categories.map((c, i) => [c, codes[i]])) as Record<
    MemberCategory,
    string
  >;

  return (
    <>
      <PageHeader title="Add member" back={{ href: "/members", label: "Members" }} />
      <Card>
        <MemberForm
          id={null}
          nextCodes={nextCodes}
          assignees={assignees}
          cancelHref="/members"
          initial={{
            code: nextCodes.regular,
            oldCode: "",
            name: "",
            category: "regular",
            memberType: "General",
            phone: "",
            registeredOn: today(),
            yearlyFee: String(DEFAULT_YEARLY_FEE.regular ?? ""),
            assignedTo: "",
            bloodGroup: "",
            dateOfBirth: "",
            notes: "",
            isActive: true,
          }}
        />
      </Card>
    </>
  );
}
