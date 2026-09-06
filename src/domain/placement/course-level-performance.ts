import { PROGRESSION_BANDS } from "./progression";

/**
 * Student-facing "Detailed Analysis" diagnostic — performance grouped by
 * the source's six fixed course-level question-number ranges (the same
 * `PROGRESSION_BANDS` used by the admin-only progression diagnostic, see
 * /domain/placement/progression.ts). Deliberately a SEPARATE pure function
 * from that module: this one is about a full per-band breakdown shown to
 * the student, that one is about a single "highest correctly answered
 * question" admin diagnostic — sharing `PROGRESSION_BANDS` (not
 * `computeAnswerBreakdown`) keeps both honest to the one fixed source
 * table without conflating their outputs. See
 * /docs/PHASE_2L_SCORING_POLICY.md ("Performance by course level").
 *
 * NEVER used to derive Recommended Level or Final Placement — this is
 * diagnostic-only, exactly like the progression signal it sits beside.
 */

export interface CourseLevelPerformanceInput {
  questionId: string;
  /** The question's fixed position in the test (1-based) — NOT a score. */
  order: number;
  correctOptionId: string;
}

export interface CourseLevelAnswerInput {
  questionId: string;
  selectedOptionId: string | null | undefined;
}

export interface CourseLevelPerformanceEntry {
  label: string;
  order: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  total: number;
  /** correct / total * 100 — for display ("5 / 6 correct", "83%"). Counts
   * unanswered questions against the band, since `total` is fixed. */
  percentageOfTotal: number;
  /** correct / (correct + incorrect) * 100 — used ONLY for the qualitative
   * label and strength/weakness comparison below, never for the displayed
   * "X / Y correct" count. Unanswered questions carry no signal about
   * ability, only about coverage, so they're excluded here. Null when
   * nothing in this band was answered. */
  attemptedAccuracy: number | null;
}

export function computeCourseLevelPerformance(
  questions: readonly CourseLevelPerformanceInput[],
  answers: readonly CourseLevelAnswerInput[]
): CourseLevelPerformanceEntry[] {
  const selectedByQuestionId = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));

  return PROGRESSION_BANDS.map((band) => {
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let total = 0;

    for (const q of questions) {
      if (q.order < band.minQuestion || q.order > band.maxQuestion) continue;
      total += 1;
      const selected = selectedByQuestionId.get(q.questionId);
      if (selected == null) {
        unanswered += 1;
      } else if (selected === q.correctOptionId) {
        correct += 1;
      } else {
        incorrect += 1;
      }
    }

    const answered = correct + incorrect;
    return {
      label: band.label,
      order: band.order,
      correct,
      incorrect,
      unanswered,
      total,
      percentageOfTotal: total === 0 ? 0 : (correct / total) * 100,
      attemptedAccuracy: answered === 0 ? null : (correct / answered) * 100,
    };
  });
}

/** Qualitative label for one band — restrained, not a second placement
 * level. Null (no label) when there's no answered evidence at all. */
export type CourseLevelQualitativeLabel = "Strong" | "Developing" | "Needs improvement" | null;

export function qualitativeLabelFor(entry: CourseLevelPerformanceEntry): CourseLevelQualitativeLabel {
  if (entry.attemptedAccuracy === null) return null;
  if (entry.attemptedAccuracy >= 80) return "Strong";
  if (entry.attemptedAccuracy >= 50) return "Developing";
  return "Needs improvement";
}

// A band only qualifies for the strongest/weakest comparison once there's
// enough evidence to say something meaningful — see /docs/PHASE_2L_SCORING_POLICY.md
// ("Strength/weakness — evidence-aware rule"). Both a floor count AND a
// coverage ratio are required: 3 answered out of a 6-question Beginner
// band (50%) is meaningfully different evidence than 3 out of 14
// (Elementary/Pre-Intermediate/etc.), so a ratio alone or a count alone
// isn't enough on its own.
const MIN_ANSWERED_FOR_EVIDENCE = 3;
const MIN_ANSWERED_RATIO_FOR_EVIDENCE = 0.5;

export interface StrengthWeaknessSummary {
  strongestLabel: string | null;
  /** Never equal to strongestLabel — if only one band has sufficient
   * evidence, it's reported as the strongest and this stays null rather
   * than naming the same band as both strongest and weakest. */
  weakestLabel: string | null;
  hasSufficientEvidence: boolean;
}

export function summarizeCourseLevelStrengthWeakness(
  entries: readonly CourseLevelPerformanceEntry[]
): StrengthWeaknessSummary {
  const eligible = entries.filter((e) => {
    const answered = e.correct + e.incorrect;
    if (answered < MIN_ANSWERED_FOR_EVIDENCE) return false;
    if (e.total === 0) return false;
    return answered / e.total >= MIN_ANSWERED_RATIO_FOR_EVIDENCE;
  });

  if (eligible.length === 0) {
    return { strongestLabel: null, weakestLabel: null, hasSufficientEvidence: false };
  }

  const sorted = [...eligible].sort(
    (a, b) => (b.attemptedAccuracy ?? 0) - (a.attemptedAccuracy ?? 0)
  );
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  return {
    strongestLabel: strongest.label,
    weakestLabel: eligible.length > 1 ? weakest.label : null,
    hasSufficientEvidence: true,
  };
}
