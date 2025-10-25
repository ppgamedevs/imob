-- CreateTable
CREATE TABLE "SavedFilterSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "urlQuery" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedFilterSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerDraft" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "addressNote" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "shareToken" TEXT NOT NULL,
    "roiToggles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OwnerDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedFilterSet_userId_createdAt_idx" ON "SavedFilterSet"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerDraft_analysisId_key" ON "OwnerDraft"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "OwnerDraft_shareToken_key" ON "OwnerDraft"("shareToken");

-- CreateIndex
CREATE INDEX "OwnerDraft_analysisId_idx" ON "OwnerDraft"("analysisId");

-- CreateIndex
CREATE INDEX "OwnerDraft_shareToken_idx" ON "OwnerDraft"("shareToken");

-- CreateIndex
CREATE INDEX "OwnerDraft_status_createdAt_idx" ON "OwnerDraft"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "OwnerDraft" ADD CONSTRAINT "OwnerDraft_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
