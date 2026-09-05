/** Small display-formatting helpers shared across admin screens. Pure
 * functions, no Prisma/Next.js dependency, safe to import from either a
 * Server or Client Component. */

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDate(value: Date | string): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatDurationSeconds(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/** Phase 2J: a candidate an Admin creates for a new assignment has no
 * personal details yet — the student provides them via the invitation
 * token (see /docs/PRODUCT_RULES.md "Candidate ownership"). Every place
 * that would otherwise render `firstName`/`lastName` (which hold empty-
 * string placeholders, never a fake name like "Unknown") must go through
 * this helper instead of interpolating them directly. */
export function candidateDisplayName(candidate: {
  firstName: string;
  lastName: string;
  profileCompletedAt: Date | string | null;
}): string {
  if (!candidate.profileCompletedAt) return "Awaiting student details";
  return `${candidate.firstName} ${candidate.lastName}`;
}
