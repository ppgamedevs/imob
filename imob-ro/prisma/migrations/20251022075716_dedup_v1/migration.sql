-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "groupId" TEXT;

-- CreateTable
CREATE TABLE "DedupGroup" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "city" TEXT,
    "areaSlug" TEXT,
    "centroidLat" DOUBLE PRECISION,
    "centroidLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DedupGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DedupEdge" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DedupEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DedupGroup_signature_key" ON "DedupGroup"("signature");

-- CreateIndex
CREATE INDEX "DedupGroup_city_areaSlug_idx" ON "DedupGroup"("city", "areaSlug");

-- CreateIndex
CREATE INDEX "DedupEdge_groupId_idx" ON "DedupEdge"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "DedupEdge_groupId_analysisId_key" ON "DedupEdge"("groupId", "analysisId");

-- CreateIndex
CREATE INDEX "Analysis_groupId_idx" ON "Analysis"("groupId");

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DedupGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DedupEdge" ADD CONSTRAINT "DedupEdge_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DedupGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
