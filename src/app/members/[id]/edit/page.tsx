import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { getMember, listAssignees } from "@/lib/queries/members";
import { MemberForm } from "@/app/members/member-form";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({ params }: PageProps<"/members/[id]/edit">) {
  const { id } = await params;
  await requireUser(`/members/${id}/edit`);
  const member = await getMember(Number(id));
  if (!member) notFound();
  const assignees = await listAssignees();

  return (
    <>
      <PageHeader
        title={`Edit ${member.name}`}
        back={{ href: `/members/${member.id}`, label: member.name }}
      />
      <Card>
        <MemberForm
          id={member.id}
          assignees={assignees}
          cancelHref={`/members/${member.id}`}
          initial={{
            code: member.code,
            oldCode: member.oldCode ?? "",
            name: member.name,
            category: member.category,
            memberType: member.memberType ?? "",
            phone: member.phone ?? "",
            registeredOn: member.registeredOn ?? "",
            yearlyFee: member.yearlyFee === null ? "" : String(member.yearlyFee),
            assignedTo: member.assignedTo ?? "",
            bloodGroup: member.bloodGroup ?? "",
            dateOfBirth: member.dateOfBirth ?? "",
            notes: member.notes ?? "",
            isActive: member.isActive,
          }}
        />
      </Card>
    </>
  );
}
