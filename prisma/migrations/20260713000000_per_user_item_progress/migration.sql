-- CreateTable
CREATE TABLE "ChecklistItemProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItemProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItemProgress_itemId_idx" ON "ChecklistItemProgress"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistItemProgress_userId_itemId_key" ON "ChecklistItemProgress"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "ChecklistItemProgress" ADD CONSTRAINT "ChecklistItemProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItemProgress" ADD CONSTRAINT "ChecklistItemProgress_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Progress moves to ChecklistItemProgress (per user) instead of living
-- directly on the shared item -- no backfill, since this state was never
-- correctly per-user to begin with.
ALTER TABLE "ChecklistItem" DROP COLUMN "isComplete";
ALTER TABLE "ChecklistItem" DROP COLUMN "completedAt";
ALTER TABLE "ChecklistItem" DROP COLUMN "currentCount";
