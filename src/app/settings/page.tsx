import type { Metadata } from "next";
import { Alert, Card, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth/current-user";
import { listCategories } from "@/lib/queries/cash-book";
import { param } from "@/lib/search-params";
import { AddCategoryForm, CategoryRow } from "./category-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  await requireUser("/settings");
  const [sp, categories] = await Promise.all([searchParams, listCategories()]);

  return (
    <>
      <PageHeader title="Settings" />

      <Card
        title="Backup"
        description="Everything in one Excel file: cash book, members, fees and payments, loans and the change history."
      >
        <LinkButton href="/export" prefetch={false}>
          Download Excel backup
        </LinkButton>
      </Card>

      <Card
        title="Cash book categories"
        description="Renaming a category renames it on every entry. Income/expense can only be changed while a category has no entries."
        padded={false}
        className="mt-6"
      >
        {param(sp, "error") && (
          <div className="px-4 pt-3">
            <Alert>{param(sp, "error")}</Alert>
          </div>
        )}
        {(["income", "expense"] as const).map((type) => (
          <div key={type}>
            <h3 className="border-b border-line bg-surface-muted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              {type === "income" ? "Income" : "Expenses"}
            </h3>
            <ul>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <CategoryRow key={c.id} category={c} />
                ))}
            </ul>
          </div>
        ))}
        <div className="border-t border-line">
          <AddCategoryForm />
        </div>
      </Card>
    </>
  );
}
