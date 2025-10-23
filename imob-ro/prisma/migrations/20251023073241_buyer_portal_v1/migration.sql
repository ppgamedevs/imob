-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "queryJson" JSONB NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "WatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompareSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupIds" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,

    CONSTRAINT "CompareSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "meta" JSONB,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedSearch_userId_updatedAt_idx" ON "SavedSearch"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "WatchItem_userId_createdAt_idx" ON "WatchItem"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WatchItem_userId_groupId_key" ON "WatchItem"("userId", "groupId");

-- CreateIndex
CREATE INDEX "CompareSet_userId_createdAt_idx" ON "CompareSet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BuyerEvent_userId_ts_idx" ON "BuyerEvent"("userId", "ts");
