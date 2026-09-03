import { db } from "@/lib/db";

/** TRUNCATE ... CASCADE handles the self-referencing FK on
 * PlacementInvitation.regeneratedFromId correctly (plain deleteMany
 * ordering does not, since Postgres checks that FK per-row within the
 * same statement). Call between tests that touch the database. */
export async function resetDb(): Promise<void> {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "placement_answers", "placement_results", "placement_attempts",
      "placement_invitations", "placement_assignments", "candidates",
      "placement_bands", "question_metadata", "options", "questions",
      "import_jobs", "placement_tests", "users"
    RESTART IDENTITY CASCADE
  `);
}
