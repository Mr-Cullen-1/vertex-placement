import { describe, expect, it } from "vitest";
import {
  generateInvitationToken,
  hashInvitationToken,
  validateInvitation,
} from "@/domain/tokens/token";

describe("generateInvitationToken", () => {
  it("produces a high-entropy, URL-safe plaintext distinct from its hash", () => {
    const { plaintext, hash } = generateInvitationToken();
    expect(plaintext).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(hash).not.toBe(plaintext);
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it("never repeats across calls", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateInvitationToken().plaintext));
    expect(tokens.size).toBe(50);
  });

  it("hashing the same plaintext is deterministic", () => {
    const { plaintext, hash } = generateInvitationToken();
    expect(hashInvitationToken(plaintext)).toBe(hash);
  });
});

describe("validateInvitation", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("rejects a token that doesn't resolve to any invitation", () => {
    expect(validateInvitation(null, now)).toEqual({ valid: false, reason: "NOT_FOUND" });
  });

  it("rejects a revoked invitation", () => {
    const result = validateInvitation(
      { id: "i1", assignmentId: "a1", status: "REVOKED", expiresAt: null },
      now
    );
    expect(result).toEqual({ valid: false, reason: "REVOKED" });
  });

  it("rejects an already-used invitation", () => {
    const result = validateInvitation(
      { id: "i1", assignmentId: "a1", status: "USED", expiresAt: null },
      now
    );
    expect(result).toEqual({ valid: false, reason: "ALREADY_USED" });
  });

  it("accepts an ACTIVE invitation with no expiresAt (MVP default)", () => {
    const result = validateInvitation(
      { id: "i1", assignmentId: "a1", status: "ACTIVE", expiresAt: null },
      now
    );
    expect(result).toEqual({ valid: true, invitationId: "i1", assignmentId: "a1" });
  });

  it("rejects an ACTIVE invitation whose (reserved) expiresAt has passed", () => {
    const result = validateInvitation(
      {
        id: "i1",
        assignmentId: "a1",
        status: "ACTIVE",
        expiresAt: new Date("2025-01-01T00:00:00Z"),
      },
      now
    );
    expect(result).toEqual({ valid: false, reason: "EXPIRED" });
  });

  it("accepts an ACTIVE invitation whose (reserved) expiresAt is in the future", () => {
    const result = validateInvitation(
      {
        id: "i1",
        assignmentId: "a1",
        status: "ACTIVE",
        expiresAt: new Date("2027-01-01T00:00:00Z"),
      },
      now
    );
    expect(result.valid).toBe(true);
  });
});
