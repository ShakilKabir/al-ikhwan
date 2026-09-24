import { buildBackupWorkbook } from "@/lib/export";
import { today } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = await buildBackupWorkbook();
  return new Response(file, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="al-ikhwan-backup-${today()}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
