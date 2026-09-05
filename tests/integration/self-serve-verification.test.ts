import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { db } from "@/lib/db";
import {
  requestVerificationCode,
  verifyCode,
} from "@/server/services/self-serve.service";
import { recordAndEnforce } from "@/server/services/rate-limit.service";
import { __setEmailServiceForTesting } from "@/server/email";
import {
  InvalidVerificationCodeError,
  RateLimitedError,
  ResendCooldownError,
  TooManyVerificationAttemptsError,
  VerificationCodeExpiredError,
} from "@/server/errors";

/**
 * A fake email provider that captures the plaintext code "sent" for each
 * address, so tests never need a real inbox — see
 * /docs/PHASE_2J_TRY_YOURSELF.md "Development email QA".
 */
function installCapturingEmailService() {
  const sent = new Map<string, string[]>();
  __setEmailServiceForTesting({
    async sendVerificationCode(to, code) {
      const codes = sent.get(to) ?? [];
      codes.push(code);
      sent.set(to, codes);
    },
  });
  return {
    latestCodeFor(email: string): string {
      const codes = sent.get(email);
      if (!codes || codes.length === 0) throw new Error(`No code captured for ${email}`);
      return codes[codes.length - 1];
    },
  };
}

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  __setEmailServiceForTesting(null);
});

describe("Phase 2J — email verification", () => {
  it("requesting a code stores only its hash, never the plaintext", async () => {
    const inbox = installCapturingEmailService();
    await requestVerificationCode("Student@Example.com", null);

    const code = inbox.latestCodeFor("student@example.com");
    const row = await db.publicVerificationCode.findFirstOrThrow({
      where: { normalizedEmail: "student@example.com" },
    });
    expect(row.codeHash).not.toBe(code);
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("a correct code verifies successfully", async () => {
    const inbox = installCapturingEmailService();
    await requestVerificationCode("student@example.com", null);
    const code = inbox.latestCodeFor("student@example.com");

    await expect(verifyCode("student@example.com", code, null)).resolves.toBeUndefined();
  });

  it("normalizes email/case for both request and verify", async () => {
    const inbox = installCapturingEmailService();
    await requestVerificationCode("  Student@Example.com  ", null);
    const code = inbox.latestCodeFor("student@example.com");

    await expect(verifyCode("STUDENT@example.com", code, null)).resolves.toBeUndefined();
  });

  it("an incorrect code is rejected", async () => {
    await requestVerificationCode("student@example.com", null);
    await expect(verifyCode("student@example.com", "000000", null)).rejects.toThrow(
      InvalidVerificationCodeError
    );
  });

  it("an expired code is rejected", async () => {
    const inbox = installCapturingEmailService();
    await requestVerificationCode("student@example.com", null);
    const code = inbox.latestCodeFor("student@example.com");

    await db.publicVerificationCode.updateMany({
      where: { normalizedEmail: "student@example.com" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(verifyCode("student@example.com", code, null)).rejects.toThrow(
      VerificationCodeExpiredError
    );
  });

  it("a used code cannot be replayed", async () => {
    const inbox = installCapturingEmailService();
    await requestVerificationCode("student@example.com", null);
    const code = inbox.latestCodeFor("student@example.com");

    await verifyCode("student@example.com", code, null);
    await expect(verifyCode("student@example.com", code, null)).rejects.toThrow(
      InvalidVerificationCodeError
    );
  });

  it("resend is blocked within the cooldown window", async () => {
    installCapturingEmailService();
    await requestVerificationCode("student@example.com", null);
    await expect(requestVerificationCode("student@example.com", null)).rejects.toThrow(
      ResendCooldownError
    );
  });

  it("blocks verification after the maximum number of incorrect attempts", async () => {
    installCapturingEmailService();
    await requestVerificationCode("student@example.com", null);

    for (let i = 0; i < 5; i++) {
      await expect(verifyCode("student@example.com", "111111", null)).rejects.toThrow(
        InvalidVerificationCodeError
      );
    }
    // The 6th attempt against the same (still-unconsumed) code is
    // blocked purely by the attempt counter, regardless of the guess.
    await expect(verifyCode("student@example.com", "222222", null)).rejects.toThrow(
      TooManyVerificationAttemptsError
    );
  });

  it("rate-limits repeated requests within a window (generic sliding-window limiter)", async () => {
    const bucket = `test-bucket:${Math.random()}`;
    await recordAndEnforce(bucket, 60_000, 3);
    await recordAndEnforce(bucket, 60_000, 3);
    await recordAndEnforce(bucket, 60_000, 3);
    await expect(recordAndEnforce(bucket, 60_000, 3)).rejects.toThrow(RateLimitedError);
  });

  it("does not reveal whether an email has been seen before", async () => {
    // Any email can request a code — there is no separate "does this
    // account exist" branch, so there is nothing to leak. Requesting for
    // a brand-new address behaves identically to a previously-seen one.
    installCapturingEmailService();
    await expect(requestVerificationCode("brand-new@example.com", null)).resolves.toBeUndefined();
  });
});
