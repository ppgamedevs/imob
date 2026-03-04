-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('METRO', 'TRAM', 'BUS', 'TROLLEY');

-- CreateTable
CREATE TABLE "GeoTransportStop" (
    "id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "stopId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'GTFS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeoTransportStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeoTransportStop_stopId_key" ON "GeoTransportStop"("stopId");

-- CreateIndex
CREATE INDEX "GeoTransportStop_lat_lng_idx" ON "GeoTransportStop"("lat", "lng");

-- CreateIndex
CREATE INDEX "GeoTransportStop_mode_idx" ON "GeoTransportStop"("mode");
