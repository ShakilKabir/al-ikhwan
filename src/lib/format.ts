const moneyFormat = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wholeMoneyFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** 12345.5 → "12,345.50"; negatives as "(12,345.50)" like the spreadsheet. */
export function formatMoney(n: number) {
  const s = moneyFormat.format(Math.abs(round2(n)));
  return n < 0 && round2(n) !== 0 ? `(${s})` : s;
}

/** For headline figures: "৳ 12,346". */
export function formatTaka(n: number) {
  const s = wholeMoneyFormat.format(Math.abs(n));
  return `${n < 0 && Math.round(n) !== 0 ? "−" : ""}৳ ${s}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-04-07" → "07 Apr 2026". Dates are plain calendar dates; no time zones involved. */
export function formatDate(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function monthLabel(month: number) {
  return MONTHS[month - 1];
}

/** Today's date in Bangladesh as "YYYY-MM-DD". */
export function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

export function currentYear() {
  return Number(today().slice(0, 4));
}
