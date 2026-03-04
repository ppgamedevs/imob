-- CreateEnum
CREATE TYPE "PoiCategory" AS ENUM ('BAR', 'RESTAURANT', 'NIGHTCLUB', 'PARK', 'SCHOOL', 'KINDERGARTEN', 'PLAYGROUND', 'SUPERMARKET', 'PHARMACY', 'GYM');

-- CreateTable
CREATE TABLE "GeoPOI" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "category" "PoiCategory" NOT NULL,
    "name" TEXT,
    "source" TEXT NOT NULL DEFAULT 'OSM',
    "osmId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoPOI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoPOI_osmId_key" ON "GeoPOI"("osmId");

-- CreateIndex
CREATE INDEX "GeoPOI_lat_lng_idx" ON "GeoPOI"("lat", "lng");

-- CreateIndex
CREATE INDEX "GeoPOI_category_idx" ON "GeoPOI"("category");
