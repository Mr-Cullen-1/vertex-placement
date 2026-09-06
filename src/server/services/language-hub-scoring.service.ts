import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { createPlacementBand } from "@/server/services/placement-band.service";
import { TestNotFoundError } from "@/server/errors";

/**
 * Phase 2L — the one-time application of Vertex's approved institutional
 * score-band policy to the real, single Language Hub Placement Test, plus
 * the safe historical backfill it unlocks. See
 * /docs/PHASE_2L_SCORING_POLICY.md ("Approved Vertex institutional score
 * bands", "Historical results backfill").
 *
 * These are VERTEX'S OWN institutional thresholds — NOT official Macmillan
 * score cutoffs. The source ("Language Hub Placement Test", Macmillan
 * Education, 2019) gives only a few non-linear illustrative score
 * examples (18/70 -> "probably ready for Pre-Intermediate", 27/70 ->
 * "second half of Pre-Intermediate", above 60 -> "Advanced"), not a
 * complete six-band cutoff table — see /docs/PHASE_2D.md and
 * /docs/PHASE_2E.md for the full source-fidelity analysis that first
 * established this distinction. This module's ranges are the product
 * decision made on top of that analysis, not a re-derivation of it.
 */
export const LANGUAGE_HUB_TEST_TITLE = "Language Hub Placement Test";

export const LANGUAGE_HUB_INSTITUTIONAL_BANDS = [
  { order: 1, label: "Beginner", minRawScore: 0, maxRawScore: 6 },
  { order: 2, label: "Elementary", minRawScore: 7, maxRawScore: 17 },
  { order: 3, label: "Pre-Intermediate", minRawScore: 18, maxRawScore: 34 },
  { order: 4, label: "Intermediate", minRawScore: 35, maxRawScore: 48 },
  { order: 5, label: "Upper Intermediate", minRawScore: 49, maxRawScore: 60 },
  { order: 6, label: "Advanced", minRawScore: 61, maxRawScore: 70 },
] as const;

export interface LanguageHubBandsResult {
  testId: string;
  bandsCreated: number;
  resultsBackfilled: number;
}

/** Idempotent — safe to run more than once. Only ever touches the ONE
 * real Language Hub test, found by its exact, unique title (the same
 * lookup Phase 2D's import used) — NEVER applies these thresholds to any
 * other test, and never overwrites bands that already exist (if the test
 * already has any configured bands, band creation is skipped entirely;
 * only the historical-result backfill still runs, matching against
 * whatever RAW_SCORE bands currently exist). Never touches `rawScore`,
 * `percentage`, answers, or completion timestamps — only ever sets a
 * previously-null `placementBandId`. */
export async function applyLanguageHubInstitutionalBands(
  actor: Actor
): Promise<LanguageHubBandsResult> {
  assertPermission(actor, "band:write");

  const test = await db.placementTest.findFirst({
    where: { title: LANGUAGE_HUB_TEST_TITLE },
    include: { bands: true },
  });
  if (!test) throw new TestNotFoundError();

  let bandsCreated = 0;
  if (test.bands.length === 0) {
    for (const band of LANGUAGE_HUB_INSTITUTIONAL_BANDS) {
      await createPlacementBand(actor, test.id, {
        order: band.order,
        label: band.label,
        scoringMode: "RAW_SCORE",
        minRawScore: band.minRawScore,
        maxRawScore: band.maxRawScore,
      });
      bandsCreated += 1;
    }
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
    resultsBackfilled += 1;
  }

  return { testId: test.id, bandsCreated, resultsBackfilled };
}
