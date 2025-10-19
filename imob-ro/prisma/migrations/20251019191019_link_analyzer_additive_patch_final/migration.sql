-- AlterTable
ALTER TABLE "ExtractedListing" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "FeatureSnapshot" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ScoreSnapshot" ALTER COLUMN "updatedAt" DROP DEFAULT;
