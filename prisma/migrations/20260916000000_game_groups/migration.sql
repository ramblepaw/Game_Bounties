-- CreateTable
CREATE TABLE "GameGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameGroup_pkey" PRIMARY KEY ("id")
);

-- AlterTable
-- Purely additive: existing games start ungrouped and keep rendering in the
-- carousel exactly as before.
ALTER TABLE "Game" ADD COLUMN "groupId" TEXT;
ALTER TABLE "Game" ADD COLUMN "groupOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Game_groupId_idx" ON "Game"("groupId");

-- AddForeignKey
-- SET NULL so deleting a shelf un-files its games instead of deleting them.
ALTER TABLE "Game" ADD CONSTRAINT "Game_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "GameGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
