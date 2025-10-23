-- CreateIndex
CREATE INDEX "WatchItem_groupId_idx" ON "WatchItem"("groupId");

-- AddForeignKey
ALTER TABLE "WatchItem" ADD CONSTRAINT "WatchItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DedupGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
