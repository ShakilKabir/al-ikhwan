import type { Metadata } from "next";
import { SubmitButton } from "@/components/client";
import { Alert, Card, Input, LinkButton, PageHeader } from "@/components/ui";
import { getActor } from "@/lib/actions";
import { listCategories } from "@/lib/queries/cash-book";
import { param } from "@/lib/search-params";
import { setEditorName } from "./actions";
import { AddCategoryForm, CategoryRow } from "./category-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const sp = await searchParams;
  const [actor, categories] = await Promise.all([getActor(), listCategories()]);

  return (
    <>
      <PageHeader title="Settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Your name"
          description="Saved in this browser and shown in the change history next to everything you add, edit or delete."
        >
          {param(sp, "saved") === "name" && (
            <div className="mb-3">
              <Alert tone="info">Saved.</Alert>
            </div>
          )}
          <form action={setEditorName} className="flex flex-wrap gap-2">
            <label htmlFor="editor-name" className="sr-only">
              Your name
            </label>
            <Input id="editor-name" name="name" defaultValue={actor ?? ""} placeholder="e.g. Shakil" maxLength={60} className="flex-1" />
            <SubmitButton>Save name</SubmitButton>
          </form>
        </Card>

        <Card title="Backup" description="Everything in one Excel file: cash book, members, fees and payments, loans and the change history.">
          <LinkButton href="/export" prefetch={false}>
            Download Excel backup
          </LinkButton>
        </Card>
      </div>

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
