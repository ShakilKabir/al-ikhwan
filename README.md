# Al-Ikhwan club accounts

**Live site: https://al-ikhwan-lime.vercel.app**

The club's cash book, member dues and lender accounts as a website. It replaces
the "Al-Ikhwan Income and expenses" Excel workbook: the data was imported from it
once, and the database is now the source of truth.

- **Dashboard**: cash at hand, what lenders and members are owed, income and expenses by year, month and category.
- **Cash book**: every entry in and out, with search, filters and totals. Add, edit, delete.
- **Members**: the member list with each member's dues for a year (carried forward, fees, waived, paid, due), their full statement, and a one-click "charge this year's yearly fee".
- **Loans**: accounts payable. One running account per lender (Bike X, Rana Bhai, Nakib Bhai, …).
- **History**: every change, who made it, and the before/after values.
- **Settings**: cash book categories and an Excel backup download.
- **Users** (admins): who can log in.

Anyone can view the dashboard, cash book, member dues and loans. Changing
anything needs a login (see [Logins](#logins)).

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
  lib/actions.ts    helpers for server actions (getActor() = the logged-in user)
  lib/auth/         passwords, sessions, the current user
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

For a database, use the Neon `preview` branch (a copy of production you can
change freely): `npx vercel env pull .env.local` fills in its connection strings,
or copy them from the Neon console.

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

Pushing to `main` on GitHub deploys to production (Vercel project `al-ikhwan`,
team "Shakil Kabir's projects"). Pull requests get their own preview URL, which
uses the Neon `preview` branch, not live data. Preview URLs need a Vercel login;
only the production address is public.

Environment variables (Vercel → Project → Settings → Environment Variables):

- `DATABASE_URL`: pooled Neon connection string, used by the app
- `DATABASE_URL_UNPOOLED`: direct Neon connection string, used by migrations

## Backups

- **Settings → Download Excel backup** exports every table to one Excel file. Do this now and then and keep a copy.
- Neon can restore the database to any point in the last 6 hours (free plan). See Neon console → project "Al Ikhwan" → Branches → Restore.
- **History** keeps the before/after values of every change, so one bad edit can be put back by hand.

## Logins

| | Can do |
|---|---|
| Anyone (not logged in) | View the dashboard, cash book, member dues and loans. No phone numbers, birth dates, blood groups or member notes; no History, Settings or Excel backup. |
| Editor | Everything above, plus add, edit and delete entries, members, fees and loans; see personal details, History and Settings; download the backup. |
| Admin | Everything an editor can, plus add users, reset passwords and deactivate accounts (Users page). |

- **First admin**: on a new site, `/setup` creates the first admin with a one-time setup code. It stops working as soon as any account exists. If the code is lost before setup, make a new one: `node -e "const c=require('crypto').randomBytes(10).toString('hex').toUpperCase();console.log(c, require('crypto').createHash('sha256').update(c).digest('hex'))"` prints a code and its hash; put the hash in `SETUP_CODE_SHA256` in `src/lib/services/users.ts` and deploy.
- **Adding people**: Users → Add a user. Send them the link, their username and the temporary password; they must choose their own password when they first log in.
- **Forgotten password**: an admin resets it (Users → Edit → Reset password). This also unlocks the account and logs them out everywhere.
- **Safety**: passwords are hashed with scrypt; sessions live in the database (30 days since the last visit) and the browser only holds a random token in an HttpOnly cookie. Five wrong passwords lock an account for 15 minutes. Every page that edits, every server action (through `getActor()` / `requireUser()`) and the Excel export check the login on the server; hiding buttons is only for convenience.

## The spreadsheet import (already done)

`npm run import:xlsx -- "path/to/Al-Ikhwan Income and expenses.xlsx"` loads the
workbook into an empty database, then recomputes cash at hand and every member's
dues and checks them against the figures in the spreadsheet. `--replace` wipes the
database first. **Never run it against production now:** it would erase
everything entered on the website since.
