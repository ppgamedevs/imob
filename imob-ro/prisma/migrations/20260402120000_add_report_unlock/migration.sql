-- CreateTable
CREATE TABLE "ReportUnlock" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportUnlock_stripeSessionId_key" ON "ReportUnlock"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportUnlock_stripePaymentIntentId_key" ON "ReportUnlock"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "ReportUnlock_analysisId_status_idx" ON "ReportUnlock"("analysisId", "status");

-- CreateIndex
CREATE INDEX "ReportUnlock_userId_idx" ON "ReportUnlock"("userId");

-- CreateIndex
CREATE INDEX "ReportUnlock_email_idx" ON "ReportUnlock"("email");

-- AddForeignKey
ALTER TABLE "ReportUnlock" ADD CONSTRAINT "ReportUnlock_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportUnlock" ADD CONSTRAINT "ReportUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
