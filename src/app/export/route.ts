import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { buildBackupWorkbook } from "@/lib/export";
import { today } from "@/lib/format";

export const dynamic = "force-dynamic";

/** The full backup includes members' personal details, so it needs a login. */
export async function GET() {
  if (!(await getCurrentUser())) redirect("/login?next=/settings");
  const file = await buildBackupWorkbook();
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="al-ikhwan-backup-${today()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
