-- CreateTable
CREATE TABLE "ModelMetrics" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelName" TEXT NOT NULL,
    "mdape" DOUBLE PRECISION NOT NULL,
    "piCoverage" DOUBLE PRECISION NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModelMetrics_modelName_ts_idx" ON "ModelMetrics"("modelName", "ts");
