# Vertex Placement

A professional English placement test platform for educational centers.
Standalone product — independent codebase, database, and deployment. See
[`/docs`](./docs) for architecture, database, routes, product rules, and
the design system.

**Status:** Phase 1 (core backend foundation) complete. The domain/service
layer, RBAC, token and attempt lifecycles, and the scoring/submission
pipeline are implemented and tested — see
[`docs/PHASE_1.md`](./docs/PHASE_1.md). No visual UI (student test screen,
admin dashboard) is built yet.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma 7 · Tailwind CSS
v4 · shadcn/ui · Auth.js v5 · Zod · Vitest

## Getting started

1. Copy `.env.example` to `.env` and fill in a real `DATABASE_URL` (a local
   or hosted PostgreSQL instance) and a generated `AUTH_SECRET`
   (`npx auth secret`). For local development without installing
   PostgreSQL yourself, run `npm run db:local:start` in its own terminal
   first — it boots a real local Postgres and the default `.env` already
   points at it.
2. Install dependencies: `npm install`
3. Apply the schema: `npm run db:migrate`
4. Bootstrap the first Super Admin: set `SEED_SUPER_ADMIN_EMAIL` /
   `SEED_SUPER_ADMIN_PASSWORD` in `.env`, then `npm run db:seed`. Clear
   those two env vars afterward — there is no public registration.
   Optionally set `SEED_DEV_SAMPLE_TEST=true` first to also seed a small,
   clearly-marked DEVELOPMENT-ONLY test (see `docs/PHASE_1.md`).
5. `npm run dev` and sign in at `/admin/login`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Run the test suite (Vitest — boots its own ephemeral test database) |
| `npm run test:watch` | Test suite in watch mode |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:seed` | Run `prisma/seed.ts` (Super Admin bootstrap + optional dev sample test) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:local:start` | Boot a real local PostgreSQL for development (no Docker/system install needed) |
| `npm run db:local:stop` | Stop it |

## Docs

- [`docs/PHASE_1.md`](./docs/PHASE_1.md) — Phase 1 implementation report: services, RBAC, token/attempt/scoring flow, tests, security review
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system architecture, folder structure, extensibility points
- [`docs/DATABASE.md`](./docs/DATABASE.md) — schema and the reasoning behind each entity split
- [`docs/ROUTES.md`](./docs/ROUTES.md) — route map and auth/role gating
- [`docs/PRODUCT_RULES.md`](./docs/PRODUCT_RULES.md) — business rules distilled from the product brief
- [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) — visual direction and design tokens
