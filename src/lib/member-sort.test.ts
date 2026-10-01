import { describe, expect, it } from "vitest";
import { nextSortDir, parseMemberSort, sortMembers } from "./member-sort";

const rows = [
  { code: "R-10", name: "rana", due: 0 },
  { code: "R-9", name: "Zia", due: 3800 },
  { code: "R-2", name: "Ashik", due: 0 },
  { code: "R-100", name: "Bipu", due: 500 },
];
const codes = (list: typeof rows) => list.map((r) => r.code);

describe("sortMembers", () => {
  it("orders IDs by number, not letter by letter", () => {
    expect(codes(sortMembers(rows, "id", "asc"))).toEqual(["R-2", "R-9", "R-10", "R-100"]);
    expect(codes(sortMembers(rows, "id", "desc"))).toEqual(["R-100", "R-10", "R-9", "R-2"]);
  });

  it("orders names ignoring case", () => {
    expect(sortMembers(rows, "name", "asc").map((r) => r.name)).toEqual(["Ashik", "Bipu", "rana", "Zia"]);
  });

  it("orders dues, keeping ties in ID order either way", () => {
    expect(codes(sortMembers(rows, "due", "desc"))).toEqual(["R-9", "R-100", "R-2", "R-10"]);
    expect(codes(sortMembers(rows, "due", "asc"))).toEqual(["R-2", "R-10", "R-100", "R-9"]);
  });

  it("doesn't change the list it was given", () => {
    const before = codes(rows);
    sortMembers(rows, "due", "desc");
    expect(codes(rows)).toEqual(before);
  });
});

describe("sort parameters", () => {
  it("falls back to ID order, and dues default to most owed first", () => {
    expect(parseMemberSort()).toEqual({ sort: "id", dir: "asc" });
    expect(parseMemberSort("nonsense", "sideways")).toEqual({ sort: "id", dir: "asc" });
    expect(parseMemberSort("due")).toEqual({ sort: "due", dir: "desc" });
    expect(parseMemberSort("name", "desc")).toEqual({ sort: "name", dir: "desc" });
  });

  it("clicking the current column reverses it; another column starts fresh", () => {
    expect(nextSortDir("name", { sort: "name", dir: "asc" })).toBe("desc");
    expect(nextSortDir("due", { sort: "name", dir: "asc" })).toBe("desc");
    expect(nextSortDir("id", { sort: "due", dir: "desc" })).toBe("asc");
  });
});
