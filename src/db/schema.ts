/**
 * Database schema. Column names are camelCase here and snake_case in Postgres
 * (see `casing: 'snake_case'` in src/db/index.ts and drizzle.config.ts).
 *
 * After changing this file run `npm run db:generate` to create a migration.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Money is stored exactly as numeric(12,2) and read as a JS number. Sum it in SQL. */
const money = () => numeric({ precision: 12, scale: 2, mode: "number" });

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const memberCategory = pgEnum("member_category", [
  "regular",
  "executive",
  "advisor",
  "prospective",
]);

export const members = pgTable("members", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  /** Club ID such as R-01 (regular), E-01 (executive), A-01 (advisor), U-01 (under consideration). */
  code: text().notNull().unique(),
  /** Legacy ID from older lists, e.g. "H 02". */
  oldCode: text(),
  name: text().notNull(),
  category: memberCategory().notNull(),
  /** General, Ulama/Tolaba/Student, Exempted, Executive member, … */
  memberType: text(),
  phone: text(),
  registeredOn: date({ mode: "string" }),
  /** Null means the member is not charged a yearly fee (advisors, prospective members). */
  yearlyFee: money(),
  /** Committee member who follows up on this member's dues. */
  assignedTo: text(),
  bloodGroup: text(),
  dateOfBirth: date({ mode: "string" }),
  notes: text(),
  isActive: boolean().notNull().default(true),
  ...timestamps,
});

/**
 * What a member owes, apart from payments recorded in the cash book
 * (transactions.memberId). Amounts are positive; the kind decides the sign:
 *   opening_balance, yearly_fee, charge  → increase dues
 *   waiver, payment                      → reduce dues
 * An opening balance may be negative (an advance carried forward).
 */
export const ledgerKind = pgEnum("member_ledger_kind", [
  "opening_balance",
  "yearly_fee",
  "charge",
  "waiver",
  "payment",
]);

export const memberLedger = pgTable(
  "member_ledger",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    memberId: integer()
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    date: date({ mode: "string" }).notNull(),
    kind: ledgerKind().notNull(),
    amount: money().notNull(),
    description: text(),
    ...timestamps,
  },
  (t) => [
    check(
      "member_ledger_amount_sign",
      sql`${t.amount} > 0 or (${t.kind} = 'opening_balance' and ${t.amount} <> 0)`,
    ),
    // A member can be charged the yearly fee only once per year.
    uniqueIndex("member_ledger_one_yearly_fee_per_year")
      .on(t.memberId, sql`extract(year from ${t.date})`)
      .where(sql`${t.kind} = 'yearly_fee'`),
    index().on(t.memberId, t.date),
  ],
);

// ---------------------------------------------------------------------------
// Cash book
// ---------------------------------------------------------------------------

export const entryType = pgEnum("entry_type", ["income", "expense"]);

export const categories = pgTable(
  "categories",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull().unique(),
    type: entryType().notNull(),
    ...timestamps,
  },
  // Target of the composite foreign key on transactions.
  (t) => [unique().on(t.id, t.type)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    date: date({ mode: "string" }).notNull(),
    particulars: text().notNull(),
    type: entryType().notNull(),
    categoryId: integer().notNull(),
    amount: money().notNull(),
    /** Set when this income is a member paying their dues; it then reduces what they owe. */
    memberId: integer().references(() => members.id),
    notes: text(),
    ...timestamps,
  },
  (t) => [
    // The category must be of the same type (income/expense) as the transaction.
    foreignKey({
      columns: [t.categoryId, t.type],
      foreignColumns: [categories.id, categories.type],
    }),
    check("transactions_amount_positive", sql`${t.amount} > 0`),
    check(
      "transactions_member_only_on_income",
      sql`${t.memberId} is null or ${t.type} = 'income'`,
    ),
    index().on(t.date),
    index().on(t.memberId),
  ],
);

// ---------------------------------------------------------------------------
// Loans (accounts payable)
// ---------------------------------------------------------------------------

export const lenders = pgTable("lenders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull().unique(),
  notes: text(),
  ...timestamps,
});

/**
 * borrowed: the lender paid or lent money for the club (club owes more).
 * repaid:   the club paid the lender back, or a member's fee was settled with them.
 */
export const loanEntryKind = pgEnum("loan_entry_kind", ["borrowed", "repaid"]);

export const loanEntries = pgTable(
  "loan_entries",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    lenderId: integer()
      .notNull()
      .references(() => lenders.id),
    date: date({ mode: "string" }).notNull(),
    kind: loanEntryKind().notNull(),
    amount: money().notNull(),
    description: text().notNull(),
    ...timestamps,
  },
  (t) => [
    check("loan_entries_amount_positive", sql`${t.amount} > 0`),
    index().on(t.lenderId, t.date),
  ],
);

// ---------------------------------------------------------------------------
// Logins: everyone can view, logged-in users can edit, admins manage users
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", ["admin", "editor"]);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  /** What they type to log in (an email, phone number or short name), stored in lowercase. */
  username: text().notNull().unique(),
  name: text().notNull(),
  /** scrypt hash; see src/lib/auth/password.ts. */
  passwordHash: text().notNull(),
  role: userRole().notNull().default("editor"),
  /** True after an admin creates the account or resets the password. */
  mustChangePassword: boolean().notNull().default(true),
  isActive: boolean().notNull().default(true),
  failedLogins: integer().notNull().default(0),
  lockedUntil: timestamp({ withTimezone: true }),
  lastLoginAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the token in the browser's cookie; the token itself is never stored. */
    id: text().primaryKey(),
    userId: integer()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.userId)],
);

// ---------------------------------------------------------------------------
// Change history
// ---------------------------------------------------------------------------

export const auditLog = pgTable(
  "audit_log",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Name of the logged-in user (before logins existed: the name the editor typed in). */
    actor: text(),
    action: text({ enum: ["create", "update", "delete", "import"] }).notNull(),
    entity: text().notNull(),
    entityId: integer(),
    summary: text().notNull(),
    before: jsonb(),
    after: jsonb(),
  },
  (t) => [index().on(t.at)],
);

export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Member = typeof members.$inferSelect;
export type MemberLedgerEntry = typeof memberLedger.$inferSelect;
export type Lender = typeof lenders.$inferSelect;
export type LoanEntry = typeof loanEntries.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserRole = (typeof userRole.enumValues)[number];
export type EntryType = (typeof entryType.enumValues)[number];
export type MemberCategory = (typeof memberCategory.enumValues)[number];
export type LedgerKind = (typeof ledgerKind.enumValues)[number];
export type LoanEntryKind = (typeof loanEntryKind.enumValues)[number];
