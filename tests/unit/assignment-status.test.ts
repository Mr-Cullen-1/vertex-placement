import { describe, expect, it } from "vitest";
import {
  deriveAssignmentDisplayStatus,
  displayStatusForAssignment,
} from "@/domain/placement/assignment-status";

describe("deriveAssignmentDisplayStatus", () => {
  it("PENDING with no invitation ever issued stays Pending", () => {
    expect(
      deriveAssignmentDisplayStatus({ status: "PENDING", hasAnyInvitation: false, hasActiveInvitation: false })
    ).toBe("PENDING");
  });

  it("PENDING with an active invitation stays Pending (invited, not started)", () => {
    expect(
      deriveAssignmentDisplayStatus({ status: "PENDING", hasAnyInvitation: true, hasActiveInvitation: true })
    ).toBe("PENDING");
  });

  it("PENDING with only revoked invitations (no active one) becomes Revoked", () => {
    expect(
      deriveAssignmentDisplayStatus({ status: "PENDING", hasAnyInvitation: true, hasActiveInvitation: false })
    ).toBe("REVOKED");
  });

  it("IN_PROGRESS, COMPLETED, EXPIRED, CANCELLED all pass through unchanged", () => {
    for (const status of ["IN_PROGRESS", "COMPLETED", "EXPIRED", "CANCELLED"] as const) {
      expect(deriveAssignmentDisplayStatus({ status, hasAnyInvitation: true, hasActiveInvitation: false })).toBe(
        status
      );
      expect(deriveAssignmentDisplayStatus({ status, hasAnyInvitation: true, hasActiveInvitation: true })).toBe(
        status
      );
    }
  });

  it("never invents REVOKED for a status other than PENDING", () => {
    // Even though this combination (no active invitation) looks similar
    // to the PENDING/revoked case, COMPLETED must never be relabeled.
    expect(
      deriveAssignmentDisplayStatus({ status: "COMPLETED", hasAnyInvitation: true, hasActiveInvitation: false })
    ).toBe("COMPLETED");
  });
});

describe("displayStatusForAssignment (Prisma-shaped convenience wrapper)", () => {
  it("derives Revoked from an invitations array with only REVOKED rows", () => {
    const result = displayStatusForAssignment({
      status: "PENDING",
      invitations: [{ status: "REVOKED" }, { status: "REVOKED" }],
    });
    expect(result).toBe("REVOKED");
  });

  it("derives Pending when the most recent invitation is ACTIVE", () => {
    const result = displayStatusForAssignment({
      status: "PENDING",
      invitations: [{ status: "ACTIVE" }, { status: "REVOKED" }],
    });
    expect(result).toBe("PENDING");
  });

  it("derives Pending when there are no invitations at all", () => {
    const result = displayStatusForAssignment({ status: "PENDING", invitations: [] });
    expect(result).toBe("PENDING");
  });
});
