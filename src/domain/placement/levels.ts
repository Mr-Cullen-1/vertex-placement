/**
 * The six standard Vertex placement level names — shared vocabulary
 * between the Language Hub course-level progression ranges
 * (`PROGRESSION_BANDS`, question-number based, diagnostic only) and an
 * admin's Final Placement override (`attempt.service.ts`'s
 * `setFinalPlacement`, an administrative decision, not a scoring output).
 * Kept as one small shared list so both features can never drift into
 * incompatible label sets. See /docs/PHASE_2L_SCORING_POLICY.md.
 */
export const STANDARD_PLACEMENT_LEVELS = [
  "Beginner",
  "Elementary",
  "Pre-Intermediate",
  "Intermediate",
  "Upper Intermediate",
  "Advanced",
] as const;

export type StandardPlacementLevel = (typeof STANDARD_PLACEMENT_LEVELS)[number];

export function isStandardPlacementLevel(value: string): value is StandardPlacementLevel {
  return (STANDARD_PLACEMENT_LEVELS as readonly string[]).includes(value);
}
