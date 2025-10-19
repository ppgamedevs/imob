-- AlterTable
ALTER TABLE "User" ADD COLUMN     "proTier" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "stripeSubscriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "AreaEvent" (
    "id" TEXT NOT NULL,
    "areaSlug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "event" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AreaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedAnalysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReportUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AreaEvent_areaSlug_idx" ON "AreaEvent"("areaSlug");

-- CreateIndex
CREATE INDEX "AreaEvent_date_idx" ON "AreaEvent"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AreaEvent_areaSlug_date_event_key" ON "AreaEvent"("areaSlug", "date", "event");

-- CreateIndex
CREATE INDEX "SavedAnalysis_userId_idx" ON "SavedAnalysis"("userId");

-- CreateIndex
CREATE INDEX "SavedAnalysis_analysisId_idx" ON "SavedAnalysis"("analysisId");

-- CreateIndex
CREATE INDEX "ReportUsage_userId_idx" ON "ReportUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportUsage_userId_month_key" ON "ReportUsage"("userId", "month");
