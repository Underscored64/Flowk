# Task 01 — Auth and roles
Goal: login with email/password, 3 roles (admin, manager, agent), protected pages.
Do:
1. `src/server/session.ts`: create/verify a JWT (jose, HS256, `SESSION_SECRET`, 8 h) stored in an httpOnly, SameSite=Lax, Secure-in-production cookie. Export `getSession()` and `requireRole(...roles)`.
2. Login page `(auth)/login` + route `POST /api/auth/login` (Zod, bcryptjs compare, simple in-memory rate limit: 5 tries/min per IP) and `POST /api/auth/logout`.
3. Layout `(app)/layout.tsx`: redirect to /login if no session; sidebar with links filtered by role; header with user name and logout.
4. `prisma/seed.ts` (start of it): 1 organization + 3 users: admin@demo.test, manager@demo.test, agent@demo.test (password `demo1234`, documented in README only for the demo).
5. Admin page `admin/users`: list users, create user (admin only).
6. Every action writes `audit()` (login, logout, user created).
Done when: wrong password is refused; agent cannot open /admin (403 page); admin can create a user; `audit` rows appear; `npm run build` passes.
