# Al-Ikhwan club accounts

The club's cash book, member dues and lender accounts as a website. It replaces
the "Al-Ikhwan Income and expenses" Excel workbook: the data was imported from it
once, and the database is now the source of truth.

- **Dashboard**: cash at hand, what lenders and members are owed, income and expenses by year, month and category.
- **Cash book**: every entry in and out, with search, filters and totals. Add, edit, delete.
- **Members**: the member list with each member's dues for a year (carried forward, fees, waived, paid, due), their full statement, and a one-click "charge this year's yearly fee".
- **Loans**: accounts payable. One running account per lender (Bike X, Rana Bhai, Nakib Bhai, …).
- **History**: every change, who made it, and the before/after values.
- **Settings**: your name (for the history), cash book categories, and an Excel backup download.

## How the numbers work

These rules come from the original workbook and are what the site calculates.

**Cash at hand = income − expenses + what the club still owes lenders.**
When a lender pays a bill for the club, the bill is an expense in the cash book
*and* "borrowed" in that lender's account, so cash doesn't change. When the club
pays a lender back, record it only as "repaid" in the lender's account, never as
a cash book expense; otherwise it is counted twice.

**A member's dues = carried forward + yearly fee + other charges − waivers − payments.**
- Payments are cash book income entries with the member chosen in "Paid by member". They appear on the member's statement automatically. The "Record payment" button on a member's page fills this in.
- Fees, waivers and opening balances are added on the member's page ("Add fee or waiver").
- "Charge yearly fees" on the Members page charges every active member their yearly fee for a year, dated 1 January. A member can only be charged once per year, so it is safe to run twice.
- Payments made before the website existed were imported from the member list's monthly columns. They are recorded on the member's statement, not linked to cash book entries.

Default fees (from the workbook's note) are in `src/lib/club.ts`: regular ৳3600/year, executive ৳1500/year, registration ৳1600.

## Technology

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, server components, server actions), TypeScript, Tailwind CSS 4 |
| Database | PostgreSQL on [Neon](https://neon.tech) (free tier), [Drizzle ORM](https://orm.drizzle.team) |
| Hosting | [Vercel](https://vercel.com) (free Hobby plan), region Singapore (`sin1`) |
| Tests | Vitest, against an in-memory Postgres ([PGlite](https://pglite.dev)) |

Next.js 16 changed a lot. Before writing code, read the docs bundled in `node_modules/next/dist/docs/` (see `AGENTS.md`).

```
src/
  app/              pages and server actions (one folder per section)
  components/       shared UI (ui.tsx), client widgets (client.tsx), charts
  db/schema.ts      the database tables — start here
  db/index.ts       database connection
  lib/queries/      reading data (cash book totals, member dues, loans, history)
  lib/services/     changing data: validation rules and change history live here
  lib/validation.ts form input rules (zod)
  lib/actions.ts    helpers for server actions, and the editor-name cookie
drizzle/            SQL migrations (generated; never edit by hand)
scripts/            the one-time spreadsheet import
tests/              test database helper
```

## Working on it

Requires Node 22.

```bash
npm install
cp .env.example .env.local     # then put a database URL in it (see below)
npm run db:migrate             # create or update the tables
npm run dev                    # http://localhost:3000
```

For a database, create a branch of the production database in the Neon console
(e.g. `dev`) and use its connection strings. A branch is a copy you can change
freely without touching the live data.

Before pushing:

```bash
npm run typecheck && npm run lint && npm test
```

### Changing the database

1. Edit `src/db/schema.ts`.
2. `npm run db:generate` creates a SQL migration in `drizzle/`. Read it.
3. `npm run db:migrate` applies it to your `.env.local` database.
4. Commit the schema and the migration together. Deploys apply pending migrations automatically (`vercel-build` in `package.json`).

## Deploying

Pushing to `main` on GitHub deploys to production. Pull requests get their own
preview URL, which uses the Neon `preview` branch, not live data.

Environment variables (Vercel → Project → Settings → Environment Variables):

- `DATABASE_URL`: pooled Neon connection string, used by the app
- `DATABASE_URL_UNPOOLED`: direct Neon connection string, used by migrations

## Backups

- **Settings → Download Excel backup** exports every table to one Excel file. Do this now and then and keep a copy.
- Neon can restore the database to an earlier point in time (the free plan keeps a short history). See Neon → Branches → Restore.
- **History** keeps the before/after values of every change, so one bad edit can be put back by hand.

## No login (yet)

Anyone with the link can view and edit. The site asks search engines not to
index it, and every change is recorded in History with the name the editor
typed in Settings. To add a login later, check the user in `getActor()` in
`src/lib/actions.ts`: every write goes through it. See
`node_modules/next/dist/docs/01-app/02-guides/authentication.md`.

## The spreadsheet import (already done)

`npm run import:xlsx -- "path/to/Al-Ikhwan Income and expenses.xlsx"` loads the
workbook into an empty database, then recomputes cash at hand and every member's
dues and checks them against the figures in the spreadsheet. `--replace` wipes the
database first. **Never run it against production now:** it would erase
everything entered on the website since.
