ALTER TYPE "ItemKind" ADD VALUE 'TITLE';

ALTER TABLE "ChecklistItem" DROP COLUMN "groupLabel";
ALTER TABLE "ChecklistItem" DROP COLUMN "groupLabelColor";
ALTER TABLE "ChecklistItem" DROP COLUMN "groupLabelTextSize";
ALTER TABLE "ChecklistItem" DROP COLUMN "groupLabelFontFamily";
