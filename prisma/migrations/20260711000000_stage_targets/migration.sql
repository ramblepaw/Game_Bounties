-- AlterEnum
ALTER TYPE "ItemKind" ADD VALUE 'STAGE';

-- AlterTable
ALTER TABLE "ChecklistSection" ADD COLUMN     "stageLabels" TEXT[] DEFAULT ARRAY[]::TEXT[];
