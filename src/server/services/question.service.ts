import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { InvalidTestStateError, QuestionNotFoundError, TestNotFoundError } from "@/server/errors";

/**
 * Question/Option/QuestionMetadata management — Super Admin only (Admin
 * cannot create/edit test content, see /docs/PRODUCT_RULES.md).
 *
 * Question.order is the fixed, meaningful, progressively-difficult
 * sequence from the source material — this service never reorders
 * questions on its own and nothing here randomizes it. Only *option*
 * display order is ever randomized, and only per-attempt (see
 * src/domain/attempts/option-order.ts) — never at the content level.
 */

const optionInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  isCorrect: z.boolean(),
  order: z.number().int().min(1),
});

const metadataInputSchema = z
  .object({
    difficultyBand: z.string().trim().max(100).optional().nullable(),
    topic: z.string().trim().max(100).optional().nullable(),
    tags: z.array(z.string().trim().max(50)).max(20).optional(),
    sourceRef: z.string().trim().max(200).optional().nullable(),
  })
  .optional();

const createQuestionSchema = z.object({
  order: z.number().int().min(1),
  prompt: z.string().trim().min(1).max(2000),
  options: z.array(optionInputSchema).min(2).max(10),
  metadata: metadataInputSchema,
});
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

export async function createQuestion(actor: Actor, testId: string, input: CreateQuestionInput) {
  assertPermission(actor, "question:write");
  const data = createQuestionSchema.parse(input);
  assertExactlyOneCorrectOption(data.options);

  const test = await db.placementTest.findUnique({ where: { id: testId } });
  if (!test) throw new TestNotFoundError();
  if (test.status !== "DRAFT") {
    throw new InvalidTestStateError("Questions can only be added while the test is DRAFT.");
  }

  return db.question.create({
    data: {
      testId,
      order: data.order,
      prompt: data.prompt,
      options: {
        create: data.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect, order: o.order })),
      },
      metadata: data.metadata
        ? {
            create: {
              difficultyBand: data.metadata.difficultyBand ?? null,
              topic: data.metadata.topic ?? null,
              tags: data.metadata.tags ?? [],
              sourceRef: data.metadata.sourceRef ?? null,
            },
          }
        : undefined,
    },
    include: { options: true, metadata: true },
  });
}

const updateQuestionSchema = z.object({
  prompt: z.string().trim().min(1).max(2000).optional(),
  options: z.array(optionInputSchema).min(2).max(10).optional(),
  metadata: metadataInputSchema,
});
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;

export async function updateQuestion(
  actor: Actor,
  questionId: string,
  input: UpdateQuestionInput
) {
  assertPermission(actor, "question:write");
  const data = updateQuestionSchema.parse(input);
  if (data.options) assertExactlyOneCorrectOption(data.options);

  const question = await db.question.findUnique({
    where: { id: questionId },
    include: { test: true },
  });
  if (!question) throw new QuestionNotFoundError();
  if (question.test.status !== "DRAFT") {
    throw new InvalidTestStateError("Questions can only be edited while the test is DRAFT.");
  }

  return db.$transaction(async (tx) => {
    if (data.options) {
      await tx.option.deleteMany({ where: { questionId } });
      await tx.option.createMany({
        data: data.options.map((o) => ({
          questionId,
          text: o.text,
          isCorrect: o.isCorrect,
          order: o.order,
        })),
      });
    }
    if (data.metadata !== undefined) {
      await tx.questionMetadata.upsert({
        where: { questionId },
        create: {
          questionId,
          difficultyBand: data.metadata?.difficultyBand ?? null,
          topic: data.metadata?.topic ?? null,
          tags: data.metadata?.tags ?? [],
          sourceRef: data.metadata?.sourceRef ?? null,
        },
        update: {
          difficultyBand: data.metadata?.difficultyBand ?? null,
          topic: data.metadata?.topic ?? null,
          tags: data.metadata?.tags ?? [],
          sourceRef: data.metadata?.sourceRef ?? null,
        },
      });
    }
    return tx.question.update({
      where: { id: questionId },
      data: data.prompt !== undefined ? { prompt: data.prompt } : {},
      include: { options: true, metadata: true },
    });
  });
}

export async function publishQuestion(actor: Actor, questionId: string) {
  assertPermission(actor, "question:write");
  const question = await db.question.findUnique({
    where: { id: questionId },
    include: { options: true },
  });
  if (!question) throw new QuestionNotFoundError();
  assertExactlyOneCorrectOption(question.options);
  return db.question.update({ where: { id: questionId }, data: { status: "PUBLISHED" } });
}

export async function listQuestionsForTest(actor: Actor, testId: string) {
  assertPermission(actor, "test:read");
  return db.question.findMany({
    where: { testId },
    orderBy: { order: "asc" },
    include: { options: { orderBy: { order: "asc" } }, metadata: true },
  });
}

function assertExactlyOneCorrectOption(options: readonly { isCorrect: boolean }[]) {
  const correctCount = options.filter((o) => o.isCorrect).length;
  if (correctCount !== 1) {
    throw new InvalidTestStateError(
      `Each question must have exactly one correct option (found ${correctCount}).`
    );
  }
}
