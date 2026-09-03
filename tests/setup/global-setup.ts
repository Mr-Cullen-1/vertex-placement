import { execSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { TEST_DATABASE_URL, TEST_PG_DATABASE, TEST_PG_PORT } from "./test-db-url";

/**
 * Vitest globalSetup — runs once, in the main process, before any test
 * file. Boots a real, ephemeral PostgreSQL instance (see
 * /docs/PHASE_1.md "Testing" for why: several requirements — attempt
 * creation races, the partial-unique-index invitation guard, transaction
 * behavior in the finalize pipeline — aren't meaningfully testable
 * against a mock). `persistent: false` means `stop()` deletes the data
 * directory, so no state survives between `npm test` runs.
 *
 * Known Windows quirk: `embedded-postgres`'s shutdown can leave one
 * orphaned worker process (observed: a `--forkchild="io_worker"` whose
 * parent postmaster has already exited) still holding the listening
 * socket after `stop()` resolves — a limitation of the underlying
 * binary's process-tree handling on Windows, not something `stop()`
 * itself can prevent. `ensurePortFree` below cleans up any such leftover
 * from a *previous* run before starting a new one, and the returned
 * teardown is raced against a timeout so THIS run's own exit is never
 * blocked by the same issue.
 */
export default async function globalSetup() {
  await ensurePortFree(TEST_PG_PORT);

  const pg = new EmbeddedPostgres({
    databaseDir: path.join(process.cwd(), ".pgdata", "test"),
    user: "postgres",
    password: "postgres",
    port: TEST_PG_PORT,
    persistent: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {}, // keep test output focused on test results
    onError: (message) => console.error("[test postgres]", message),
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(TEST_PG_DATABASE);

  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    // prisma.config.ts (the CLI's datasource) reads DIRECT_DATABASE_URL,
    // not DATABASE_URL — see /docs/PHASE_1.md ("Phase 1.5 — Supabase
    // connection"). This local ephemeral instance has no pooled/direct
    // distinction, so both point at the same single database.
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_DATABASE_URL: TEST_DATABASE_URL,
    },
    stdio: "inherit",
  });

  return async () => {
    await Promise.race([
      pg.stop(),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
  };
}

async function isPortInUse(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

/** If the test port is already in use — almost certainly a leftover
 * orphan from a previous run's imperfect shutdown, not a real service —
 * try to reclaim it (Windows only) rather than making every `npm test`
 * after a bad exit require manual cleanup. Best-effort: if it can't be
 * reclaimed, fails with a clear, actionable error instead of hanging. */
async function ensurePortFree(port: number): Promise<void> {
  if (!(await isPortInUse(port))) return;

  if (process.platform === "win32") {
    try {
      killLeftoverTestPostgresOnWindows();
    } catch {
      // fall through to the check below regardless
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (await isPortInUse(port)) {
    throw new Error(
      `Test Postgres port ${port} is already in use and could not be reclaimed ` +
        `automatically — a previous test run likely didn't shut down cleanly. Free it ` +
        `manually (Task Manager, or taskkill/kill on whatever is listening) and try ` +
        `again. See /docs/PHASE_1.md ("Testing").`
    );
  }
}

function killLeftoverTestPostgresOnWindows(): void {
  // Scoped narrowly: only postgres.exe processes whose command line
  // references OUR test data directory, never anything else on the
  // machine. `.pgdata\test` only ever appears in a process spawned by
  // this file.
  const psCommand =
    "Get-CimInstance Win32_Process -Filter \"Name='postgres.exe'\" " +
    "| Where-Object { $_.CommandLine -like '*.pgdata*test*' } " +
    "| ForEach-Object { $_.ProcessId }";
  const output = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
    encoding: "utf8",
  });
  const pids = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line));

  for (const pid of pids) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    } catch {
      // process may have already exited — fine
    }
  }
}
