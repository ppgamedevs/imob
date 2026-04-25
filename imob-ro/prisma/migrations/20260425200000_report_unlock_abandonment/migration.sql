-- AlterTable
ALTER TABLE "ReportUnlock" ADD COLUMN "abandonmentReminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ReportUnlock_status_createdAt_idx" ON "ReportUnlock"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReportUnlock_status_abandonmentReminderSentAt_idx" ON "ReportUnlock"("status", "abandonmentReminderSentAt");
