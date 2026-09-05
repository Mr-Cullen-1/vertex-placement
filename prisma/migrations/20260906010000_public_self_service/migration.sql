-- Phase 2J — Public self-service ("Try Yourself"). Additive only: new
-- columns default to values that preserve existing rows' meaning
-- exactly (isPublicSelfService=false, origin=ADMIN), two existing
-- createdByUserId columns are relaxed from NOT NULL to nullable (no
-- existing row is affected — every historical row already has a value),
-- and three new tables are created. See /docs/PHASE_2J_TRY_YOURSELF.md.

-- AlterTable: PlacementTest — explicit public-test designation.
ALTER TABLE "placement_tests" ADD COLUMN "isPublicSelfService" BOOLEAN NOT NULL DEFAULT false;

-- Enforce "at most one public test" at the database level — the
-- ultimate backstop against a concurrent double-toggle, not just the
-- application-level check-then-set in placement-test.service.ts.
CREATE UNIQUE INDEX "placement_tests_one_public_self_service_key"
  ON "placement_tests" ("isPublicSelfService")
  WHERE "isPublicSelfService" = true;

-- CreateEnum
CREATE TYPE "AssignmentOrigin" AS ENUM ('ADMIN', 'SELF_SERVICE');

-- AlterTable: PlacementAssignment — origin + relaxed createdByUserId.
ALTER TABLE "placement_assignments" ADD COLUMN "origin" "AssignmentOrigin" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "placement_assignments" ALTER COLUMN "createdByUserId" DROP NOT NULL;

-- Enforce "at most one active (PENDING/IN_PROGRESS) self-service
-- assignment per candidate" at the database level — see
-- self-serve.service.ts "Concurrency". A concurrent double-click/double
-- request can only ever create one; the loser's insert fails this
-- constraint and the caller resumes the winner's row instead.
CREATE UNIQUE INDEX "placement_assignments_one_active_self_service_key"
  ON "placement_assignments" ("candidateId")
  WHERE "origin" = 'SELF_SERVICE' AND "status" IN ('PENDING', 'IN_PROGRESS');

-- AlterTable: PlacementInvitation — relaxed createdByUserId (a
-- SELF_SERVICE invitation has no admin actor to attribute it to).
ALTER TABLE "placement_invitations" ALTER COLUMN "createdByUserId" DROP NOT NULL;

-- CreateTable: PublicIdentity — the 1:1 verified-email -> Candidate map.
CREATE TABLE "public_identities" (
    "id" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_identities_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "public_identities_normalizedEmail_key" ON "public_identities" ("normalizedEmail");
CREATE UNIQUE INDEX "public_identities_candidateId_key" ON "public_identities" ("candidateId");
ALTER TABLE "public_identities" ADD CONSTRAINT "public_identities_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: PublicVerificationCode — one-time email verification codes.
CREATE TABLE "public_verification_codes" (
    "id" TEXT NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "public_verification_codes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "public_verification_codes_normalizedEmail_createdAt_idx"
  ON "public_verification_codes" ("normalizedEmail", "createdAt");

-- CreateTable: RateLimitEvent — generic sliding-window abuse ledger.
CREATE TABLE "rate_limit_events" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rate_limit_events_bucket_createdAt_idx" ON "rate_limit_events" ("bucket", "createdAt");
