import { describe, expect, it } from "vitest";
import { encodeSessionToken, decodeSessionToken } from "@/domain/self-serve/session-token";

const SECRET = "unit-test-secret-value-not-used-for-anything-real";

describe("self-serve session token", () => {
  it("round-trips a valid, unexpired token", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const token = encodeSessionToken(SECRET, { email: "a@b.com", exp: now + 1000 });
    expect(decodeSessionToken(SECRET, token, now)).toEqual({ email: "a@b.com", exp: now + 1000 });
  });

  it("rejects a token past its expiry", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const token = encodeSessionToken(SECRET, { email: "a@b.com", exp: now - 1 });
    expect(decodeSessionToken(SECRET, token, now)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const token = encodeSessionToken(SECRET, { email: "a@b.com", exp: now + 1000 });
    const [json, signature] = token.split(".");
    const tamperedJson = Buffer.from(JSON.stringify({ email: "attacker@evil.com", exp: now + 1000 })).toString(
      "base64url"
    );
    expect(decodeSessionToken(SECRET, `${tamperedJson}.${signature}`, now)).toBeNull();
    void json;
  });

  it("rejects a token signed with a different secret", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const token = encodeSessionToken("a-completely-different-secret-value", {
      email: "a@b.com",
      exp: now + 1000,
    });
    expect(decodeSessionToken(SECRET, token, now)).toBeNull();
  });

  it("rejects garbage input without throwing", () => {
    expect(decodeSessionToken(SECRET, "not-a-real-token")).toBeNull();
    expect(decodeSessionToken(SECRET, "")).toBeNull();
    expect(decodeSessionToken(SECRET, "a.b.c")).toBeNull();
  });
});
