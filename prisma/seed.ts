// Two independent, idempotent seed steps:
//
// 1. Super Admin bootstrap — the only way a User row is created outside
//    the product itself (no public registration). Gated behind
//    SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD; no-ops if that
//    account already exists.
//
// 2. An OPTIONAL, clearly-marked DEVELOPMENT-ONLY sample placement test —
//    a handful of generic questions used to exercise the backend
//    end-to-end locally. Gated behind SEED_DEV_SAMPLE_TEST=true and
//    refuses to run when NODE_ENV=production. This is NOT the real
//    70-question Macmillan "Language Hub Placement Test" — that content
//    is added separately through the (future) import pipeline, never
//    hard-coded here. See /docs/PHASE_1.md ("Seed / development data").
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEV_SAMPLE_TEST_TITLE = "[DEV SAMPLE] Vertex Placement — Development Test";

async function seedSuperAdmin(): Promise<void> {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const name = process.env.SEED_SUPER_ADMIN_NAME ?? "Super Admin";

  if (!email || !password) {
    console.log(
      "Skipping Super Admin seed: SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD not set."
    );
    return;
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: Super Admin ${email} already exists, skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.create({ data: { email, name, passwordHash, role: "SUPER_ADMIN" } });
  console.log(`Seed: created Super Admin ${email}.`);
}

// Generic, non-authentic grammar items — not sourced from or resembling
// the licensed Macmillan test. Difficulty band labels and the two
// placement bands below are illustrative only, not institutional scoring
// rules (see /docs/PRODUCT_RULES.md "Scoring & placement").
const DEV_SAMPLE_QUESTIONS: {
  prompt: string;
  difficultyBand: string;
  topic: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
}[] = [
  {
    prompt: "She ___ to school every day.",
    difficultyBand: "Beginner",
    topic: "Tenses",
    options: ["go", "goes", "going", "gone"],
    correctIndex: 1,
  },
  {
    prompt: "This is ___ apple.",
    difficultyBand: "Beginner",
    topic: "Grammar",
    options: ["a", "an", "the", "some"],
    correctIndex: 1,
  },
  {
    prompt: "There ___ three books on the table.",
    difficultyBand: "Elementary",
    topic: "Grammar",
    options: ["is", "am", "are", "be"],
    correctIndex: 2,
  },
  {
    prompt: "I ___ my homework before dinner yesterday.",
    difficultyBand: "Elementary",
    topic: "Tenses",
    options: ["finish", "finished", "finishing", "had finished"],
    correctIndex: 1,
  },
  {
    prompt: "By the time we arrived, the film ___.",
    difficultyBand: "Pre-Intermediate",
    topic: "Tenses",
    options: ["already started", "has already started", "had already started", "already starts"],
    correctIndex: 2,
  },
  {
    prompt: "You ___ smoke in the hospital — it's strictly forbidden.",
    difficultyBand: "Pre-Intermediate",
    topic: "Modals",
    options: ["mustn't", "don't have to", "shouldn't", "can't"],
    correctIndex: 0,
  },
  {
    prompt: "If I ___ more time, I would learn another language.",
    difficultyBand: "Intermediate",
    topic: "Conditionals",
    options: ["have", "had", "will have", "would have"],
    correctIndex: 1,
  },
  {
    prompt: "She's been putting off the meeting; she really needs to ___ it.",
    difficultyBand: "Intermediate",
    topic: "Phrasal Verbs",
    options: ["put up with", "get around to", "look forward to", "come up with"],
    correctIndex: 1,
  },
];

async function seedDevSampleTest(): Promise<void> {
  if (process.env.SEED_DEV_SAMPLE_TEST !== "true") {
    console.log("Skipping dev sample test seed (set SEED_DEV_SAMPLE_TEST=true to enable).");
    return;
  }
  if (process.env.NODE_ENV === "production") {
    console.log("Refusing to seed the DEVELOPMENT-ONLY sample test with NODE_ENV=production.");
    return;
  }

  const existing = await db.placementTest.findFirst({ where: { title: DEV_SAMPLE_TEST_TITLE } });
  if (existing) {
    console.log("Seed: dev sample test already exists, skipping.");
    return;
  }

  const superAdmin = await db.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (!superAdmin) {
    console.log("Seed: no Super Admin exists yet — run the Super Admin seed first, skipping.");
    return;
  }

  await db.$transaction(async (tx) => {
    const test = await tx.placementTest.create({
      data: {
        title: DEV_SAMPLE_TEST_TITLE,
        description: "Small generic question set for local development and integration testing only.",
        sourceAttribution: "DEVELOPMENT ONLY — not the licensed Macmillan source material.",
        status: "DRAFT",
        durationSeconds: 1800,
        totalQuestionCount: DEV_SAMPLE_QUESTIONS.length,
        createdByUserId: superAdmin.id,
      },
    });

    for (const [index, q] of DEV_SAMPLE_QUESTIONS.entries()) {
      await tx.question.create({
        data: {
          testId: test.id,
          order: index + 1,
          prompt: q.prompt,
          status: "PUBLISHED",
          options: {
            create: q.options.map((text, optionIndex) => ({
              text,
              isCorrect: optionIndex === q.correctIndex,
              order: optionIndex + 1,
            })),
          },
          metadata: {
            create: { difficultyBand: q.difficultyBand, topic: q.topic },
          },
        },
      });
    }

    // Illustrative bands only — arbitrary even split, not a real
    // institutional scoring policy.
    await tx.placementBand.createMany({
      data: [
        { testId: test.id, order: 1, label: "Beginner", minPercentage: 0, maxPercentage: 49.99 },
        { testId: test.id, order: 2, label: "Intermediate", minPercentage: 50, maxPercentage: 79.99 },
        { testId: test.id, order: 3, label: "Advanced", minPercentage: 80, maxPercentage: 100 },
      ],
    });

    await tx.placementTest.update({ where: { id: test.id }, data: { status: "PUBLISHED" } });
  });

  console.log(
    `Seed: created DEVELOPMENT-ONLY sample test "${DEV_SAMPLE_TEST_TITLE}" (${DEV_SAMPLE_QUESTIONS.length} questions, published).`
  );
}

async function main() {
  await seedSuperAdmin();
  await seedDevSampleTest();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
