-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('CHECKBOX', 'COUNTER');

-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "currentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kind" "ItemKind" NOT NULL DEFAULT 'CHECKBOX',
ADD COLUMN     "targetCount" INTEGER;

