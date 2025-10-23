-- CreateTable
CREATE TABLE "OwnerLead" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT NOT NULL DEFAULT 'București',
    "areaSlug" TEXT,
    "addressHint" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rooms" DOUBLE PRECISION,
    "areaM2" DOUBLE PRECISION,
    "yearBuilt" INTEGER,
    "conditionScore" DOUBLE PRECISION,
    "notes" TEXT,
    "avmLow" INTEGER,
    "avmMid" INTEGER,
    "avmHigh" INTEGER,
    "ttsBucket" TEXT,
    "estRent" INTEGER,
    "yieldNet" DOUBLE PRECISION,
    "priceSuggested" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerLeadEvent" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "meta" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerLeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OwnerLead_status_createdAt_idx" ON "OwnerLead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerLead_city_areaSlug_idx" ON "OwnerLead"("city", "areaSlug");

-- CreateIndex
CREATE INDEX "OwnerLeadEvent_leadId_ts_idx" ON "OwnerLeadEvent"("leadId", "ts");

-- AddForeignKey
ALTER TABLE "OwnerLeadEvent" ADD CONSTRAINT "OwnerLeadEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "OwnerLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
