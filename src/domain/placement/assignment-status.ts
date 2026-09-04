/**
 * Assignment *display* status — derived, never persisted. The raw
 * `AssignmentStatus` enum (PENDING/IN_PROGRESS/COMPLETED/EXPIRED/
 * CANCELLED) has no "REVOKED" value and none is added here (see
 * /docs/PHASE_2F.md "Assignment status") — an assignment whose only
 * invitation(s) were all revoked without ever starting an attempt is
 * still, at the database level, PENDING; this function is the one place
 * that turns "PENDING + no usable invitation" into a clearer label for
 * the UI, without inventing new persisted state that could drift out of
 * sync with the real Invitation/Attempt rows.
 */

export type RawAssignmentStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "CANCELLED";
export type AssignmentDisplayStatus = RawAssignmentStatus | "REVOKED";

export interface AssignmentStatusInput {
  status: RawAssignmentStatus;
  hasActiveInvitation: boolean;
  hasAnyInvitation: boolean;
}

export function deriveAssignmentDisplayStatus(input: AssignmentStatusInput): AssignmentDisplayStatus {
  if (input.status === "PENDING" && input.hasAnyInvitation && !input.hasActiveInvitation) {
    return "REVOKED";
  }
  return input.status;
}

/** Convenience wrapper for the common shape every admin page already has
 * on hand (an assignment with its `invitations` relation included) —
 * the pure function above stays testable with primitive booleans. */
export function displayStatusForAssignment(assignment: {
  status: RawAssignmentStatus;
  invitations: { status: string }[];
}): AssignmentDisplayStatus {
  return deriveAssignmentDisplayStatus({
    status: assignment.status,
    hasAnyInvitation: assignment.invitations.length > 0,
    hasActiveInvitation: assignment.invitations.some((i) => i.status === "ACTIVE"),
  });
}
