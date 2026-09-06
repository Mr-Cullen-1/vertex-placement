-- CreateEnum
CREATE TYPE "PlacementBandScoringMode" AS ENUM ('PERCENTAGE', 'RAW_SCORE');

-- DropForeignKey
ALTER TABLE "placement_assignments" DROP CONSTRAINT "placement_assignments_createdByUserId_fkey";

-- DropForeignKey
ALTER TABLE "placement_invitations" DROP CONSTRAINT "placement_invitations_createdByUserId_fkey";

-- AlterTable
ALTER TABLE "placement_bands" ADD COLUMN     "maxRawScore" INTEGER,
ADD COLUMN     "minRawScore" INTEGER,
ADD COLUMN     "scoringMode" "PlacementBandScoringMode" NOT NULL DEFAULT 'PERCENTAGE',
ALTER COLUMN "minPercentage" DROP NOT NULL,
ALTER COLUMN "maxPercentage" DROP NOT NULL;

-- AlterTable
ALTER TABLE "placement_results" ADD COLUMN     "finalPlacementLabel" TEXT,
ADD COLUMN     "finalPlacementSetAt" TIMESTAMP(3),
ADD COLUMN     "finalPlacementSetByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "placement_assignments" ADD CONSTRAINT "placement_assignments_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_invitations" ADD CONSTRAINT "placement_invitations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placement_results" ADD CONSTRAINT "placement_results_finalPlacementSetByUserId_fkey" FOREIGN KEY ("finalPlacementSetByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
