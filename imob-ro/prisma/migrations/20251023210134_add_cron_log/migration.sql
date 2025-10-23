-- CreateTable
CREATE TABLE "CronLog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "error" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CronLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronLog_name_startedAt_idx" ON "CronLog"("name", "startedAt");

-- CreateIndex
CREATE INDEX "CronLog_status_startedAt_idx" ON "CronLog"("status", "startedAt");

-- CreateIndex
CREATE INDEX "CronLog_startedAt_idx" ON "CronLog"("startedAt");
