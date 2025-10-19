-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "userId" TEXT,
    "sold" BOOLEAN NOT NULL,
    "price" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_analysisId_idx" ON "Feedback"("analysisId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");
