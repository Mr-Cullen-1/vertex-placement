/**
 * One-time (but idempotent — safe to re-run) application of Vertex's
 * approved institutional score-band policy to the real Language Hub
 * Placement Test, plus the historical-result backfill it unlocks. See
 * /docs/PHASE_2L_SCORING_POLICY.md ("Approved Vertex institutional score
 * bands", "Historical results backfill").
 *
 * These are VERTEX'S OWN institutional thresholds — NOT official Macmillan
 * score cutoffs. See /docs/PHASE_2D.md and /docs/PHASE_2E.md for the
 * source-fidelity analysis establishing that distinction.
 *
 * Only ever touches the ONE real test titled exactly
 * "Language Hub Placement Test" (the same lookup Phase 2D's import used)
 * — never any other test. Only ever sets a previously-null
 * `placementBandId` on that test's existing results; never touches
 * `rawScore`, `percentage`, answers, or completion timestamps. Skips band
 * creation entirely if the test already has ANY configured bands (no
 * silent overwrite), and always re-checks before creating (safe to
 * re-run — running twice creates zero additional bands and backfills
 * zero additional results the second time).
 *
 * Usage: node scripts/apply-language-hub-institutional-bands.mjs
 *
 * This script duplicates (does not import) the logic in
 * src/server/services/language-hub-scoring.service.ts — that TS module is
 * what the integration test suite exercises (RBAC-gated, reused
 * `createPlacementBand` validation) and is the actual source of truth for
 * the band values; this plain-Node script exists only so the one real
 * production/dev database can be updated without a ts-node/path-alias
 * runtime setup (this repo's scripts/ convention — see
 * prisma/seed.ts, scripts/qa-check-responsive.mjs). Keep both in sync if
 * the approved bands ever change.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const TEST_TITLE = "Language Hub Placement Test";

const INSTITUTIONAL_BANDS = [
  { order: 1, label: "Beginner", minRawScore: 0, maxRawScore: 6 },
  { order: 2, label: "Elementary", minRawScore: 7, maxRawScore: 17 },
  { order: 3, label: "Pre-Intermediate", minRawScore: 18, maxRawScore: 34 },
  { order: 4, label: "Intermediate", minRawScore: 35, maxRawScore: 48 },
  { order: 5, label: "Upper Intermediate", minRawScore: 49, maxRawScore: 60 },
  { order: 6, label: "Advanced", minRawScore: 61, maxRawScore: 70 },
];

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const test = await db.placementTest.findFirst({
    where: { title: TEST_TITLE },
    include: { bands: true },
  });
  if (!test) {
    throw new Error(`Test not found: "${TEST_TITLE}" — refusing to apply institutional bands.`);
  }

  let bandsCreated = 0;
  if (test.bands.length === 0) {
    for (const band of INSTITUTIONAL_BANDS) {
      await db.placementBand.create({
        data: {
          testId: test.id,
          order: band.order,
          label: band.label,
          scoringMode: "RAW_SCORE",
          minRawScore: band.minRawScore,
          maxRawScore: band.maxRawScore,
        },
      });
      bandsCreated += 1;
    }
    console.log(`Created ${bandsCreated} institutional RAW_SCORE bands for "${TEST_TITLE}".`);
  } else {
    console.log(
      `"${TEST_TITLE}" already has ${test.bands.length} configured band(s) — skipping band creation.`
    );
  }

  const bands = await db.placementBand.findMany({ where: { testId: test.id } });

  const resultsToBackfill = await db.placementResult.findMany({
    where: { placementBandId: null, attempt: { assignment: { testId: test.id } } },
  });

  let resultsBackfilled = 0;
  for (const result of resultsToBackfill) {
    const match = bands.find(
      (b) =>
        b.scoringMode === "RAW_SCORE" &&
        b.minRawScore !== null &&
        b.maxRawScore !== null &&
        result.rawScore >= b.minRawScore &&
        result.rawScore <= b.maxRawScore
    );
    if (!match) continue;
    await db.placementResult.update({
      where: { id: result.id },
      data: { placementBandId: match.id },
    });
    console.log(`  Backfilled result ${result.id}: ${result.rawScore}/${result.totalQuestions} -> ${match.label}`);
    resultsBackfilled += 1;
  }

  console.log(`\nTest: ${test.id}`);
  console.log(`Bands created: ${bandsCreated}`);
  console.log(`Historical results backfilled: ${resultsBackfilled}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
