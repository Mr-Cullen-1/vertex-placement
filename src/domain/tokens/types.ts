/**
 * Invitation/token lifecycle — see /docs/DATABASE.md ("Assignment,
 * invitation, attempt") for why this is separate from PlacementTest and
 * PlacementAssignment.
 */

export type TokenValidationFailureReason =
  | "NOT_FOUND"
  // Only reachable if a future feature sets PlacementInvitation.expiresAt.
  // MVP invitations have a null expiresAt and never expire on a timer —
  // they become invalid only via ALREADY_USED or REVOKED.
  | "EXPIRED"
  | "REVOKED"
  | "ALREADY_USED";

export type TokenValidationResult =
  | { valid: true; invitationId: string; assignmentId: string }
  | { valid: false; reason: TokenValidationFailureReason };

/** Regenerating an invitation revokes the previous one and issues a new
 * token against the SAME assignment. It never touches the test or
 * assignment records. */
export interface RegenerateInvitationInput {
  assignmentId: string;
  regeneratedFromInvitationId: string;
  requestedByUserId: string;
}
