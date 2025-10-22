-- CreateTable
CREATE TABLE "Sight" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "groupId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "title" TEXT,
    "priceEur" INTEGER,
    "areaM2" INTEGER,
    "rooms" DOUBLE PRECISION,
    "contact" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhotoAsset" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "src" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "phash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhotoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProvenanceEvent" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProvenanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustSnapshot" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "badge" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sight_analysisId_seenAt_idx" ON "Sight"("analysisId", "seenAt");

-- CreateIndex
CREATE INDEX "Sight_domain_seenAt_idx" ON "Sight"("domain", "seenAt");

-- CreateIndex
CREATE INDEX "PhotoAsset_analysisId_idx" ON "PhotoAsset"("analysisId");

-- CreateIndex
CREATE INDEX "PhotoAsset_phash_idx" ON "PhotoAsset"("phash");

-- CreateIndex
CREATE INDEX "ProvenanceEvent_analysisId_happenedAt_idx" ON "ProvenanceEvent"("analysisId", "happenedAt");

-- CreateIndex
CREATE INDEX "ProvenanceEvent_kind_happenedAt_idx" ON "ProvenanceEvent"("kind", "happenedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrustSnapshot_analysisId_key" ON "TrustSnapshot"("analysisId");

-- AddForeignKey
ALTER TABLE "Sight" ADD CONSTRAINT "Sight_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhotoAsset" ADD CONSTRAINT "PhotoAsset_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProvenanceEvent" ADD CONSTRAINT "ProvenanceEvent_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrustSnapshot" ADD CONSTRAINT "TrustSnapshot_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
