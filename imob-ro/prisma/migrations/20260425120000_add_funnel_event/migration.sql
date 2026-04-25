-- CreateTable
CREATE TABLE "FunnelEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "analysisId" TEXT,
    "userId" TEXT,
    "anonymousId" TEXT,
    "sourceUrl" TEXT,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunnelEvent_eventName_createdAt_idx" ON "FunnelEvent"("eventName", "createdAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_createdAt_idx" ON "FunnelEvent"("createdAt");

-- CreateIndex
CREATE INDEX "FunnelEvent_analysisId_idx" ON "FunnelEvent"("analysisId");

-- AddForeignKey
ALTER TABLE "FunnelEvent" ADD CONSTRAINT "FunnelEvent_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
