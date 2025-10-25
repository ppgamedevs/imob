-- CreateTable
CREATE TABLE "Developer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT,
    "logoUrl" TEXT,
    "brand" JSONB,
    "apiToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Development" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "developerId" TEXT,
    "addressRaw" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "areaSlug" TEXT,
    "deliveryAt" TIMESTAMP(3),
    "description" TEXT,
    "photos" JSONB,
    "amenities" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Development_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "typology" TEXT NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "priceEur" INTEGER NOT NULL,
    "floor" TEXT,
    "rooms" DOUBLE PRECISION,
    "orientation" TEXT,
    "parkingAvail" BOOLEAN,
    "stage" TEXT,
    "photos" JSONB,
    "sourceMeta" JSONB,
    "eurM2" DOUBLE PRECISION,
    "yieldNet" DOUBLE PRECISION,
    "ttsBucket" TEXT,
    "riskClass" TEXT,
    "explain" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevLead" (
    "id" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "unitId" TEXT,
    "name" TEXT,
    "contact" TEXT NOT NULL,
    "message" TEXT,
    "utm" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DevLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Developer_apiToken_key" ON "Developer"("apiToken");

-- CreateIndex
CREATE INDEX "Developer_apiToken_idx" ON "Developer"("apiToken");

-- CreateIndex
CREATE UNIQUE INDEX "Development_slug_key" ON "Development"("slug");

-- CreateIndex
CREATE INDEX "Development_slug_idx" ON "Development"("slug");

-- CreateIndex
CREATE INDEX "Development_developerId_idx" ON "Development"("developerId");

-- CreateIndex
CREATE INDEX "Development_areaSlug_idx" ON "Development"("areaSlug");

-- CreateIndex
CREATE INDEX "Development_deliveryAt_idx" ON "Development"("deliveryAt");

-- CreateIndex
CREATE INDEX "Unit_developmentId_idx" ON "Unit"("developmentId");

-- CreateIndex
CREATE INDEX "Unit_typology_priceEur_idx" ON "Unit"("typology", "priceEur");

-- CreateIndex
CREATE INDEX "Unit_stage_idx" ON "Unit"("stage");

-- CreateIndex
CREATE INDEX "DevLead_developmentId_createdAt_idx" ON "DevLead"("developmentId", "createdAt");

-- CreateIndex
CREATE INDEX "DevLead_unitId_idx" ON "DevLead"("unitId");

-- AddForeignKey
ALTER TABLE "Development" ADD CONSTRAINT "Development_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevLead" ADD CONSTRAINT "DevLead_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "Development"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevLead" ADD CONSTRAINT "DevLead_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
