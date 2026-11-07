# Task 00 — Project setup
Goal: working empty app with database and tooling.
Important: `create-next-app` refuses to run in a folder that already has files (TERAX.md, docs/, prisma/, Dockerfile...). So we create the app in a temporary folder and merge it. Do NOT overwrite existing files (README.md, .gitignore, TERAX.md, docs/, prisma/, Dockerfile, docker-compose.yml, Caddyfile, .env.example, deploy.sh).
Do:
1. Create the app in a temp folder, merge it, clean up:
   - `npx create-next-app@15 tmp-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
   - `rsync -a --ignore-existing --exclude node_modules --exclude .git tmp-app/ ./`
   - `rm -rf tmp-app`
   - `printf 'next-env.d.ts\n*.tsbuildinfo\ncoverage\n' >> .gitignore`
2. Install: `npm install`, then `npm i @prisma/client@6 zod jose bcryptjs json-logic-js pg-boss@10 openai recharts` and dev: `npm i -D prisma@6 vitest tsx @types/bcryptjs @types/json-logic-js`.
3. shadcn/ui, non-interactive: `npx shadcn@latest init -d`, then `npx shadcn@latest add button card input table badge dialog dropdown-menu tabs sonner -y`.
4. Add scripts in package.json: `"start": "next start"`, `"worker": "tsx src/worker/index.ts"`, `"test": "vitest run"`, `"seed": "tsx prisma/seed.ts"` (keep the existing dev/build/lint scripts).
5. Database + env: `cp .env.example .env`. Local Postgres, choose ONE:
   - Docker Desktop installed: `docker run -d --name pg -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16-alpine`, and `DATABASE_URL=postgresql://postgres:dev@localhost:5432/postgres`.
   - No Docker: install Postgres.app, start it, and use `DATABASE_URL=postgresql://<mac-username>@localhost:5432/postgres`.
6. `npx prisma migrate dev --name init`.
7. Create `src/server/db.ts` exporting a singleton PrismaClient. Create `src/server/audit.ts` exporting `audit(tx, {orgId, actorType, actorId, action, entityType, entityId, data})`.
Done when: `npm run build` passes, `npm run dev` shows the default page on http://localhost:3000, `npx prisma studio` shows all tables, `git status` shows .env is NOT listed (it is ignored).
