-- CreateTable
CREATE TABLE "ReportFeedback" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "reportUnlockId" TEXT,
    "userId" TEXT,
    "rating" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportFeedback_analysisId_key" ON "ReportFeedback"("analysisId");

-- CreateIndex
CREATE INDEX "ReportFeedback_createdAt_idx" ON "ReportFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "ReportFeedback_reportUnlockId_idx" ON "ReportFeedback"("reportUnlockId");

-- CreateIndex
CREATE INDEX "ReportFeedback_rating_idx" ON "ReportFeedback"("rating");

-- AddForeignKey
ALTER TABLE "ReportFeedback" ADD CONSTRAINT "ReportFeedback_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFeedback" ADD CONSTRAINT "ReportFeedback_reportUnlockId_fkey" FOREIGN KEY ("reportUnlockId") REFERENCES "ReportUnlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFeedback" ADD CONSTRAINT "ReportFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
