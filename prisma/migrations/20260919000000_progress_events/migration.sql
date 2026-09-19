-- CreateTable
CREATE TABLE "ChecklistItemProgressEvent" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "unitsAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistItemProgressEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistItemProgressEvent_itemId_idx" ON "ChecklistItemProgressEvent"("itemId");
CREATE INDEX "ChecklistItemProgressEvent_userId_createdAt_idx" ON "ChecklistItemProgressEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChecklistItemProgressEvent" ADD CONSTRAINT "ChecklistItemProgressEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChecklistItemProgressEvent" ADD CONSTRAINT "ChecklistItemProgressEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: without this the stats panel would forget every completion that
-- happened before the log existed, and the cumulative totals it derives would
-- disagree with the progress bar.
--
-- A completed item is recorded on the day it was completed, carrying its full
-- weight (1 for a checkbox, the target for a counter, the module's stage count
-- for a stage). Partial progress has no history to recover -- only the current
-- value was ever stored -- so it lands as a single entry dated when it was last
-- touched. That keeps the running totals honest even though the shape of how it
-- accumulated is genuinely unknowable.
INSERT INTO "ChecklistItemProgressEvent" ("id", "itemId", "userId", "delta", "unitsAfter", "createdAt")
SELECT
    gen_random_uuid()::text,
    p."itemId",
    p."userId",
    units.value,
    units.value,
    COALESCE(p."completedAt", p."updatedAt")
FROM "ChecklistItemProgress" p
JOIN "ChecklistItem" i ON i.id = p."itemId"
JOIN "ChecklistSection" s ON s.id = i."sectionId"
CROSS JOIN LATERAL (
    SELECT CASE
        WHEN i."kind" = 'TITLE' THEN 0
        WHEN i."kind" = 'COUNTER' THEN LEAST(p."currentCount", GREATEST(1, COALESCE(i."targetCount", 1)))
        WHEN i."kind" = 'STAGE' THEN LEAST(p."currentCount", GREATEST(1, jsonb_array_length(s."stages")))
        WHEN p."isComplete" THEN 1
        ELSE 0
    END AS value
) AS units
WHERE units.value > 0;
