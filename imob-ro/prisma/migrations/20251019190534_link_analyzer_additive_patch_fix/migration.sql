/*
  Warnings:

  - You are about to drop the column `riskSeismicUrl` on the `ScoreSnapshot` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ExtractedListing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FeatureSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ScoreSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "error" TEXT,
ALTER COLUMN "status" SET DEFAULT 'queued';

-- AlterTable
ALTER TABLE "AreaDaily" ADD COLUMN IF NOT EXISTS "stats" JSONB,
ALTER COLUMN "medianEurM2" DROP NOT NULL,
ALTER COLUMN "supply" DROP NOT NULL,
ALTER COLUMN "demandScore" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ExtractedListing" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "floorRaw" TEXT,
ADD COLUMN IF NOT EXISTS "sourceMeta" JSONB,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "FeatureSnapshot" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PriceHistory" ALTER COLUMN "ts" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ScoreSnapshot" DROP COLUMN IF EXISTS "riskSeismicUrl",
ADD COLUMN IF NOT EXISTS    "avmMid" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS    "condition" TEXT,
ADD COLUMN IF NOT EXISTS    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS    "explain" JSONB,
ADD COLUMN IF NOT EXISTS    "priceBadge" TEXT,
ADD COLUMN IF NOT EXISTS    "riskClass" TEXT,
ADD COLUMN IF NOT EXISTS    "riskSource" TEXT,
ADD COLUMN IF NOT EXISTS    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "avmLow" DROP NOT NULL,
ALTER COLUMN "avmHigh" DROP NOT NULL,
ALTER COLUMN "avmConf" DROP NOT NULL,
ALTER COLUMN "ttsBucket" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "agencyLogo" TEXT,
ADD COLUMN     "brandColor" TEXT;

-- CreateTable
CREATE TABLE "ApiAudit" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "ApiAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiAudit_endpoint_ts_idx" ON "ApiAudit"("endpoint", "ts");

-- CreateIndex
CREATE INDEX "ApiAudit_userId_idx" ON "ApiAudit"("userId");

-- CreateIndex (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'Analysis_canonicalUrl_idx') THEN
    CREATE INDEX "Analysis_canonicalUrl_idx" ON "Analysis"("canonicalUrl");
  END IF;
END$$;
