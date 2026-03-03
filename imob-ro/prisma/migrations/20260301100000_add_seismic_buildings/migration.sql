-- CreateTable
CREATE TABLE "SeismicBuilding" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "addressRaw" TEXT NOT NULL,
    "addressNorm" TEXT NOT NULL,
    "streetName" TEXT,
    "streetNumber" TEXT,
    "bloc" TEXT,
    "scara" TEXT,
    "sector" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "riskClass" TEXT NOT NULL,
    "yearBuilt" INTEGER,
    "floors" INTEGER,
    "apartments" INTEGER,
    "intervention" TEXT,
    "source" TEXT NOT NULL DEFAULT 'AMCCRS',
    "sourceUrl" TEXT,
    "lastUpdated" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeismicBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeismicBuilding_addressNorm_riskClass_key" ON "SeismicBuilding"("addressNorm", "riskClass");
CREATE INDEX "SeismicBuilding_lat_lng_idx" ON "SeismicBuilding"("lat", "lng");
CREATE INDEX "SeismicBuilding_streetName_idx" ON "SeismicBuilding"("streetName");
CREATE INDEX "SeismicBuilding_sector_riskClass_idx" ON "SeismicBuilding"("sector", "riskClass");
CREATE INDEX "SeismicBuilding_riskClass_idx" ON "SeismicBuilding"("riskClass");
CREATE INDEX "SeismicBuilding_addressNorm_idx" ON "SeismicBuilding"("addressNorm");
