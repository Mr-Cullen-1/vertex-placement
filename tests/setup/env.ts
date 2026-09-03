import { TEST_DATABASE_URL } from "./test-db-url";

// Runs before each test file's own imports (Vitest `setupFiles`
// contract), so `@/lib/db` and `@/lib/env` see these values the first
// time they're imported. Must stay a plain, synchronous module — no
// async work here.
process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.AUTH_SECRET = "test-only-secret-value-not-used-for-anything-real";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
