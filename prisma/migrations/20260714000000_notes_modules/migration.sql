-- CreateTable
CREATE TABLE "ChecklistNotesModule" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "bgColor" TEXT,
    "textColor" TEXT,
    "borderColor" TEXT,
    "body" TEXT,

    CONSTRAINT "ChecklistNotesModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistNotesModule_checklistId_idx" ON "ChecklistNotesModule"("checklistId");

-- AddForeignKey
ALTER TABLE "ChecklistNotesModule" ADD CONSTRAINT "ChecklistNotesModule_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry over any existing plain-text notes into a single default
-- module per checklist, so nothing written before this migration is lost.
INSERT INTO "ChecklistNotesModule" ("id", "checklistId", "order", "body")
SELECT gen_random_uuid()::text, "id", 0, "notes"
FROM "Checklist"
WHERE "notes" IS NOT NULL AND "notes" != '';

-- AlterTable
-- Notes move to ChecklistNotesModule (structured, multiple per checklist)
-- instead of a single plain-text field.
ALTER TABLE "Checklist" DROP COLUMN "notes";
