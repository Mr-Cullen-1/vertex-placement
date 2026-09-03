import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 config-based datasource. Runtime queries use the driver adapter
// in src/lib/db.ts (DATABASE_URL — pooled/transaction-mode connection);
// this config is what `prisma migrate` / `prisma studio` / `prisma db seed`
// use, and intentionally reads a SEPARATE, direct (non-pooled) connection
// string. Migrations run DDL and (for `migrate dev`) need to stand up a
// shadow database — operations a transaction-pooled connection (e.g.
// Supabase's Supavisor transaction pooler) cannot reliably support. See
// /docs/PHASE_1.md ("Phase 1.5 — Supabase connection").
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
