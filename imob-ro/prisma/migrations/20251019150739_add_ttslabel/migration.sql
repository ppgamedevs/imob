-- CreateTable
CREATE TABLE "TtsLabel" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "censored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TtsLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TtsLabel_analysisId_key" ON "TtsLabel"("analysisId");

-- CreateIndex
CREATE INDEX "TtsLabel_analysisId_idx" ON "TtsLabel"("analysisId");

-- AddForeignKey
ALTER TABLE "TtsLabel" ADD CONSTRAINT "TtsLabel_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
