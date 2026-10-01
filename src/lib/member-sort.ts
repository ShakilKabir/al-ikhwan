/** Sorting the member list by ID, name or dues (the ?sort= and &dir= query parameters). */

export const MEMBER_SORTS = ["id", "name", "due"] as const;
export type MemberSort = (typeof MEMBER_SORTS)[number];
export type SortDir = "asc" | "desc";

/** What a first click on a column does: dues start with the most owed, the others from A/1. */
export const DEFAULT_DIR: Record<MemberSort, SortDir> = { id: "asc", name: "asc", due: "desc" };

export function parseMemberSort(sort?: string, dir?: string): { sort: MemberSort; dir: SortDir } {
  const key = MEMBER_SORTS.find((s) => s === sort) ?? "id";
  return { sort: key, dir: dir === "asc" || dir === "desc" ? dir : DEFAULT_DIR[key] };
}

/** Clicking the current sort column reverses it; another column starts in its default direction. */
export function nextSortDir(column: MemberSort, current: { sort: MemberSort; dir: SortDir }): SortDir {
  if (column !== current.sort) return DEFAULT_DIR[column];
  return current.dir === "asc" ? "desc" : "asc";
}

type Sortable = { code: string; name: string; due: number };

/** "R-9" before "R-10". */
const byCode = (a: Sortable, b: Sortable) => a.code.localeCompare(b.code, "en", { numeric: true });

const COMPARE: Record<MemberSort, (a: Sortable, b: Sortable) => number> = {
  id: byCode,
  name: (a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  due: (a, b) => a.due - b.due,
};

/** Sorted copy; ties (e.g. everyone who is paid up) stay in ID order. */
export function sortMembers<T extends Sortable>(rows: T[], sort: MemberSort, dir: SortDir): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => sign * COMPARE[sort](a, b) || byCode(a, b));
}
