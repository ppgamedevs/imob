-- AlterTable
ALTER TABLE "DedupGroup" ADD COLUMN     "itemCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GroupSnapshot" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT,
    "priceEur" INTEGER,
    "areaM2" INTEGER,
    "rooms" DOUBLE PRECISION,
    "floorRaw" TEXT,
    "yearBuilt" INTEGER,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "photo" TEXT,
    "domains" JSONB NOT NULL,
    "priceMin" INTEGER,
    "priceMax" INTEGER,
    "sources" INTEGER,
    "explain" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupSnapshot_groupId_createdAt_idx" ON "GroupSnapshot"("groupId", "createdAt");

-- AddForeignKey
ALTER TABLE "GroupSnapshot" ADD CONSTRAINT "GroupSnapshot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DedupGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
