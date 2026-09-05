/**
 * The one email-normalization function for public self-service identity
 * (see /docs/PHASE_2J_TRY_YOURSELF.md "Email normalization"). Quota,
 * `PublicIdentity`, and verification codes are all keyed off this —
 * never a raw, unnormalized `email` string. Deliberately minimal: trim +
 * lowercase only. No dot-stripping or plus-alias collapsing — those are
 * provider-specific (Gmail-only) transformations that would treat two
 * genuinely distinct mailboxes as one identity for every other provider,
 * which the brief explicitly says not to do without a stated requirement.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
