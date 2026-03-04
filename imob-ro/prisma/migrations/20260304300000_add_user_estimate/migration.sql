-- CreateTable
CREATE TABLE "UserEstimate" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inputs" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "confidence" INTEGER NOT NULL,
    "fairMin" INTEGER NOT NULL,
    "fairMax" INTEGER NOT NULL,
    "fairLikely" INTEGER NOT NULL,
    "compsCount" INTEGER NOT NULL,
    "dispersion" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "UserEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserEstimate_createdAt_idx" ON "UserEstimate"("createdAt");

-- CreateIndex
CREATE INDEX "UserEstimate_lat_lng_idx" ON "UserEstimate"("lat", "lng");
