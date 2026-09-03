#!/usr/bin/env node
// Dev-only convenience: runs a real, local PostgreSQL instance via the
// `embedded-postgres` binary distribution, so `npm run db:migrate` etc.
// work without Docker or a system-wide Postgres install. This is a
// development tool only — production points DATABASE_URL at a real
// managed PostgreSQL instance (see .env.example / README.md).
//
// Usage:
//   node scripts/local-postgres.mjs start   # idempotent; prints DATABASE_URL
//   node scripts/local-postgres.mjs stop
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const LOCAL_PG_PORT = 55432;
export const LOCAL_PG_USER = "postgres";
export const LOCAL_PG_PASSWORD = "postgres";
export const LOCAL_PG_DATABASE = "vertex_placement";
export const LOCAL_PG_DATA_DIR = path.join(__dirname, "..", ".pgdata", "dev");
export const LOCAL_DATABASE_URL = `postgresql://${LOCAL_PG_USER}:${LOCAL_PG_PASSWORD}@127.0.0.1:${LOCAL_PG_PORT}/${LOCAL_PG_DATABASE}?schema=public`;

export function createLocalPostgres() {
  return new EmbeddedPostgres({
    databaseDir: LOCAL_PG_DATA_DIR,
    user: LOCAL_PG_USER,
    password: LOCAL_PG_PASSWORD,
    port: LOCAL_PG_PORT,
    persistent: true,
    // Force UTF8/C locale regardless of host OS locale — the host machine
    // running this may default initdb to a non-UTF8 codepage (observed:
    // WIN1251 on a Russian-locale Windows install), which would corrupt
    // non-Latin1 candidate names. Production Postgres should also be
    // provisioned with UTF8 encoding explicitly.
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });
}

async function start() {
  const pg = createLocalPostgres();
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase(LOCAL_PG_DATABASE);
  } catch {
    // already exists — fine, start is idempotent
  }
  console.log(`Local Postgres running. DATABASE_URL=${LOCAL_DATABASE_URL}`);
  console.log("Leave this process running, then in another terminal:");
  console.log("  npm run db:migrate");
  console.log("Stop with: node scripts/local-postgres.mjs stop (Ctrl+C also works)");
}

async function stopViaPgCtl() {
  // A fresh process (e.g. `stop` invoked separately from `start`) can't
  // reuse the EmbeddedPostgres instance that owns the running child
  // process, so shut it down directly via pg_ctl against the data dir.
  const { spawnSync } = await import("node:child_process");
  const pgCtlCandidates = [
    path.join(
      __dirname,
      "..",
      "node_modules",
      "@embedded-postgres",
      "windows-x64",
      "native",
      "bin",
      "pg_ctl.exe"
    ),
    path.join(
      __dirname,
      "..",
      "node_modules",
      "@embedded-postgres",
      "linux-x64",
      "native",
      "bin",
      "pg_ctl"
    ),
    path.join(
      __dirname,
      "..",
      "node_modules",
      "@embedded-postgres",
      "darwin-arm64",
      "native",
      "bin",
      "pg_ctl"
    ),
  ];
  const { existsSync } = await import("node:fs");
  const pgCtl = pgCtlCandidates.find((candidate) => existsSync(candidate));
  if (!pgCtl) {
    console.error("Could not locate pg_ctl binary for this platform.");
    process.exit(1);
  }
  const result = spawnSync(pgCtl, ["-D", LOCAL_PG_DATA_DIR, "stop"], {
    stdio: "inherit",
  });
  process.exit(result.status ?? 0);
}

const command = process.argv[2];

if (command === "start") {
  await start();
  // Keep the process (and the Postgres child process) alive.
  await new Promise(() => {});
} else if (command === "stop") {
  await stopViaPgCtl();
} else {
  console.error("Usage: node scripts/local-postgres.mjs <start|stop>");
  process.exit(1);
}
