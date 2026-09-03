import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 config-based datasource. Runtime queries use the driver adapter
// in src/lib/db.ts; this config is what `prisma migrate` / `prisma studio`
// / `prisma db seed` use. See /docs/DATABASE.md.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
