-- CreateTable
CREATE TABLE "Analysis" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "canonicalUrl" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedListing" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT,
    "price" INTEGER,
    "currency" TEXT,
    "areaM2" INTEGER,
    "rooms" INTEGER,
    "floor" INTEGER,
    "yearBuilt" INTEGER,
    "addressRaw" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "photos" JSONB,

    CONSTRAINT "ExtractedListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureSnapshot" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "features" JSONB NOT NULL,

    CONSTRAINT "FeatureSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreSnapshot" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "avmLow" DOUBLE PRECISION NOT NULL,
    "avmHigh" DOUBLE PRECISION NOT NULL,
    "avmConf" DOUBLE PRECISION NOT NULL,
    "ttsBucket" TEXT NOT NULL,
    "yieldGross" DOUBLE PRECISION,
    "yieldNet" DOUBLE PRECISION,
    "riskSeismic" DOUBLE PRECISION,
    "conditionScore" DOUBLE PRECISION,

    CONSTRAINT "ScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaDaily" (
    "id" TEXT NOT NULL,
    "areaSlug" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "medianEurM2" DOUBLE PRECISION NOT NULL,
    "supply" INTEGER NOT NULL,
    "demandScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AreaDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Analysis_sourceUrl_idx" ON "Analysis"("sourceUrl");

-- CreateIndex
CREATE INDEX "Analysis_userId_idx" ON "Analysis"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractedListing_analysisId_key" ON "ExtractedListing"("analysisId");

-- CreateIndex
CREATE INDEX "ExtractedListing_lat_lng_idx" ON "ExtractedListing"("lat", "lng");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSnapshot_analysisId_key" ON "FeatureSnapshot"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreSnapshot_analysisId_key" ON "ScoreSnapshot"("analysisId");

-- CreateIndex
CREATE INDEX "PriceHistory_sourceUrl_idx" ON "PriceHistory"("sourceUrl");

-- CreateIndex
CREATE INDEX "PriceHistory_sourceUrl_ts_idx" ON "PriceHistory"("sourceUrl", "ts");

-- CreateIndex
CREATE INDEX "AreaDaily_areaSlug_idx" ON "AreaDaily"("areaSlug");

-- CreateIndex
CREATE INDEX "AreaDaily_date_idx" ON "AreaDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AreaDaily_areaSlug_date_key" ON "AreaDaily"("areaSlug", "date");

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedListing" ADD CONSTRAINT "ExtractedListing_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureSnapshot" ADD CONSTRAINT "FeatureSnapshot_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreSnapshot" ADD CONSTRAINT "ScoreSnapshot_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
