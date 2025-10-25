-- CreateTable
CREATE TABLE "AgentUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "orgId" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioShare" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "visibleIds" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkAnalysisJob" (
    "id" TEXT NOT NULL,
    "agentEmail" TEXT NOT NULL,
    "orgId" TEXT,
    "total" INTEGER NOT NULL DEFAULT 0,
    "queued" INTEGER NOT NULL DEFAULT 0,
    "running" INTEGER NOT NULL DEFAULT 0,
    "done" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkAnalysisItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "analysisId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkAnalysisItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentUser_email_key" ON "AgentUser"("email");

-- CreateIndex
CREATE INDEX "AgentUser_email_idx" ON "AgentUser"("email");

-- CreateIndex
CREATE INDEX "AgentUser_orgId_idx" ON "AgentUser"("orgId");

-- CreateIndex
CREATE INDEX "AgentUser_lastSeenAt_idx" ON "AgentUser"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Org_createdAt_idx" ON "Org"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MagicToken_token_key" ON "MagicToken"("token");

-- CreateIndex
CREATE INDEX "MagicToken_token_idx" ON "MagicToken"("token");

-- CreateIndex
CREATE INDEX "MagicToken_email_expiresAt_idx" ON "MagicToken"("email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioShare_slug_key" ON "PortfolioShare"("slug");

-- CreateIndex
CREATE INDEX "PortfolioShare_orgId_createdAt_idx" ON "PortfolioShare"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "PortfolioShare_slug_idx" ON "PortfolioShare"("slug");

-- CreateIndex
CREATE INDEX "BulkAnalysisJob_agentEmail_createdAt_idx" ON "BulkAnalysisJob"("agentEmail", "createdAt");

-- CreateIndex
CREATE INDEX "BulkAnalysisJob_status_createdAt_idx" ON "BulkAnalysisJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BulkAnalysisItem_jobId_status_idx" ON "BulkAnalysisItem"("jobId", "status");

-- CreateIndex
CREATE INDEX "BulkAnalysisItem_analysisId_idx" ON "BulkAnalysisItem"("analysisId");

-- AddForeignKey
ALTER TABLE "AgentUser" ADD CONSTRAINT "AgentUser_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioShare" ADD CONSTRAINT "PortfolioShare_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkAnalysisItem" ADD CONSTRAINT "BulkAnalysisItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "BulkAnalysisJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
