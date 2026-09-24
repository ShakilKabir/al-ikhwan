import { describe, expect, it } from "vitest";
import { splitPayment } from "./parse-workbook";

const FALLBACK = "2026-04-01";

describe("splitPayment", () => {
  it("uses the month's first day when there is no comment", () => {
    expect(splitPayment(3600, null, FALLBACK)).toEqual([{ date: FALLBACK, amount: 3600 }]);
  });

  it("uses a single day-first date from the comment", () => {
    expect(splitPayment(1000, "31/03/2026-bank to bkash", FALLBACK)).toEqual([
      { date: "2026-03-31", amount: 1000 },
    ]);
    expect(splitPayment(1600, "08-07-2026", FALLBACK)).toEqual([
      { date: "2026-07-08", amount: 1600 },
    ]);
  });

  it("keeps the cell amount when a single date's comment mentions another figure", () => {
    expect(splitPayment(2500, "1/5/26-2546.25", FALLBACK)).toEqual([
      { date: "2026-05-01", amount: 2500 },
    ]);
  });

  it("splits several dated amounts that add up to the cell", () => {
    expect(splitPayment(2000, "10/04/26-500/- 13/4/26 bat sale 1500/-", FALLBACK)).toEqual([
      { date: "2026-04-10", amount: 500 },
      { date: "2026-04-13", amount: 1500 },
    ]);
  });

  it("gives the remainder to the one date without an amount", () => {
    expect(splitPayment(2500, "7/4/26  21/4/26-1000", FALLBACK)).toEqual([
      { date: "2026-04-07", amount: 1500 },
      { date: "2026-04-21", amount: 1000 },
    ]);
  });

  it("falls back to the first date when the amounts don't add up", () => {
    expect(splitPayment(5000, "7/4/26-2000 30/4/26-1800", FALLBACK)).toEqual([
      { date: "2026-04-07", amount: 5000 },
    ]);
  });

  it("ignores comments without a valid date", () => {
    expect(splitPayment(3600, "from loan adjustment", FALLBACK)).toEqual([
      { date: FALLBACK, amount: 3600 },
    ]);
    expect(splitPayment(100, "31/02/2026", FALLBACK)).toEqual([{ date: FALLBACK, amount: 100 }]);
  });
});
