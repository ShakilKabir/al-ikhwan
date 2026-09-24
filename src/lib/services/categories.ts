import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import type { CategoryInput } from "@/lib/validation";
import {
  FOREIGN_KEY_VIOLATION,
  missing,
  pgErrorCode,
  recordAudit,
  ServiceError,
  UNIQUE_VIOLATION,
} from "./common";

function friendly(error: unknown, input?: CategoryInput): never {
  const code = pgErrorCode(error);
  if (code === UNIQUE_VIOLATION && input) {
    throw new ServiceError(`A category called "${input.name}" already exists.`);
  }
  if (code === FOREIGN_KEY_VIOLATION) {
    throw new ServiceError(
      "This category has cash book entries. Move them to another category first.",
    );
  }
  throw error;
}

export async function createCategory(input: CategoryInput, actor: string | null) {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(categories).values(input).returning();
      await recordAudit(tx, {
        actor,
        action: "create",
        entity: "category",
        entityId: row.id,
        summary: `Added ${row.type} category "${row.name}"`,
        after: row,
      });
      return row;
    });
  } catch (error) {
    friendly(error, input);
  }
}

/** Renaming updates every entry; changing income/expense only works while it has none. */
export async function updateCategory(id: number, input: CategoryInput, actor: string | null) {
  try {
    return await db.transaction(async (tx) => {
      const [before] = await tx.select().from(categories).where(eq(categories.id, id));
      if (!before) missing("Category");
      const [after] = await tx
        .update(categories)
        .set(input)
        .where(eq(categories.id, id))
        .returning();
      await recordAudit(tx, {
        actor,
        action: "update",
        entity: "category",
        entityId: id,
        summary: `Changed category "${before.name}" to "${after.name}" (${after.type})`,
        before,
        after,
      });
      return after;
    });
  } catch (error) {
    friendly(error, input);
  }
}

export async function deleteCategory(id: number, actor: string | null) {
  try {
    await db.transaction(async (tx) => {
      const [before] = await tx.delete(categories).where(eq(categories.id, id)).returning();
      if (!before) missing("Category");
      await recordAudit(tx, {
        actor,
        action: "delete",
        entity: "category",
        entityId: id,
        summary: `Deleted category "${before.name}"`,
        before,
      });
    });
  } catch (error) {
    friendly(error);
  }
}
