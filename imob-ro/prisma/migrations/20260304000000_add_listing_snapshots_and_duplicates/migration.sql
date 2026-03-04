-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'REMOVED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DupReason" AS ENUM ('TEXT_HASH', 'IMAGES_HASH', 'ADDRESS_NEAR');

-- CreateTable
CREATE TABLE "ListingSnapshot" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "priceEur" INTEGER,
    "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "textHash" TEXT NOT NULL,
    "imagesHash" TEXT,
    "source" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingDuplicate" (
    "id" TEXT NOT NULL,
    "listingIdA" TEXT NOT NULL,
    "listingIdB" TEXT NOT NULL,
    "reason" "DupReason" NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingDuplicate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingSnapshot_listingId_capturedAt_idx" ON "ListingSnapshot"("listingId", "capturedAt");

-- CreateIndex
CREATE INDEX "ListingSnapshot_textHash_idx" ON "ListingSnapshot"("textHash");

-- CreateIndex
CREATE INDEX "ListingSnapshot_imagesHash_idx" ON "ListingSnapshot"("imagesHash");

-- CreateIndex
CREATE INDEX "ListingDuplicate_listingIdA_idx" ON "ListingDuplicate"("listingIdA");

-- CreateIndex
CREATE INDEX "ListingDuplicate_listingIdB_idx" ON "ListingDuplicate"("listingIdB");

-- CreateIndex
CREATE INDEX "ListingDuplicate_reason_idx" ON "ListingDuplicate"("reason");

-- CreateIndex
CREATE UNIQUE INDEX "ListingDuplicate_listingIdA_listingIdB_key" ON "ListingDuplicate"("listingIdA", "listingIdB");

-- AddForeignKey
ALTER TABLE "ListingSnapshot" ADD CONSTRAINT "ListingSnapshot_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDuplicate" ADD CONSTRAINT "ListingDuplicate_listingIdA_fkey" FOREIGN KEY ("listingIdA") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingDuplicate" ADD CONSTRAINT "ListingDuplicate_listingIdB_fkey" FOREIGN KEY ("listingIdB") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
