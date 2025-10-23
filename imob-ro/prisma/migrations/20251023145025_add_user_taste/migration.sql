-- CreateTable
CREATE TABLE "UserTaste" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "areas" JSONB,
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "rooms" JSONB,
    "types" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTaste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTaste_userId_key" ON "UserTaste"("userId");

-- CreateIndex
CREATE INDEX "UserTaste_userId_idx" ON "UserTaste"("userId");
