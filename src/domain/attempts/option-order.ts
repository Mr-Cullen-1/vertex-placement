import { randomInt } from "node:crypto";

/**
 * Per-attempt option display order. Pure logic — the caller
 * (attempt.service.ts) is responsible for persisting the result on
 * `PlacementAttempt.optionOrder` exactly once, at attempt start, so
 * refreshing/resuming never reshuffles. Stable option IDs are the only
 * source of truth here; nothing in this module or its callers ever
 * derives correctness from display position (A/B/C/D) — see
 * `Option.isCorrect` in the schema.
 */
export type Rng = (maxExclusive: number) => number; // returns an integer in [0, maxExclusive)

/** Cryptographically secure Fisher-Yates shuffle. A custom `rng` can be
 * injected for deterministic tests; production code should always use the
 * default. */
export function shuffle<T>(items: readonly T[], rng: Rng = cryptoRandomInt): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function cryptoRandomInt(maxExclusive: number): number {
  return randomInt(maxExclusive);
}

/** Builds the { [questionId]: optionId[] } map stored on
 * `PlacementAttempt.optionOrder`, one randomized order per question. */
export function buildOptionOrder(
  questions: readonly { id: string; optionIds: readonly string[] }[],
  rng: Rng = cryptoRandomInt
): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const question of questions) {
    order[question.id] = shuffle(question.optionIds, rng);
  }
  return order;
}
