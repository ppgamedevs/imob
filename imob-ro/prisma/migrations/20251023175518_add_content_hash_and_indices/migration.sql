-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "Analysis_createdAt_idx" ON "Analysis"("createdAt");

-- CreateIndex
CREATE INDEX "Analysis_contentHash_idx" ON "Analysis"("contentHash");

-- CreateIndex
CREATE INDEX "ExtractedListing_analysisId_idx" ON "ExtractedListing"("analysisId");
