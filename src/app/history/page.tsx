import type { Metadata } from "next";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { AUDIT_PAGE_SIZE, listAuditLog } from "@/lib/queries/audit";
import { intParam } from "@/lib/search-params";

export const metadata: Metadata = { title: "Change history" };

const ACTION_LABELS = { create: "Added", update: "Edited", delete: "Deleted", import: "Imported" };

const when = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const page = intParam(await searchParams, "page") ?? 1;
  const { rows, total } = await listAuditLog(page);
  const lastPage = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Change history"
        description="Every addition, edit and deletion, newest first. Open an item to see exactly what changed."
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState>No changes yet.</EmptyState>
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.id} className="border-b border-line px-4 py-3 last:border-b-0">
                <details>
                  <summary className="cursor-pointer list-none">
                    <p className="text-sm">
                      <span className="font-medium">{r.summary}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {ACTION_LABELS[r.action]} by {r.actor || "someone (no name set)"} · {when.format(r.at)} (Dhaka)
                    </p>
                  </summary>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {r.before != null && <Snapshot label="Before" data={r.before} />}
                    {r.after != null && <Snapshot label="After" data={r.after} />}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
        {lastPage > 1 && (
          <nav aria-label="Pages" className="flex items-center justify-between gap-2 border-t border-line p-3 text-sm">
            <span className="text-ink-muted">
              Page {page} of {lastPage}
            </span>
            <span className="flex gap-2">
              {page > 1 && (
                <LinkButton size="sm" href={`/history?page=${page - 1}`}>
                  ← Newer
                </LinkButton>
              )}
              {page < lastPage && (
                <LinkButton size="sm" href={`/history?page=${page + 1}`}>
                  Older →
                </LinkButton>
              )}
            </span>
          </nav>
        )}
      </Card>
    </>
  );
}

function Snapshot({ label, data }: { label: string; data: unknown }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-secondary">{label}</p>
      <pre className="max-h-64 overflow-auto rounded bg-surface-muted p-2 text-xs">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
