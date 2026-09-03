/**
 * Server-authoritative attempt timing. `expiresAt` is computed exactly
 * once, from the server clock and the test's configured duration — never
 * from a client-supplied value. See /docs/ARCHITECTURE.md ("Attempt
 * lifecycle").
 */
export function computeAttemptExpiry(startedAt: Date, durationSeconds: number): Date {
  return new Date(startedAt.getTime() + durationSeconds * 1000);
}

export function isPastDeadline(now: Date, expiresAt: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}
