-- DropIndex
DROP INDEX "public"."CrawlJob_status_scheduledAt_idx";

-- AlterTable
ALTER TABLE "CrawlJob" ADD COLUMN     "doneAt" TIMESTAMP(3),
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'detail',
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ListingSource" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "minDelayMs" INTEGER NOT NULL DEFAULT 2000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchLog" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "statusCode" INTEGER,
    "etag" TEXT,
    "lastMod" TEXT,
    "bytes" INTEGER,
    "error" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FetchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UrlCache" (
    "url" TEXT NOT NULL,
    "etag" TEXT,
    "lastMod" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UrlCache_pkey" PRIMARY KEY ("url")
);

-- CreateIndex
CREATE UNIQUE INDEX "ListingSource_domain_key" ON "ListingSource"("domain");

-- CreateIndex
CREATE INDEX "FetchLog_domain_fetchedAt_idx" ON "FetchLog"("domain", "fetchedAt");

-- CreateIndex
CREATE INDEX "FetchLog_url_idx" ON "FetchLog"("url");

-- CreateIndex
CREATE INDEX "CrawlJob_status_priority_scheduledAt_idx" ON "CrawlJob"("status", "priority", "scheduledAt");
