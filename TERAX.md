# TERAX.md — Project context (read this first, every session)

## What we are building
Web platform that automates multi-step enterprise workflows (rule-based) with human approvals and a full audit log.
Two deep verticals: **Finance** (invoices -> anomaly rules -> approval -> reconciliation -> payment reminders) and **Support** (tickets -> triage -> investigation -> action -> escalation).
Plus a communication layer: **announcements** (admin only) and **video meetings** (Jitsi as a Service iframe).
Principle: **AI proposes, rules decide, a human validates.** The LLM never approves a payment and never triggers an action.
Hackathon deadline: Nov 8, 2026, 23:00 GMT. Code freeze Nov 8, 18:00 GMT. Prefer simple and working over clever.

## Stack (do not change without asking)
- Next.js 15 (App Router) + React 19 + TypeScript **strict** + Tailwind + shadcn/ui
- PostgreSQL 16 + Prisma 6 (`prisma@6`, `@prisma/client@6`). Schema is in `prisma/schema.prisma` — extend it, never rewrite it.
- Background jobs: `pg-boss@10` in a separate process (`src/worker/index.ts`). No Redis.
- Validation: Zod. Rules: `json-logic-js`. Tests: `vitest`.
- Auth: our own simple session (`jose` JWT in an httpOnly cookie + `bcryptjs`). No Auth.js.
- LLM: `openai` SDK with `baseURL = process.env.VULTR_INFERENCE_BASE_URL`.
- UI text and code comments in **English**. Docs for the team are in French.

## Rules (hard)
1. Money = integer cents. Never floats.
2. Every server action/route: check session, role, and `orgId`. Never trust the client.
3. Every state change writes an audit entry in the **same transaction** via `audit()` (`src/server/audit.ts`). No update/delete route for `AuditLog`.
4. Validate all input with Zod. Prisma only, no string-built SQL.
5. Pages that read the DB: `export const dynamic = 'force-dynamic'` (the Docker build has no database).
6. Secrets only in `.env` (never committed). The LLM key is server-side only.
7. LLM calls: low temperature, JSON output validated by Zod, 15 s timeout, 1 retry, **and a non-AI fallback**. The app must work with the LLM off.
8. Do not add libraries, rename folders, or change the stack on your own. If something is unclear, stop and ask.

## How to work
- Do **one task at a time** from `docs/tasks/NN-*.md`. Read only that file plus this one.
- Make a short plan first. Then implement. Then run the checks listed in the task.
- Done = the task's "Done when" list passes. Then `git add -A && git commit -m "task NN: ..."`.
- Do not start the next task until the commit is made.
- Keep files small (< 200 lines). Prefer many small modules.

## Commands
- `npm run dev` — dev server on :3000 · `npm run build` — must pass · `npm test` — vitest
- `npm run worker` — start the job worker · `npm run seed` — load demo data
- `npx prisma migrate dev --name <name>` — after any schema change

## Layout
```
src/app/(auth)/login        src/app/(app)/{dashboard,workflows,invoices,tickets,announcements,meetings,admin,audit}
src/app/api/...             src/server/engine/{runner,rules,handlers,templates}
src/server/{audit.ts,session.ts,connectors/,ai/}     src/worker/index.ts
prisma/{schema.prisma,seed.ts}     scripts/gen_data.py     tests/
```
