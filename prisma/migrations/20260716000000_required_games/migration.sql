-- CreateTable
CREATE TABLE "ChecklistRequiredGame" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChecklistRequiredGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistRequiredGame_checklistId_idx" ON "ChecklistRequiredGame"("checklistId");

-- AddForeignKey
ALTER TABLE "ChecklistRequiredGame" ADD CONSTRAINT "ChecklistRequiredGame_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "Checklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
