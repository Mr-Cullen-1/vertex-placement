import { z } from "zod";
import { db } from "@/lib/db";
import type { Actor } from "@/server/rbac";
import { assertPermission } from "@/server/rbac";
import { TestNotFoundError, InvalidTestStateError } from "@/server/errors";

/**
 * PlacementBand rows are the ONLY place a raw-score percentage becomes a
 * level label. Nothing here (or anywhere else) hard-codes CEFR cutoffs —
 * see /docs/PRODUCT_RULES.md ("Scoring & placement"). Super Admin only.
 */

const bandFieldsSchema = z.object({
  order: z.number().int().min(0),
  label: z.string().trim().min(1).max(100),
  minPercentage: z.number().min(0).max(100),
  maxPercentage: z.number().min(0).max(100),
  description: z.string().trim().max(1000).optional().nullable(),
});

const createBandSchema = bandFieldsSchema.refine(
  (band) => band.minPercentage <= band.maxPercentage,
  { message: "minPercentage must be <= maxPercentage", path: ["minPercentage"] }
);
export type CreateBandInput = z.infer<typeof createBandSchema>;

export async function createPlacementBand(actor: Actor, testId: string, input: CreateBandInput) {
  assertPermission(actor, "band:write");
  const data = createBandSchema.parse(input);
  const test = await db.placementTest.findUnique({ where: { id: testId } });
  if (!test) throw new TestNotFoundError();
  if (test.status === "ARCHIVED") {
    throw new InvalidTestStateError("Cannot modify scoring bands on an archived test.");
  }
  return db.placementBand.create({ data: { ...data, testId } });
}

export async function listPlacementBands(actor: Actor, testId: string) {
  assertPermission(actor, "test:read");
  return db.placementBand.findMany({ where: { testId }, orderBy: { order: "asc" } });
}

const updateBandSchema = bandFieldsSchema.partial();
export type UpdateBandInput = z.infer<typeof updateBandSchema>;

export async function updatePlacementBand(actor: Actor, bandId: string, input: UpdateBandInput) {
  assertPermission(actor, "band:write");
  const data = updateBandSchema.parse(input);
  if (
    data.minPercentage !== undefined &&
    data.maxPercentage !== undefined &&
    data.minPercentage > data.maxPercentage
  ) {
    throw new InvalidTestStateError("minPercentage must be <= maxPercentage");
  }
  await requireEditableBandOwner(bandId);
  return db.placementBand.update({ where: { id: bandId }, data });
}

export async function deletePlacementBand(actor: Actor, bandId: string) {
  assertPermission(actor, "band:write");
  await requireEditableBandOwner(bandId);
  await db.placementBand.delete({ where: { id: bandId } });
}

/** Bands may be tuned even after a test is PUBLISHED — institutional
 * scoring rules can evolve without unpublishing (see
 * /docs/PRODUCT_RULES.md "Scoring & placement"). ARCHIVED is the one
 * state that locks them, matching createPlacementBand above. */
async function requireEditableBandOwner(bandId: string): Promise<void> {
  const band = await db.placementBand.findUnique({
    where: { id: bandId },
    include: { test: true },
  });
  if (!band) throw new TestNotFoundError();
  if (band.test.status === "ARCHIVED") {
    throw new InvalidTestStateError("Cannot modify scoring bands on an archived test.");
  }
}
