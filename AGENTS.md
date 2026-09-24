<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project notes

Al-Ikhwan club accounts: cash book, member dues, lender accounts. Read README.md first; its "How the numbers work" section is the source of truth for the accounting rules.

- Schema: `src/db/schema.ts`. After changing it run `npm run db:generate` and commit the migration in `drizzle/`.
- Reads go in `src/lib/queries/`, writes in `src/lib/services/` (each write runs in a transaction and records an `audit_log` row). Server actions in `src/app/**/actions.ts` only parse forms and call services.
- Money is `numeric(12,2)`, read as numbers; sum in SQL, round with `round2` in JS.
- Dates are plain `YYYY-MM-DD` strings (no time zones).
- Access: every server action that writes starts with `getActor()` (or `requireUser()`/`requireAdmin()`), and every page that edits calls `requireUser(path)`. Show members' phone, birth date, blood group and notes only when `getCurrentUser()` returns a user.
- Verify with `npm run typecheck && npm run lint && npm test`.
