import { describe, expect, it } from "vitest";
import { generateVerificationCode, hashVerificationCode } from "@/domain/self-serve/code";
import { normalizeEmail } from "@/domain/self-serve/email";

describe("generateVerificationCode", () => {
  it("produces a 6-digit code distinct from its hash", () => {
    const { plaintext, hash } = generateVerificationCode();
    expect(plaintext).toMatch(/^\d{6}$/);
    expect(hash).not.toBe(plaintext);
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
  });

  it("hashing the same plaintext is deterministic", () => {
    const { plaintext, hash } = generateVerificationCode();
    expect(hashVerificationCode(plaintext)).toBe(hash);
  });

  it("pads codes with leading zeros to always be 6 digits", () => {
    // Not deterministic by construction, but run enough times that a
    // leading-zero code is virtually certain to appear at least once,
    // proving padStart is actually applied rather than assumed.
    const codes = Array.from({ length: 200 }, () => generateVerificationCode().plaintext);
    expect(codes.every((c) => c.length === 6)).toBe(true);
  });
});

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeEmail("  Jacob@Example.COM  ")).toBe("jacob@example.com");
  });

  it("does not strip dots or plus-aliases", () => {
    expect(normalizeEmail("Jacob.Cullen+test@Example.com")).toBe("jacob.cullen+test@example.com");
  });
});
