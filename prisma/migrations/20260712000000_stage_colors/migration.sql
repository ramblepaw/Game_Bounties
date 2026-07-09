-- AlterTable
ALTER TABLE "ChecklistSection" ADD COLUMN     "stages" JSONB NOT NULL DEFAULT '[]';

-- Backfill: carry existing stage names over as stages with unset colors,
-- so anything already using STAGE targets keeps its stage names.
UPDATE "ChecklistSection"
SET "stages" = (
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('name', label, 'bgColor', NULL, 'borderColor', NULL, 'textColor', NULL)),
    '[]'::jsonb
  )
  FROM unnest("stageLabels") AS label
)
WHERE array_length("stageLabels", 1) > 0;

-- AlterTable
ALTER TABLE "ChecklistSection" DROP COLUMN "stageLabels";
