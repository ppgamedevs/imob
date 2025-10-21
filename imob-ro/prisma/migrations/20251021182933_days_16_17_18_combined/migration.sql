/*
  Warnings:

  - Added the required column `action` to the `ReportUsage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `analysisId` to the `ReportUsage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `analysisId` to the `ShortLink` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `ShortLink` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."ReportUsage_userId_month_key";

-- AlterTable
ALTER TABLE "ReportUsage" ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "analysisId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "meta" JSONB NOT NULL DEFAULT '{}',
ALTER COLUMN "month" DROP NOT NULL,
ALTER COLUMN "count" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ShortLink" ADD COLUMN     "analysisId" TEXT NOT NULL,
ADD COLUMN     "meta" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "targetUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AlertRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "areaSlug" TEXT,
    "type" TEXT NOT NULL,
    "params" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompMatch" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "compId" TEXT,
    "sourceUrl" TEXT,
    "title" TEXT,
    "photo" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "distanceM" INTEGER,
    "priceEur" INTEGER,
    "areaM2" DOUBLE PRECISION,
    "rooms" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "eurM2" DOUBLE PRECISION,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "agencyName" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "licenseId" TEXT,
    "websiteUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingClaim" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" TEXT,

    CONSTRAINT "ListingClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filename" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "reason" TEXT,
    "analysisId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlJob" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "tries" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "analysisId" TEXT,

    CONSTRAINT "CrawlJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractorProfile" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rules" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtractorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractLog" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "profileId" TEXT,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "fields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertRule_userId_idx" ON "AlertRule"("userId");

-- CreateIndex
CREATE INDEX "AlertRule_analysisId_idx" ON "AlertRule"("analysisId");

-- CreateIndex
CREATE INDEX "AlertRule_areaSlug_idx" ON "AlertRule"("areaSlug");

-- CreateIndex
CREATE INDEX "CompMatch_analysisId_idx" ON "CompMatch"("analysisId");

-- CreateIndex
CREATE INDEX "CompMatch_eurM2_idx" ON "CompMatch"("eurM2");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_userId_key" ON "AgentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_handle_key" ON "AgentProfile"("handle");

-- CreateIndex
CREATE INDEX "AgentProfile_handle_idx" ON "AgentProfile"("handle");

-- CreateIndex
CREATE INDEX "ListingClaim_analysisId_idx" ON "ListingClaim"("analysisId");

-- CreateIndex
CREATE INDEX "ListingClaim_agentId_idx" ON "ListingClaim"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingClaim_analysisId_agentId_key" ON "ListingClaim"("analysisId", "agentId");

-- CreateIndex
CREATE INDEX "Lead_analysisId_idx" ON "Lead"("analysisId");

-- CreateIndex
CREATE INDEX "Lead_assignedTo_idx" ON "Lead"("assignedTo");

-- CreateIndex
CREATE INDEX "ImportBatch_userId_createdAt_idx" ON "ImportBatch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportItem_normalized_idx" ON "ImportItem"("normalized");

-- CreateIndex
CREATE INDEX "ImportItem_status_createdAt_idx" ON "ImportItem"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportItem_batchId_normalized_key" ON "ImportItem"("batchId", "normalized");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlJob_normalized_key" ON "CrawlJob"("normalized");

-- CreateIndex
CREATE INDEX "CrawlJob_status_scheduledAt_idx" ON "CrawlJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "CrawlJob_domain_status_idx" ON "CrawlJob"("domain", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractorProfile_domain_key" ON "ExtractorProfile"("domain");

-- CreateIndex
CREATE INDEX "ExtractorProfile_active_idx" ON "ExtractorProfile"("active");

-- CreateIndex
CREATE INDEX "ExtractLog_domain_createdAt_idx" ON "ExtractLog"("domain", "createdAt");

-- CreateIndex
CREATE INDEX "ExtractLog_profileId_createdAt_idx" ON "ExtractLog"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportUsage_analysisId_idx" ON "ReportUsage"("analysisId");

-- CreateIndex
CREATE INDEX "ReportUsage_action_idx" ON "ReportUsage"("action");

-- CreateIndex
CREATE INDEX "ReportUsage_createdAt_idx" ON "ReportUsage"("createdAt");

-- CreateIndex
CREATE INDEX "ShortLink_analysisId_idx" ON "ShortLink"("analysisId");

-- CreateIndex
CREATE INDEX "ShortLink_userId_idx" ON "ShortLink"("userId");

-- CreateIndex
CREATE INDEX "ShortLink_createdAt_idx" ON "ShortLink"("createdAt");

-- AddForeignKey
ALTER TABLE "ShortLink" ADD CONSTRAINT "ShortLink_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompMatch" ADD CONSTRAINT "CompMatch_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingClaim" ADD CONSTRAINT "ListingClaim_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingClaim" ADD CONSTRAINT "ListingClaim_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportItem" ADD CONSTRAINT "ImportItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
