import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../setup/db-reset";
import { createUser, createPublishedTestWithNQuestions } from "./fixtures";
import { db } from "@/lib/db";
import { setPublicSelfServiceTest } from "@/server/services/placement-test.service";
import {
  getEligibility,
  startPublicAttempt,
  updateSelfServeCandidateProfile,
} from "@/server/services/self-serve.service";
import { getAttemptQuestions, submitAnswer, submitAttempt } from "@/server/services/attempt.service";
import { PublicAttemptAlreadyStartingError, PublicAttemptLimitReachedError } from "@/server/errors";

const EMAIL = "quota@example.com";

async function makePublicTest(questionCount = 2) {
  const superAdmin = await createUser("SUPER_ADMIN");
  const { test } = await createPublishedTestWithNQuestions(superAdmin, questionCount);
  await setPublicSelfServiceTest(superAdmin, test.id);
  return test;
}

async function completeProfile() {
  await updateSelfServeCandidateProfile(EMAIL, {
    firstName: "Quota",
    lastName: "Tester",
    phoneNumber: "+998900000000",
    age: 22,
  });
}

/** Starts an attempt (consuming nothing yet), answers every question
 * correctly, and submits — the only thing that actually consumes a free
 * attempt (see /docs/PHASE_2J_TRY_YOURSELF.md "Free attempt rule"). */
async function completeOnePublicAttempt() {
  const { token } = await startPublicAttempt(EMAIL);
  const questions = await getAttemptQuestions(token);
  for (const q of questions) {
    await submitAnswer(token, { questionId: q.questionId, selectedOptionId: q.options[0].id });
  }
  await submitAttempt(token);
}

beforeEach(async () => {
  await resetDb();
});

describe("Phase 2J — free attempt quota", () => {
  it("0 completed attempts -> eligible for attempt 1", async () => {
    await makePublicTest();
    await completeProfile();
    const eligibility = await getEligibility(EMAIL);
    expect(eligibility).toMatchObject({ kind: "READY", attemptNumber: 1 });
  });

  it("1 completed attempt -> eligible for attempt 2", async () => {
    await makePublicTest();
    await completeProfile();
    await completeOnePublicAttempt();

    const eligibility = await getEligibility(EMAIL);
    expect(eligibility.kind).toBe("ATTEMPT_COMPLETE");

    // "Take again" creates the second attempt via the same eligibility
    // logic — it must be allowed (only 1 completed so far).
    const { token } = await startPublicAttempt(EMAIL);
    expect(token).toBeTruthy();
  });

  it("2 completed attempts -> blocked", async () => {
    await makePublicTest();
    await completeProfile();
    await completeOnePublicAttempt();
    await completeOnePublicAttempt();

    const eligibility = await getEligibility(EMAIL);
    expect(eligibility.kind).toBe("LIMIT_REACHED");
    await expect(startPublicAttempt(EMAIL)).rejects.toThrow(PublicAttemptLimitReachedError);
  });

  it("starting but not submitting does not change the quota", async () => {
    await makePublicTest();
    await completeProfile();
    await startPublicAttempt(EMAIL);

    const identity = await db.publicIdentity.findUniqueOrThrow({ where: { normalizedEmail: EMAIL } });
    const completedCount = await db.placementAssignment.count({
      where: { candidateId: identity.candidateId, origin: "SELF_SERVICE", status: "COMPLETED" },
    });
    expect(completedCount).toBe(0);

    const eligibility = await getEligibility(EMAIL);
    expect(eligibility.kind).toBe("IN_PROGRESS");
  });

  it("refreshing (repeated getEligibility calls) reports the same in-progress attempt, never a new one", async () => {
    await makePublicTest();
    await completeProfile();
    await startPublicAttempt(EMAIL);

    await getEligibility(EMAIL);
    await getEligibility(EMAIL);
    await getEligibility(EMAIL);

    const identity = await db.publicIdentity.findUniqueOrThrow({ where: { normalizedEmail: EMAIL } });
    const activeCount = await db.placementAssignment.count({
      where: { candidateId: identity.candidateId, origin: "SELF_SERVICE", status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    expect(activeCount).toBe(1);
  });

  it("double start creates only one assignment — the second call is rejected, not silently duplicated", async () => {
    await makePublicTest();
    await completeProfile();
    await startPublicAttempt(EMAIL);

    await expect(startPublicAttempt(EMAIL)).rejects.toThrow(PublicAttemptAlreadyStartingError);

    const identity = await db.publicIdentity.findUniqueOrThrow({ where: { normalizedEmail: EMAIL } });
    const activeCount = await db.placementAssignment.count({
      where: { candidateId: identity.candidateId, origin: "SELF_SERVICE", status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    expect(activeCount).toBe(1);
  });

  it("concurrent start requests create only one active assignment", async () => {
    await makePublicTest();
    await completeProfile();

    const results = await Promise.allSettled([startPublicAttempt(EMAIL), startPublicAttempt(EMAIL)]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const identity = await db.publicIdentity.findUniqueOrThrow({ where: { normalizedEmail: EMAIL } });
    const activeCount = await db.placementAssignment.count({
      where: { candidateId: identity.candidateId, origin: "SELF_SERVICE", status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    expect(activeCount).toBe(1);
  });

  it("a fresh eligibility read (simulating a new browser/session) sees the same server-side quota", async () => {
    await makePublicTest();
    await completeProfile();
    await completeOnePublicAttempt();

    // getEligibility takes only the verified email — never a cookie or
    // any other browser-local state — so a second, independent call
    // (standing in for "opened /try in another browser") necessarily
    // sees the same persisted count.
    const first = await getEligibility(EMAIL);
    const second = await getEligibility(EMAIL);
    expect(first).toEqual(second);
    expect(first.kind).toBe("ATTEMPT_COMPLETE");
  });
});
