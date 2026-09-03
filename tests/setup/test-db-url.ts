// Fixed, hardcoded test connection info — this is a fully-controlled,
// ephemeral local Postgres instance (see global-setup.ts), so there's no
// need for dynamic port allocation. Kept separate from the dev DB
// (scripts/local-postgres.mjs, port 55432) so `npm test` and
// `npm run dev` never fight over the same instance.
export const TEST_PG_PORT = 55433;
export const TEST_PG_DATABASE = "vertex_placement_test";
export const TEST_DATABASE_URL = `postgresql://postgres:postgres@127.0.0.1:${TEST_PG_PORT}/${TEST_PG_DATABASE}?schema=public`;
