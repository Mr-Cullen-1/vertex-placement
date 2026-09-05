-- AlterTable
-- Phase 2J: tracks whether a candidate has completed their own profile
-- (Admin creating an assignment for a new candidate no longer collects
-- personal details up front — the candidate provides them via the
-- invitation token). Nullable and additive only; no existing column is
-- altered or removed.
ALTER TABLE "candidates" ADD COLUMN "profileCompletedAt" TIMESTAMP(3);

-- Backfill: every candidate that already exists was necessarily created
-- with full details up front by an Admin, under the pre-Phase-2J flow —
-- so all existing rows are considered complete as of their creation.
-- New candidates created going forward (pending student-entered details)
-- get NULL here until the student submits their details.
UPDATE "candidates" SET "profileCompletedAt" = "createdAt" WHERE "profileCompletedAt" IS NULL;
