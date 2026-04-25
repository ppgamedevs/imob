-- CreateTable
CREATE TABLE "ReportLead" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'report_preview_lock',
    "consent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportLead_analysisId_email_key" ON "ReportLead"("analysisId", "email");

-- CreateIndex
CREATE INDEX "ReportLead_analysisId_idx" ON "ReportLead"("analysisId");

-- CreateIndex
CREATE INDEX "ReportLead_email_idx" ON "ReportLead"("email");

-- CreateIndex
CREATE INDEX "ReportLead_createdAt_idx" ON "ReportLead"("createdAt");

-- AddForeignKey
ALTER TABLE "ReportLead" ADD CONSTRAINT "ReportLead_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
