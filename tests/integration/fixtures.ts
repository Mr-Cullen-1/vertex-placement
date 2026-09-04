import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { createPlacementTest } from "@/server/services/placement-test.service";
import { createQuestion, publishQuestion } from "@/server/services/question.service";
import { createPlacementBand } from "@/server/services/placement-band.service";
import { publishPlacementTest } from "@/server/services/placement-test.service";
import { createAssignment } from "@/server/services/assignment.service";
import { generateInvitation } from "@/server/services/invitation.service";

export async function createUser(role: "ADMIN" | "SUPER_ADMIN") {
  const user = await db.user.create({
    data: {
      email: `${role.toLowerCase()}-${Math.random().toString(36).slice(2)}@test.local`,
      name: `Test ${role}`,
      passwordHash: await bcrypt.hash("irrelevant-for-tests", 4),
      role,
    },
  });
  return { userId: user.id, role: user.role } satisfies Actor;
}

/** Builds and publishes a small (4-question) test with two placement
 * bands, ready to be assigned. Mirrors the shape of the seed's
 * DEVELOPMENT-ONLY sample test but scoped to one test run. */
export async function createPublishedTestWithQuestions(superAdmin: Actor) {
  const test = await createPlacementTest(superAdmin, {
    title: "Integration Test Fixture",
    durationSeconds: 1800,
    totalQuestionCount: 4,
  });

  const questionSpecs = [
    { prompt: "Q1", difficultyBand: "Beginner", topic: "Grammar" },
    { prompt: "Q2", difficultyBand: "Beginner", topic: "Grammar" },
    { prompt: "Q3", difficultyBand: "Elementary", topic: "Vocabulary" },
    { prompt: "Q4", difficultyBand: "Elementary", topic: "Vocabulary" },
  ];

  const questions = [];
  for (const [index, spec] of questionSpecs.entries()) {
    const question = await createQuestion(superAdmin, test.id, {
      order: index + 1,
      prompt: spec.prompt,
      options: [
        { text: "A", isCorrect: true, order: 1 },
        { text: "B", isCorrect: false, order: 2 },
        { text: "C", isCorrect: false, order: 3 },
        { text: "D", isCorrect: false, order: 4 },
      ],
      metadata: { difficultyBand: spec.difficultyBand, topic: spec.topic },
    });
    await publishQuestion(superAdmin, question.id);
    questions.push(question);
  }

  await createPlacementBand(superAdmin, test.id, {
    order: 1,
    label: "Beginner",
    minPercentage: 0,
    maxPercentage: 49.99,
  });
  await createPlacementBand(superAdmin, test.id, {
    order: 2,
    label: "Advanced",
    minPercentage: 50,
    maxPercentage: 100,
  });

  const published = await publishPlacementTest(superAdmin, test.id);
  return { test: published, questions };
}

/** Builds and publishes a test with exactly `count` sequential questions
 * (order 1..count), each with 4 options and option[0] ("A") correct —
 * no difficulty/topic metadata, no bands. For Phase 2E progression tests
 * that need specific question *orders* (e.g. "the highest correctly
 * answered question is 18") rather than the small 4-question shape
 * `createPublishedTestWithQuestions` provides. */
export async function createPublishedTestWithNQuestions(superAdmin: Actor, count: number) {
  const test = await createPlacementTest(superAdmin, {
    title: `Progression Fixture (${count}q)`,
    durationSeconds: 1800,
    totalQuestionCount: count,
  });

  const questions = [];
  for (let order = 1; order <= count; order++) {
    const question = await createQuestion(superAdmin, test.id, {
      order,
      prompt: `Q${order}`,
      options: [
        { text: "A", isCorrect: true, order: 1 },
        { text: "B", isCorrect: false, order: 2 },
        { text: "C", isCorrect: false, order: 3 },
        { text: "D", isCorrect: false, order: 4 },
      ],
    });
    await publishQuestion(superAdmin, question.id);
    questions.push(question);
  }

  const published = await publishPlacementTest(superAdmin, test.id);
  return { test: published, questions };
}

/** Creates a candidate + assignment against `testId`, then issues an
 * invitation for it. Returns the plaintext token a student would use. */
export async function createAssignmentWithInvitation(actor: Actor, testId: string) {
  const assignment = await createAssignment(actor, {
    testId,
    candidate: {
      firstName: "Test",
      lastName: "Candidate",
      phoneNumber: "+998900000000",
      age: 20,
    },
  });
  const invitation = await generateInvitation(actor, assignment.id);
  return { assignment, invitation };
}
