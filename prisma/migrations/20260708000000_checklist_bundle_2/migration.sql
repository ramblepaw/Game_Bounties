-- AlterTable
ALTER TABLE "Checklist" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "sortTitle" TEXT;

-- CreateTable
CREATE TABLE "ChecklistColorPreset" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistColorPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistColorPreset_checklistId_idx" ON "ChecklistColorPreset"("checklistId");

-- AddForeignKey
ALTER TABLE "ChecklistColorPreset" ADD CONSTRAINT "ChecklistColorPreset_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
