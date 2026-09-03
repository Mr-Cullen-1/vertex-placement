# Vertex Placement

A professional English placement test platform for educational centers.
Standalone product — independent codebase, database, and deployment. See
[`/docs`](./docs) for architecture, database, routes, product rules, and
the design system.

**Status:** Phase 0 (foundation) complete. No test-taking flow, admin
dashboard, or import pipeline is implemented yet — see
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for what exists.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma 7 · Tailwind CSS
v4 · shadcn/ui · Auth.js v5

## Getting started

1. Copy `.env.example` to `.env` and fill in a real `DATABASE_URL` (a local
   or hosted PostgreSQL instance) and a generated `AUTH_SECRET`
   (`npx auth secret`).
2. Install dependencies: `npm install`
3. Apply the schema: `npm run db:migrate`
4. Bootstrap the first Super Admin: set `SEED_SUPER_ADMIN_EMAIL` /
   `SEED_SUPER_ADMIN_PASSWORD` in `.env`, then `npm run db:seed`. Clear
   those two env vars afterward — there is no public registration.
5. `npm run dev` and sign in at `/admin/login`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:seed` | Run `prisma/seed.ts` (Super Admin bootstrap only) |
| `npm run db:studio` | Prisma Studio |

## Docs

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system architecture, folder structure, extensibility points
- [`docs/DATABASE.md`](./docs/DATABASE.md) — schema and the reasoning behind each entity split
- [`docs/ROUTES.md`](./docs/ROUTES.md) — route map and auth/role gating
- [`docs/PRODUCT_RULES.md`](./docs/PRODUCT_RULES.md) — business rules distilled from the product brief
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — visual direction and design tokens
