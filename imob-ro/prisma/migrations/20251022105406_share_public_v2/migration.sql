-- AlterTable
ALTER TABLE "ShortLink" ADD COLUMN     "enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "options" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "ShareEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referrer" TEXT,
    "ua" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareDaily" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniques" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShareDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareEvent_slug_ts_idx" ON "ShareEvent"("slug", "ts");

-- CreateIndex
CREATE INDEX "ShareEvent_analysisId_ts_idx" ON "ShareEvent"("analysisId", "ts");

-- CreateIndex
CREATE INDEX "ShareDaily_slug_date_idx" ON "ShareDaily"("slug", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ShareDaily_slug_date_key" ON "ShareDaily"("slug", "date");

-- CreateIndex
CREATE INDEX "ShortLink_enabled_idx" ON "ShortLink"("enabled");
