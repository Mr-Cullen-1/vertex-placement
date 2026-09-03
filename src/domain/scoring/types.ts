/**
 * Scoring domain — kept independent of presentation and of persistence.
 * Implementation lands in a later phase; these types fix the contract so
 * routes/services can be built against it now. See /docs/DATABASE.md
 * ("Scoring & placement") for the rationale behind each separation.
 */

export interface QuestionOutcome {
  questionId: string;
  isCorrect: boolean;
  difficultyBand: string | null;
  topic: string | null;
}

/** Raw score is never mixed with the level mapping — that mapping is
 * configurable per-test business logic, not a fixed formula. */
export interface RawScoreResult {
  rawScore: number;
  totalQuestions: number;
  percentage: number;
}

export interface DifficultyProgressionEntry {
  band: string;
  correct: number;
  total: number;
}

export interface TopicPerformanceEntry {
  topic: string;
  correct: number;
  total: number;
  percentage: number;
}

/** A configured PlacementBand row matched against a percentage. Absent
 * when the test has no configured bands yet — never inferred. */
export interface PlacementBandMatch {
  placementBandId: string;
  label: string;
}

export interface ScoringOutput {
  rawScore: RawScoreResult;
  difficultyProgression: DifficultyProgressionEntry[];
  topicPerformance: TopicPerformanceEntry[];
  placementBand: PlacementBandMatch | null;
}
