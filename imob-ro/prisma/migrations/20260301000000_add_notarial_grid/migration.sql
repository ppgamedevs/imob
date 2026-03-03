-- CreateTable
CREATE TABLE "NotarialGrid" (
    "id" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "zoneCode" TEXT,
    "city" TEXT NOT NULL DEFAULT 'București',
    "sector" INTEGER,
    "neighborhood" TEXT,
    "propertyType" TEXT NOT NULL DEFAULT 'apartment',
    "minEurPerM2" DOUBLE PRECISION NOT NULL,
    "maxEurPerM2" DOUBLE PRECISION,
    "year" INTEGER NOT NULL,
    "source" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotarialGrid_pkey" PRIMARY KEY ("id")
);

-- Add notarial fields to ScoreSnapshot
ALTER TABLE "ScoreSnapshot" ADD COLUMN "notarialEurM2" DOUBLE PRECISION;
ALTER TABLE "ScoreSnapshot" ADD COLUMN "notarialTotal" DOUBLE PRECISION;
ALTER TABLE "ScoreSnapshot" ADD COLUMN "notarialYear" INTEGER;
ALTER TABLE "ScoreSnapshot" ADD COLUMN "notarialZone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "NotarialGrid_zone_propertyType_year_key" ON "NotarialGrid"("zone", "propertyType", "year");
CREATE INDEX "NotarialGrid_city_sector_propertyType_year_idx" ON "NotarialGrid"("city", "sector", "propertyType", "year");
CREATE INDEX "NotarialGrid_neighborhood_propertyType_year_idx" ON "NotarialGrid"("neighborhood", "propertyType", "year");
